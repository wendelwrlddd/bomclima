require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const port = process.env.PORT || 3000;

// ✅ SOLUÇÃO SUPREMA - MANIPULAÇÃO MANUAL DE HEADERS (Fim do erro de rede)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = [
        'https://bomclima.top',
        'https://www.bomclima.top',
        'https://bomclima-itabuna.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173'
    ];

    if (allowed.includes(origin) || (origin && origin.includes('bomclima.top'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Debug-Version', 'suprema-v1');

    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }
    next();
});

app.use(express.json({ limit: '50mb' }));

// Rota de teste para verificar se o servidor está vivo
app.get('/health', (req, res) => res.send('OK'));

app.get('/api/test-cors', (req, res) => {
    res.json({ message: 'CORS Manual Ativo', debug: 'suprema-v1' });
});

// Mercado Pago Configuration (Test credentials)
const mpClient = new MercadoPagoConfig({ 
    accessToken: 'TEST-7531342776792245-022113-1bf9bd027fbf866bc599508a49240428-2205903660' 
});
const preference = new Preference(mpClient);

// Global process error logging
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejeição não tratada em:', promise, 'razão:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Exceção não capturada:', err);
});

// Fallback in-memory storage for when DB is unavailable
let memProducts = [];
try {
    const fs = require('fs');
    if (fs.existsSync('./products_data.json')) {
        memProducts = JSON.parse(fs.readFileSync('./products_data.json', 'utf8'));
        console.log(`✅ ${memProducts.length} produtos carregados do JSON para memória.`);
    }
} catch (e) {
    console.warn('⚠️ Não foi possível carregar products_data.json na inicialização.');
}
let memOrders = [];
let memEvents = [];

// Connection string prioritization: 
// 1. MYSQL_URL environment variable (Railway/Production)
// 2. Constructed string from internal variables (Individual vars)
// 3. Fallback for Local/Development
const getDBUrl = () => {
    // Priority 1: Full URL
    if (process.env.MYSQL_URL) return process.env.MYSQL_URL;
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

    // Priority 2: Individual variables (Support both MYSQLHOST and MYSQL_HOST formats)
    const host = process.env.MYSQLHOST || process.env.MYSQL_HOST;
    const user = process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQL_PASSWORD;
    const port = process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306';
    const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';

    if (host) {
        return `mysql://${user}:${password}@${host}:${port}/${database}`;
    }
    
    // Fallback for local dev if .env is missing but we want to reach Railway Public Proxy
    if (process.env.MYSQL_PUBLIC_URL) return process.env.MYSQL_PUBLIC_URL;
    
    return '';
};

const MYSQL_URL = getDBUrl();
console.log('📡 Configuração de Banco de Dados:');
if (MYSQL_URL) {
    const maskedUrl = MYSQL_URL.replace(/:([^@]+)@/, ':****@');
    console.log(`   - URL: ${maskedUrl}`);
} else {
    console.log('   - ⚠️ Nenhuma URL de banco configurada. Usando modo offline.');
}

let pool = null;

