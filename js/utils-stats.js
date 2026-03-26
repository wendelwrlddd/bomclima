console.log('Utils-stats carregado com sucesso');
/**
 * Utilitários para cálculos financeiros e estatísticas do estoque
 */

/**
 * Normaliza e converte uma string de preço (ex: "R$ 1.200,50") em um número float.
 * @param {string|number} val 
 * @returns {number}
 */
export const parsePrice = (val) => {
    if (!val) return 0;
    let str = val.toString().trim();
    if (str.includes(',')) {
        str = str.replace(/[^\d,]/g, '').replace(',', '.');
    } else {
        str = str.replace(/[^\d.]/g, '');
    }
    return parseFloat(str) || 0;
};

/**
 * Calcula o valor total de uma lista de produtos baseando-se em filtros rígidos:
 * - Apenas produtos publicados ('publish')
 * - Apenas produtos com status em estoque ('instock')
 * - Quantidade maior que zero
 * @param {Array} products 
 * @returns {number}
 */
export const calculateStockTotalValue = (products) => {
    let totalValue = 0;

    products.forEach(p => {
        // 1. Normalizar Estoque
        let stockRaw = (p.stock !== undefined && p.stock !== null) ? p.stock.toString() : '0';
        const qty = parseInt(stockRaw.replace(/[^\d]/g, ''), 10) || 0;

        // 2. Normalizar Status
        const stockStatus = (p.stockStatus || '').toString().trim().toLowerCase();
        const publishStatus = (p.status || 'publish').toString().trim().toLowerCase();

        // 3. Filtros Rigorosos (Apenas 'instock' com estoque físico)
        if (stockStatus !== 'instock') return;
        if (qty <= 0) return;
        if (publishStatus !== 'publish') return;

        // 4. Calcular Preço Final
        const price = parsePrice(p.price);
        const promo = parsePrice(p.promoPrice);
        let finalPrice = (promo > 0) ? promo : price;

        if (finalPrice > 0) {
            totalValue += (qty * finalPrice);
        }
    });

    return totalValue;
};

/**
 * Formata um número para o padrão de moeda Brasileira (BRL)
 * @param {number} value 
 * @returns {string}
 */
export const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

/**
 * Calcula o valor total de custo baseando-se em produtos com preco de custo definido.
 * Retorna o valor e a quantidade de produtos sem preco de custo.
 */
export const calculateStockCostValue = (products) => {
    let totalCostValue = 0;
    let missingCostPriceCount = 0;

    products.forEach(p => {
        // 1. Normalizar Estoque
        let stockRaw = (p.stock !== undefined && p.stock !== null) ? p.stock.toString() : '0';
        const qty = parseInt(stockRaw.replace(/[^\d]/g, ''), 10) || 0;

        // 2. Normalizar Status
        const stockStatus = (p.stockStatus || '').toString().trim().toLowerCase();
        const publishStatus = (p.status || 'publish').toString().trim().toLowerCase();

        // 3. Filtros (Apenas 'instock' com estoque físico)
        if (stockStatus !== 'instock') return;
        if (qty <= 0) return;
        if (publishStatus !== 'publish') return;

        // 4. Calcular Custo Total
        const costPrice = parsePrice(p.costPrice);

        if (costPrice > 0) {
            totalCostValue += (qty * costPrice);
        } else {
            missingCostPriceCount++;
        }
    });

    return { totalCostValue, missingCostPriceCount };
};
