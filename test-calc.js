const fs = require('fs');
const products = JSON.parse(fs.readFileSync('products_data.json', 'utf8'));

const parsePrice = (val) => {
    if (!val) return 0;
    let str = val.toString().trim();
    if (str.includes(',')) {
        str = str.replace(/[^\d,]/g, '').replace(',', '.');
    } else {
        str = str.replace(/[^\d.]/g, '');
    }
    return parseFloat(str) || 0;
};

let totalWithPromo = 0;
let totalOnlyPrice = 0;
let totalAllIncludingBackorder = 0;

products.forEach(p => {
    const qty = parseInt(p.stock) || 0;
    const stockStatus = (p.stockStatus || '').toLowerCase();
    const publishStatus = (p.status || 'publish').toLowerCase();

    if (publishStatus !== 'publish') return;

    const price = parsePrice(p.price);
    const promo = parsePrice(p.promoPrice);
    const finalPrice = (promo > 0 && promo < price) ? promo : price;

    if (stockStatus === 'instock' && qty > 0) {
        totalWithPromo += (qty * finalPrice);
        totalOnlyPrice += (qty * price);
    }

    if ((stockStatus === 'instock' || stockStatus === 'onbackorder') && qty > 0) {
        totalAllIncludingBackorder += (qty * finalPrice);
    }
});

console.log('--- RESULTADOS ---');
console.log('Total (Instock + Promo):', totalWithPromo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
console.log('Total (Instock + Somente Preço Cheio):', totalOnlyPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
console.log('Total (Instock & OnBackorder + Promo):', totalAllIncludingBackorder.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