async function initDB(conn) {
    try {
        // 1. Create tables first
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id BIGINT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                categories TEXT,
                price VARCHAR(100),
                promoPrice VARCHAR(100),
                stock INT DEFAULT 0,
                stockStatus VARCHAR(100),
                imageName LONGTEXT,
                description TEXT,
                sku VARCHAR(100),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(255) PRIMARY KEY,
                customer VARCHAR(255),
                whatsapp VARCHAR(50),
                items TEXT,
                total DECIMAL(10,2),
                status VARCHAR(50),
                cpf_cnpj VARCHAR(20),
                email VARCHAR(255),
                phone VARCHAR(50),
                cep VARCHAR(10),
                street VARCHAR(255),
                number VARCHAR(50),
                district VARCHAR(100),
                city VARCHAR(100),
                uf VARCHAR(2),
                payment_status VARCHAR(50),
                invoice_status VARCHAR(50),
                lastUpdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS events (
                id BIGINT PRIMARY KEY,
                type VARCHAR(50),
                productName VARCHAR(255),
                productId BIGINT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Upgrade existing columns if needed
        const [prodCols] = await conn.execute("SHOW COLUMNS FROM products");
        if (!prodCols.find(c => c.Field === 'sku')) {
            await conn.execute(`ALTER TABLE products ADD COLUMN sku VARCHAR(100) AFTER description`);
        }
        
        const [orderCols] = await conn.execute("SHOW COLUMNS FROM orders");
        const newCols = [
            'cpf_cnpj VARCHAR(20)', 'email VARCHAR(255)', 'phone VARCHAR(50)', 
            'cep VARCHAR(10)', 'street VARCHAR(255)', 'number VARCHAR(50)', 
            'district VARCHAR(100)', 'city VARCHAR(100)', 'uf VARCHAR(2)',
            'payment_status VARCHAR(50)', 'invoice_status VARCHAR(50)'
        ];

        for (const colDef of newCols) {
            const colName = colDef.split(' ')[0];
            if (!orderCols.find(c => c.Field === colName)) {
                await conn.execute(`ALTER TABLE orders ADD COLUMN ${colDef}`);
                console.log(`✅ Coluna adicionada: ${colName}`);
            }
        }

        console.log('✅ Tabelas verificadas/atualizadas com sucesso');
    } catch (err) {
        console.error('❌ Erro ao inicializar banco:', err);
    }
}

async function getDB() {
    if (pool) return pool;
    
    if (!MYSQL_URL) {
        console.warn('⚠️ Impossível conectar: MYSQL_URL não definida.');
        return null;
    }

    try {
        pool = mysql.createPool({
            uri: MYSQL_URL,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
        
        // Test connection
        const conn = await pool.getConnection();
        console.log('✅ Conectado ao MySQL Pool');
        await initDB(conn);
        conn.release();
        
        return pool;
    } catch (err) {
        console.error('❌ Erro fatal ao configurar Pool de Banco:', err.message);
        pool = null;
        return null;
    }
}

async function q(sql, params = []) {
    const conn = await getDB();
    if (!conn) {
        throw new Error('Banco de dados indisponível. Verifique a conexão.');
    }
    return conn.execute(sql, params);
}

// Routes — Products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await q('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.warn('⚠️ Usando fallback de memória para GET /api/products');
        res.json(memProducts);
    }
});

