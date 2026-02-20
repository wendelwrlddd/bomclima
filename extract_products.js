const fs = require('fs');
const readline = require('readline');
const path = require('path');

const SQL_FILE = 'database.sql';
const OUTPUT_FILE = 'products_data.json';

const products = {}; // Map of post_id to product data
const attachments = {}; // Map of post_id to attachment data (filename)
const postmeta = {}; // Map of post_id to key-value meta data
const terms = {}; // Map of term_id to term name
const termTaxonomy = {}; // Map of term_taxonomy_id to { term_id, taxonomy }
const termRelationships = {}; // Map of object_id (post_id) to Array of term_taxonomy_id
const lookupData = {}; // Map of product_id to { sku, stock, stockStatus, price }

async function extract() {
    console.log('--- Iniciando extração total (ROBUSTA) de dados do SQL ---');
    
    if (!fs.existsSync(SQL_FILE)) {
        console.error(`Erro: Arquivo ${SQL_FILE} não encontrado.`);
        return;
    }

    const fileStream = fs.createReadStream(SQL_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    // Patterns
    const tableRegex = /INSERT INTO `([^`]+)`/;

    for await (const line of rl) {
        if (!line.startsWith('INSERT INTO')) continue;

        const tableMatch = line.match(tableRegex);
        if (!tableMatch) continue;

        const tableName = tableMatch[1];
        
        // Find the start of VALUES (...)
        const valuesStart = line.indexOf('VALUES (') + 7;
        if (valuesStart < 7) continue;

        const valuesString = line.slice(valuesStart, -2); // Remove last ");"
        const rows = splitSqlRows(valuesString);

        rows.forEach(row => {
            const values = parseSqlRow(row);

            if (tableName.endsWith('posts')) {
                // Find post_type dynamically since index might vary
                const postTypeIndex = values.findIndex(v => v === 'product' || v === 'attachment');
                if (postTypeIndex === -1) return;

                const id = values[0];
                const date = values[2];
                const content = values[4];
                const title = values[5];
                const type = values[postTypeIndex];

                if (type === 'product') {
                    const status = values[7] ? values[7].trim().replace(/^'|'$/g, '') : 'publish';
                    products[id] = {
                        id: parseInt(id),
                        name: title,
                        date: date,
                        status: status,
                        description: content || '',
                        sku: '',
                        stock: null,
                        stockStatus: 'instock',
                        categories: [],
                        tags: [],
                        brand: '',
                        price: '0,00',
                        imageName: '',
                        gtin: ''
                    };
                } else if (type === 'attachment') {
                    // guid is usually index 18
                    const guid = values.find(v => typeof v === 'string' && v.startsWith('http') && v.includes('/uploads/'));
                    if (guid) attachments[id] = path.basename(guid.split('?')[0]);
                }
            } else if (tableName.endsWith('postmeta')) {
                const postId = values[1];
                const key = values[2];
                const value = values[3];
                if (!postmeta[postId]) postmeta[postId] = {};
                postmeta[postId][key] = value;
            } else if (tableName.endsWith('terms')) {
                terms[values[0]] = values[1];
            } else if (tableName.endsWith('term_taxonomy')) {
                termTaxonomy[values[0]] = { termId: values[1], taxonomy: values[2] };
            } else if (tableName.endsWith('term_relationships')) {
                if (!termRelationships[values[0]]) termRelationships[values[0]] = [];
                termRelationships[values[0]].push(values[1]);
            } else if (tableName.endsWith('wc_product_meta_lookup')) {
                // column 0: product_id, 1: sku, 7: stock_quantity, 8: stock_status, 4: min_price, 14: gtin/id
                const pid = values[0];
                lookupData[pid] = {
                    sku: values[1],
                    stock: values[7] !== null ? parseFloat(values[7]) : null,
                    stockStatus: values[8],
                    price: values[4],
                    gtin: values[14] || ''
                };
            }
        });
    }

    // Merge and finalize
    const finalProducts = Object.values(products).map(p => {
        const meta = postmeta[p.id] || {};
        const lookup = lookupData[p.id] || {};
        const thumbnailId = meta['_thumbnail_id'];
        
        // Taxonomies
        const rels = termRelationships[p.id] || [];
        const cats = [];
        const tags = [];
        let brand = '';

        rels.forEach(ttId => {
            const tx = termTaxonomy[ttId];
            if (tx) {
                const termName = terms[tx.termId];
                if (tx.taxonomy === 'product_cat') cats.push(termName);
                else if (tx.taxonomy === 'product_tag') tags.push(termName);
                else if (tx.taxonomy === 'pwb-brand' || tx.taxonomy === 'product_brand' || (termName && termName.toLowerCase().includes('marca'))) {
                    brand = termName;
                }
            }
        });

        // Image path - Resolve from thumbnail metadata
        let imageName = '';
        if (thumbnailId && postmeta[thumbnailId]) {
            imageName = postmeta[thumbnailId]['_wp_attached_file'] || '';
        }
        
        // Fallback: Check if the product itself has the attached file meta
        if (!imageName) {
            imageName = meta['_wp_attached_file'] || '';
        }

        // Price formatting - Clean currency format
        const formatBRL = (val) => {
            if (!val || isNaN(val) || parseFloat(val) === 0) return '0,00';
            return parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Price extraction: Regular vs Sale
        let rawRegPrice = meta['_regular_price'] || lookup.price || meta['_price'] || '0';
        let rawSalePrice = meta['_sale_price'] || '0';
        
        // If there's no sale price explicitly, but active price is different from regular, use it
        if ((!rawSalePrice || rawSalePrice === '0') && meta['_price'] && meta['_price'] !== rawRegPrice) {
            rawSalePrice = meta['_price'];
        }

        const finalPrice = 'R$ ' + formatBRL(rawRegPrice);
        const hasSale = rawSalePrice && rawSalePrice !== '0' && parseFloat(rawSalePrice) > 0;
        const finalPromo = 'R$ ' + (hasSale ? formatBRL(rawSalePrice) : formatBRL(rawRegPrice));

        let stock = lookup.stock !== undefined ? lookup.stock : (meta['_stock'] !== undefined ? parseInt(meta['_stock']) : null);
        let stockStatus = lookup.stockStatus || meta['_stock_status'] || 'instock';

        // Fix null stock for outofstock products
        if (stock === null && stockStatus === 'outofstock') {
            stock = 0;
        }

        return {
            ...p,
            sku: lookup.sku || meta['_sku'] || '',
            stock: stock,
            stockStatus: stockStatus,
            price: finalPrice,
            promoPrice: finalPromo,
            imageName: imageName,
            categories: cats,
            tags: tags,
            brand: brand || (cats.length > 0 ? cats[0] : 'Bomclima'),
            gtin: lookup.gtin || meta['_gtin'] || meta['_barcode'] || ''
        };
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalProducts, null, 2));
    console.log(`--- Sucesso! ${finalProducts.length} produtos extraídos para ${OUTPUT_FILE} ---`);
}

function splitSqlRows(str) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;
    let parenthesisLevel = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            current += char;
            continue;
        }
        if (char === "'" || char === '"') {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                // Check if it's an escaped quote like ''
                if (str[i+1] === quoteChar) {
                    current += char + str[i+1];
                    i++;
                    continue;
                }
                inQuotes = false;
                quoteChar = '';
            }
        }
        if (!inQuotes) {
            if (char === '(') parenthesisLevel++;
            if (char === ')') parenthesisLevel--;
            if (char === ',' && parenthesisLevel === 0) {
                rows.push(current.trim());
                current = '';
                continue;
            }
        }
        current += char;
    }
    if (current) rows.push(current.trim());
    return rows.map(r => r.replace(/^\(|\)$/g, ''));
}

function parseSqlRow(row) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            continue;
        }
        if (char === "'" || char === '"') {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                if (row[i+1] === quoteChar) {
                    current += char;
                    i++;
                    continue;
                }
                inQuotes = false;
                quoteChar = '';
            }
            continue;
        }
        if (char === ',' && !inQuotes) {
            values.push(cleanValue(current));
            current = '';
            continue;
        }
        current += char;
    }
    values.push(cleanValue(current));
    return values;
}

function cleanValue(val) {
    val = val.trim();
    if (val === 'NULL') return null;
    return val;
}

extract();


