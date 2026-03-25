const fs = require('fs');

const FULL_CATEGORIES = [
    "BOBINA MAGUINETICA P/C TM15/TM16 24", "Bobina para compressor", "Caixa de teto", 
    "celta", "Chave AC universal", "CHICOTE 5 VIAS", "Chicote bomba ar linha GM", "CHICOTE LINHA GM", 
    "classic", "Comando", "Compressor", "Condensadores", "CONEXAO DE ALUMINIO", "CONEXAO ORING 8X90", 
    "CONEXAO ORING AÇO", "CONEXAO ORING ALUMINIO", "Conjunto de embreagem Hilux", "Copinho clip\\6", 
    "COPINHO CLIP10", "Copinho\\clip8", "cronos", "Eletroventilador", "Eletroventilador Universal", 
    "Evaporador", "Evaporadores", "Evaporarador de celta", "fiesta", "Filtro cabine", "Filtro cabine de kwid", 
    "Filtros Secadores", "HIGIENIZADOR GREEN", "Kit de embreagem", "Kit de ferramentas", "KIT INSTALADOR", 
    "Lâmpada de teste", "linea", "MANGUEIRA", "Manometro Manifold", "Modulo", "Moto ventilador interno constelletion", 
    "Moto ventilador interno Hilux", "Motor da caixa", "Motor da caixa Chevrolet GM", "Motor da caixa evaporador Mercedes Axor", 
    "Motor da caixa Komatsu\\ Hitachi\\ Caterpillar", "Motor ventilador actros", "Motor ventilador interno GM", 
    "Nucleo de valvula", "Nucleo de valvula Ranger", "Óleo Igloo 46", "OLEO IGLOO PRA COMPRESSOR", 
    "OLEO P\\COMPRESSOR PAG 150 937ML", "OLEO P\\COMPRESSOR PEG 100", "Oléo pag 150 sem contraste", 
    "ÓLEO PAG 46 250ML", "ORING 06M", "ORING 10M", "ORING 8M", "PALHETAS COMPRESSORES", "Polia solta", 
    "PORTA FUSÍVEL", "PRESSOSTATO FORD KA", "PRESSOSTATO FORD KA ALTA", "Pressostato Ford Ranger", 
    "PRESSOSTATO GM", "Pressostato GM/ RENAULT", "pressostato gol", "Pressostato peugeot", "Pressostato Unviversal", 
    "propressor", "RELÉ 24V", "RELÉ 70A", "Rele universal 12v", "resistencia", "Resistência do eletroventilador", 
    "Resistencia para caixa evaporadora", "Rolamento 6000", "Rolamentos de compressor", "Rolamentos Vetor", 
    "Selo compressor", "Selo compressor sandem", "SENSOR", "Sensor de temperatura externa peugeot renault citroen", 
    "Sensor de temperatura externo Gm", "sensor de temperatura hyundai", "SENSOR E CHICOTE MERCEDES", 
    "SENSOR EVAPORADOR DO ONIX", "SENSOR EVAPORADOR FLUENCE", "sensor temperatura externa ford Ranger e Fusion", 
    "sensor temperatura externa Jeep", "TAMPA COMPRESSOR", "TAPA FUGAS", "Termostato Eletronico", 
    "Termostato universal", "toro", "TRANSDUTOR AUDI 3 VW", "uniao 10 venil de aço", "UNIAO 12MM", 
    "UNIAO 1OMM", "UNIAO 6MM", "UNIAO 8 COM VENIL ALUMINIO", "UNIAO 8 VENIL AÇO", "UNIAO 8MM", 
    "UNIAO DE VENIL ALUMINIO", "Valvula Block \\caterpilar \\ford\\gol\\palio", "VALVULA BLOCK \\CONSTELETIOON\\IVECO", 
    "Valvula block delivery", "Valvula block Hilux \\toyota", "VALVULA BLOCK VALTRA VW", "Valvula caneta", 
    "Valvula de alta", "VALVULA DE EXPANSAO", "Valvula de expansao \\gol\\fox", "Valvula de expansao \\logan\\sandeiro", 
    "Valvula de torre\\compressor\\7SB16C\\Gol G3\\BMW", "VALVULA ELETRONICA", "VALVULA ELETRONICA \\SENTRA", 
    "Valvula eletronica Mahle\\polo\\virtus", "Valvula Eletronica p\\compressor jetta \\amarok", 
    "Valvula Enchimento de baixa", "VALVULA ETIOS", "Valvula Master\\ Citroen", "valvula mitsubishi\\ pajero", 
    "valvula onix", "VALVULA SD MENOR", "VALVULA TORRE", "Válvula torre maior ACPX7", 
    "VALVULA TORRE P\\COMPRESSOR\\SD SD7V16", "Válvula torre pequena (ACPX3)", "Válvulas de expansão", 
    "VENTILADOR", "VENTILADOR INTERNO AXO ATEGO", "ventilador interno Caminhao MB 1620"
];

const products = JSON.parse(fs.readFileSync('products_data.json', 'utf8'));

// Sort categories by length descending to match most specific first
const sortedCats = [...FULL_CATEGORIES].sort((a, b) => b.length - a.length);

const updatedProducts = products.map(p => {
    const name = (p.name || "").toLowerCase();
    const tags = (p.tags || []).map(t => t.toLowerCase());
    const currentCats = (p.categories || []).map(c => c.toLowerCase());
    
    let foundCat = null;
    
    for (const cat of sortedCats) {
        const loweredCat = cat.toLowerCase();
        // Check if name contains category name
        if (name.includes(loweredCat)) {
            foundCat = cat;
            break;
        }
        // Check if tags contain category name
        if (tags.some(t => t.includes(loweredCat))) {
            foundCat = cat;
            break;
        }
    }
    
    if (foundCat) {
        // Replace or add the category
        p.categories = [foundCat];
    } else if (!p.categories || p.categories.length === 0) {
        p.categories = ["Sem categoria"];
    }
    
    return p;
});

fs.writeFileSync('products_data.json', JSON.stringify(updatedProducts, null, 2));
console.log('Recategorização concluída!');