app.post('/api/products', async (req, res) => {
    const { id, name, categories, price, promoPrice, stock, stockStatus, imageName, description, sku } = req.body;
    try {
        if (id) {
            await q(
                'UPDATE products SET name=?, categories=?, price=?, promoPrice=?, stock=?, stockStatus=?, imageName=?, description=?, sku=? WHERE id=?',
                [name, JSON.stringify(categories), price, promoPrice, stock, stockStatus, imageName, description, sku || null, id]
            );
            res.json({ success: true, message: 'Produto atualizado' });
        } else {
            const newId = Date.now();
            await q(
                'INSERT INTO products (id, name, categories, price, promoPrice, stock, stockStatus, imageName, description, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newId, name, JSON.stringify(categories), price, promoPrice, stock, stockStatus, imageName, description, sku || null]
            );
            res.json({ success: true, message: 'Produto criado', id: newId });
        }
    } catch (err) {
        console.warn('⚠️ Salvando em memória: POST /api/products');
        const productToSave = { ...req.body };
        if (!productToSave.id) productToSave.id = Date.now();
        
        const idx = memProducts.findIndex(p => p.id == productToSave.id);
        if (idx !== -1) {
            memProducts[idx] = { ...memProducts[idx], ...productToSave };
        } else {
            memProducts.push(productToSave);
        }
        res.json({ success: true, message: 'Salvo em memória (DB offline)', id: productToSave.id });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await q('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Produto removido' });
    } catch (err) {
        console.error('DELETE /api/products error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Routes — History/Events
app.get('/api/history', async (req, res) => {
    try {
        const [rows] = await q('SELECT * FROM events ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.warn('⚠️ Usando fallback de memória para GET /api/history');
        res.json(memEvents);
    }
});

app.post('/api/history', async (req, res) => {
    const { id, type, productName, productId, details } = req.body;
    try {
        await q(
            'INSERT INTO events (id, type, productName, productId, details, timestamp) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE type=?, productName=?, productId=?, details=?',
            [id, type, productName, productId, details, type, productName, productId, details]
        );
        res.json({ success: true });
    } catch (err) {
        console.warn('⚠️ Salvando em memória: POST /api/history');
        const newEvent = { id, type, productName, productId, details, timestamp: new Date().toISOString() };
        memEvents.unshift(newEvent); // Add to beginning
        if (memEvents.length > 100) memEvents.pop();
        res.json({ success: true, message: 'Evento salvo em memória' });
    }
});

// Routes — Orders
app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await q('SELECT * FROM orders ORDER BY lastUpdate DESC');
        res.json(rows);
    } catch (err) {
        console.warn('⚠️ Usando fallback de memória para GET /api/orders');
        res.json(memOrders);
    }
});
app.post('/api/orders', async (req, res) => {
    const orderDataReceived = req.body;
    console.log('📦 Novo pedido recebido:', JSON.stringify(orderDataReceived, null, 2));

    const { 
        id, customer, whatsapp, items, total, status,
        cpf_cnpj, email, phone, cep, street, number, district, city, uf,
        payment_status, invoice_status 
    } = orderDataReceived;
    
    // Clean total string to decimal safely
    let cleanTotal = 0;
    if (total) {
        if (typeof total === 'string') {
            const numericValue = total.replace(/[^\d,]/g, '').replace(',', '.');
            cleanTotal = parseFloat(numericValue) || 0;
        } else {
            cleanTotal = total;
        }
    }

    try {
        await q(
            `INSERT INTO orders (
                id, customer, whatsapp, items, total, status, 
                cpf_cnpj, email, phone, cep, street, number, district, city, uf, 
                payment_status, invoice_status, lastUpdate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE 
                customer=?, whatsapp=?, items=?, total=?, status=?, 
                cpf_cnpj=?, email=?, phone=?, cep=?, street=?, number=?, district=?, city=?, uf=?, 
                payment_status=?, invoice_status=?, lastUpdate=NOW()`,
            [
                id, customer, whatsapp, JSON.stringify(items || []), cleanTotal, status || 'pending',
                cpf_cnpj || null, email || null, phone || null, cep || null, street || null, number || null, district || null, city || null, uf || null,
                payment_status || 'paid', invoice_status || 'pending',
                customer, whatsapp, JSON.stringify(items || []), cleanTotal, status || 'pending',
                cpf_cnpj || null, email || null, phone || null, cep || null, street || null, number || null, district || null, city || null, uf || null,
                payment_status || 'paid', invoice_status || 'pending'
            ]
        );
        res.json({ success: true });
    } catch (err) {
        console.warn('⚠️ Salvando em memória: POST /api/orders');
        const idx = memOrders.findIndex(o => o.id == id);
        if (idx !== -1) {
            memOrders[idx] = { ...memOrders[idx], ...orderDataReceived, lastUpdate: new Date().toISOString() };
        } else {
            memOrders.push({ ...orderDataReceived, lastUpdate: new Date().toISOString() });
        }
        res.json({ success: true, message: 'Salvo em memória (DB offline)' });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    try {
        await q(
            'UPDATE orders SET status = ?, payment_status = ?, lastUpdate = NOW() WHERE id = ?',
            [status || 'paid', payment_status || 'paid', id]
        );
        res.json({ success: true, message: 'Status do pedido atualizado' });
    } catch (err) {
        console.warn('⚠️ Atualizando status em memória para pedido:', id);
        const idx = memOrders.findIndex(o => o.id == id);
        if (idx !== -1) {
            memOrders[idx].status = status || 'paid';
            memOrders[idx].payment_status = payment_status || 'paid';
            memOrders[idx].lastUpdate = new Date().toISOString();
            res.json({ success: true, message: 'Status atualizado em memória' });
        } else {
            res.status(404).json({ error: 'Pedido não encontrado para atualização de status' });
        }
    }
});

app.post('/api/invoices', async (req, res) => {
    const { orderId } = req.body;
    try {
        let order;
        try {
            const [rows] = await q('SELECT * FROM orders WHERE id = ?', [orderId]);
            if (rows.length > 0) order = rows[0];
        } catch (dbErr) {
            order = memOrders.find(o => o.id == orderId);
        }

        if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
        
        const emitter = {
            cnpj: "12345678000195",
            razao_social: "BOM CLIMA AR CONDICIONADO LTDA",
            ie: "123456789",
            regime: "1",
            address: { city: "Itabuna", uf: "BA" }
        };

        const invoiceData = {
            emitter,
            customer: {
                name: order.customer,
                cpf_cnpj: order.cpf_cnpj,
                email: order.email,
                address: {
                    cep: order.cep,
                    street: order.street,
                    number: order.number,
                    district: order.district,
                    city: order.city,
                    uf: order.uf
                }
            },
            items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []),
            total: order.total,
            timestamp: new Date().toISOString()
        };

        // Update order status
        try {
            await q('UPDATE orders SET invoice_status = ? WHERE id = ?', ['issued', orderId]);
        } catch (dbErr) {
            const idx = memOrders.findIndex(o => o.id == orderId);
            if (idx !== -1) memOrders[idx].invoice_status = 'issued';
        }

        res.json({ success: true, invoice: invoiceData });
    } catch (err) {
        console.error('POST /api/invoices error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/create-preference', async (req, res) => {
    try {
        const { id, items, customer, cpf_cnpj, email, status } = req.body;
        
        // Use Origin header, Referer, or fallback to the current request's host
        let host = req.headers.origin;
        if (!host && req.headers.referer) {
            try {
                const refUrl = new URL(req.headers.referer);
                host = `${refUrl.protocol}//${refUrl.host}`;
            } catch (e) {
                host = 'http://localhost:5173';
            }
        }
        if (!host) host = 'http://localhost:5173';
        
        const body = {
            items: items.map(item => {
                // Handle Brazilian price format: R$ 1.234,56 -> 1234.56
                let rawPrice = String(item.price || '0')
                    .replace('R$', '')
                    .replace(/\s/g, '')
                    .replace(/\./g, '')    // remove thousand separators (dots)
                    .replace(',', '.');    // replace decimal comma with dot
                const unitPrice = parseFloat(rawPrice) || 0.01;
                return {
                    id: item.id.toString(),
                    title: item.name,
                    unit_price: unitPrice,
                    quantity: parseInt(item.quantity) || 1,
                    currency_id: 'BRL'
                };
            }),
            back_urls: {
                success: `${host}/obrigado.html?status=approved&external_reference=${id}`,
                failure: `${host}/index.html?status=failure`,
                pending: `${host}/index.html?status=pending`
            },
            auto_return: "approved",
            external_reference: id,
            payer: {
                name: customer,
                email: email || `checkout-${id}@test.com`, // Unique fallback to avoid sandbox conflicts
            }
        };

        const result = await preference.create({ body });
        res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
        console.error('❌ Erro ao criar preferência MP:', error);
        res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await q('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/orders error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Express error handler
app.use((err, req, res, next) => {
    console.error('🔥 Erro no Express:', err);
    res.status(500).json({ error: 'Erro interno no servidor', details: err.message });
});

// Start server (no need to pre-connect; getDB() handles lazy connect)
app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});
