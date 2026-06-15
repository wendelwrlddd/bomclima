// Versão: 1.1.0 - PROD-READY - [7:35 PM]
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// ✅ CONFIGURAÇÃO DE CORS ROBUSTA
const allowedOrigins = [
    'https://bomclima.top',
    'https://www.bomclima.top',
    'https://bom-clima.top',
    'https://www.bom-clima.top',
    'https://bomclima-itabuna.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sem origin (como apps mobile ou curl)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.includes(origin) || origin.includes('bomclima.top') || origin.includes('bom-clima.top');
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`🛑 CORS bloqueado para origem: ${origin}`);
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Debug header opcional
app.use((req, res, next) => {
    res.setHeader('X-Debug-Version', 'suprema-v2');
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => res.send('API Bom Clima Ativa - Versão 1.1.2'));
app.get('/health', (req, res) => res.send('OK'));

// Proteção estrita do backend quando servimos a raiz inteira devido à Vercel
app.use('/backend', (req, res) => res.status(403).send('Acesso Negado'));
app.use('/node_modules', (req, res) => res.status(403).send('Acesso Negado'));
app.use('/package.json', (req, res) => res.status(403).send('Acesso Negado'));
app.use('/package-lock.json', (req, res) => res.status(403).send('Acesso Negado'));
app.use('/.env', (req, res) => res.status(403).send('Acesso Negado'));
app.use('/database.sql', (req, res) => res.status(403).send('Acesso Negado'));

// ✅ Servir arquivos estáticos (Dashboard, JS, Imagens) a partir da raiz
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/test-cors', (req, res) => {
    res.json({ message: 'CORS Manual Ativo', debug: 'suprema-v1' });
});

// Mercado Pago Configuration
const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});
const preference = new Preference(mpClient);

// Global process error logging
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejeição não tratada em:', promise, 'razão:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Exceção não capturada:', err);
});

// In-memory fallbacks removed to ensure absolute consistency via database

// Connection string prioritization: 
// 1. MYSQL_URL environment variable (Railway/Production)
// 2. Constructed string from internal variables (Individual vars)
// 3. Fallback for Local/Development
const getDBUrl = () => {
    if (process.env.MYSQL_URL) return process.env.MYSQL_URL;
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    if (process.env.MYSQL_PRIVATE_URL) return process.env.MYSQL_PRIVATE_URL;

    const host = process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.RAILWAY_MYSQL_HOST;
    const user = process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQL_PASSWORD;
    const port = process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306';
    const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';

    if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `mysql://${user}:${password}@${host}:${port}/${database}`;
    }
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
                id VARCHAR(255) PRIMARY KEY, -- Mudado para VARCHAR para consistência
                name VARCHAR(255) NOT NULL,
                categories LONGTEXT, -- Mudado para LONGTEXT
                price VARCHAR(100),
                costPrice VARCHAR(100),
                promoPrice VARCHAR(100),
                stock INT DEFAULT 0,
                stockStatus VARCHAR(100),
                imageName LONGTEXT,
                description LONGTEXT, -- Mudado para LONGTEXT
                sku VARCHAR(100),
                hidePrice TINYINT(1) DEFAULT 0,
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
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(50),
                productName VARCHAR(255),
                productId VARCHAR(255),
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Upgrade existing columns if needed (Garante que fotos grandes funcionem)
        const [prodCols] = await conn.execute("SHOW COLUMNS FROM products");

        // SKU Check
        if (!prodCols.find(c => c.Field === 'sku')) {
            await conn.execute(`ALTER TABLE products ADD COLUMN sku VARCHAR(100) AFTER description`);
        }

        // HidePrice Check
        if (!prodCols.find(c => c.Field === 'hidePrice')) {
            await conn.execute(`ALTER TABLE products ADD COLUMN hidePrice TINYINT(1) DEFAULT 0 AFTER sku`);
        }

        // CostPrice Check
        if (!prodCols.find(c => c.Field === 'costPrice')) {
            await conn.execute(`ALTER TABLE products ADD COLUMN costPrice VARCHAR(100) AFTER price`);
            console.log('✅ Coluna adicionada em products: costPrice');
        }

        // Force LONGTEXT for images and descriptions (MUITO IMPORTANTE)
        await conn.execute(`ALTER TABLE products MODIFY COLUMN imageName LONGTEXT`);
        await conn.execute(`ALTER TABLE products MODIFY COLUMN description LONGTEXT`);
        await conn.execute(`ALTER TABLE products MODIFY COLUMN categories LONGTEXT`);

        // Garante que o ID seja VARCHAR para suportar UUIDs ou timestamps do front
        const idCol = prodCols.find(c => c.Field === 'id');
        if (idCol && idCol.Type.toLowerCase().includes('int')) {
            await conn.execute(`ALTER TABLE products MODIFY COLUMN id VARCHAR(255)`);
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
                console.log(`✅ Coluna adicionada em orders: ${colName}`);
            }
        }

        // Forçar VARCHAR no eventos também se necessário
        const [eventCols] = await conn.execute("SHOW COLUMNS FROM events");
        const evIdCol = eventCols.find(c => c.Field === 'id');
        if (evIdCol && evIdCol.Type.toLowerCase().includes('int')) {
            await conn.execute(`ALTER TABLE events MODIFY COLUMN id VARCHAR(255)`);
        }
        const evProdIdCol = eventCols.find(c => c.Field === 'productId');
        if (evProdIdCol && evProdIdCol.Type.toLowerCase().includes('int')) {
            await conn.execute(`ALTER TABLE events MODIFY COLUMN productId VARCHAR(255)`);
        }
        if (!eventCols.find(c => c.Field === 'user')) {
            await conn.execute(`ALTER TABLE events ADD COLUMN user VARCHAR(100) AFTER id`);
            console.log('✅ Coluna adicionada em events: user');
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
    try {
        return await conn.execute(sql, params);
    } catch (err) {
        console.error(`❌ Erro SQL [${sql.substring(0, 50)}...]:`, err.message);
        throw err;
    }
}

const JWT_SECRET = process.env.JWT_SECRET;

// Configuração de Múltiplos Logins Protegidos (.env)
const ALLOWED_USERS = [
    { username: process.env.ADMIN_USER_1, password: process.env.ADMIN_PASSWORD_1 },
    { username: process.env.ADMIN_USER_2, password: process.env.ADMIN_PASSWORD_2 },
    { username: process.env.ADMIN_USER_3, password: process.env.ADMIN_PASSWORD_3 }
].filter(u => u.username && u.password); // Só carrega se configurado no .env

// Middleware de Autenticação
function authenticateToken(req, res, next) {
    // Permitir OPTIONS sem token para o Preflight do CORS
    if (req.method === 'OPTIONS') return next();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Acesso negado. Token não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Sessão inválida ou expirada.' });
        req.user = user;
        next();
    });
}

// Rotas de Autenticação
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Procura no array de credenciais se existe algum match
    const userFound = ALLOWED_USERS.find(u => u.username === username && u.password === password);

    if (userFound) {
        const user = { name: username };
        const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token: accessToken, username: username });
    } else {
        res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }
});

app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

// Routes — Products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await q('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Erro em GET /api/products:', err);
        res.status(500).json({ error: 'Serviço de Banco de Dados Indisponível' });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    const { id, name, categories, price, costPrice, promoPrice, stock, stockStatus, imageName, description, sku, hidePrice } = req.body;

    // Convert undefined to null to prevent mysql2 crash
    const safeNull = val => val === undefined ? null : val;
    const nameVal = safeNull(name);
    const catsVal = categories ? JSON.stringify(categories) : null;
    const priceVal = safeNull(price);
    const costPriceVal = safeNull(costPrice);
    const promoVal = safeNull(promoPrice);
    const stockVal = stock || 0;
    const ssVal = safeNull(stockStatus);
    const imgVal = safeNull(imageName);
    const descVal = safeNull(description);
    const skuVal = safeNull(sku);
    const hpVal = hidePrice ? 1 : 0;

    try {
        if (id) {
            // Se já tem ID, tenta atualizar
            const [result] = await q(
                'UPDATE products SET name=?, categories=?, price=?, costPrice=?, promoPrice=?, stock=?, stockStatus=?, imageName=?, description=?, sku=?, hidePrice=? WHERE id=?',
                [nameVal, catsVal, priceVal, costPriceVal, promoVal, stockVal, ssVal, imgVal, descVal, skuVal, hpVal, id.toString()]
            );

            if (result && result.affectedRows === 0) {
                // Produto existe no JSON estático, mas ainda não estava no BD!
                await q(
                    'INSERT INTO products (id, name, categories, price, costPrice, promoPrice, stock, stockStatus, imageName, description, sku, hidePrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [id.toString(), nameVal, catsVal, priceVal, costPriceVal, promoVal, stockVal, ssVal, imgVal, descVal, skuVal, hpVal]
                );
            }
            res.json({ success: true, message: 'Produto atualizado no Banco', id: id.toString() });
        } else {
            // Se não tem ID, cria um novo
            const newId = Date.now().toString();
            await q(
                'INSERT INTO products (id, name, categories, price, costPrice, promoPrice, stock, stockStatus, imageName, description, sku, hidePrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newId, nameVal, catsVal, priceVal, costPriceVal, promoVal, stockVal, ssVal, imgVal, descVal, skuVal, hpVal]
            );
            res.json({ success: true, message: 'Produto criado no Banco', id: newId });
        }
    } catch (err) {
        console.error('❌ Erro ao salvar no Banco:', err);
        res.status(500).json({ success: false, error: 'Serviço de Banco de Dados Indisponível' });
    }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        await q('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Produto removido' });
    } catch (err) {
        console.error('DELETE /api/products error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Batch update hidePrice API endpoint
app.post('/api/products/hide-prices', authenticateToken, async (req, res) => {
    const { updates } = req.body;
    // expect updates to be an array of { id, hidePrice }
    if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Formato inválido. `updates` deve ser um array.' });
    }

    try {
        for (const update of updates) {
            const hpVal = update.hidePrice ? 1 : 0;
            const strId = update.id.toString();
            await q('UPDATE products SET hidePrice=? WHERE id=?', [hpVal, strId]);
        }
        res.json({ success: true, message: 'Status de preço oculto atualizados no Banco' });
    } catch (err) {
        console.error('❌ Erro ao atualizar hidePrices no Banco:', err);
        res.status(500).json({ success: false, error: 'Serviço de Banco de Dados Indisponível' });
    }
});

// Routes — History/Events
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const [rows] = await q('SELECT * FROM events ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error('Erro em GET /api/history:', err);
        res.status(500).json({ error: 'Serviço de Banco de Dados Indisponível' });
    }
});

app.post('/api/history', authenticateToken, async (req, res) => {
    const { id, type, productName, productId, details } = req.body;
    const user = req.user ? (req.user.name || req.user.user) : 'Sistema';
    try {
        await q(
            'INSERT INTO events (id, user, type, productName, productId, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id || Date.now().toString(), user, type, productName, productId, details, new Date().toISOString().slice(0, 19).replace('T', ' ')]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar em POST /api/history:', err);
        res.status(500).json({ success: false, error: 'Serviço de Banco de Dados Indisponível' });
    }
});

// Routes — Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const [rows] = await q('SELECT * FROM orders ORDER BY lastUpdate DESC');
        res.json(rows);
    } catch (err) {
        console.error('Erro em GET /api/orders:', err);
        res.status(500).json({ error: 'Serviço de Banco de Dados Indisponível' });
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
        console.error('❌ Erro no banco ao salvar POST /api/orders:', err);
        res.status(500).json({ success: false, error: 'Serviço de Banco de Dados Indisponível' });
    }
});

app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    try {
        await q(
            'UPDATE orders SET status = ?, payment_status = ?, lastUpdate = NOW() WHERE id = ?',
            [status || 'paid', payment_status || 'paid', id]
        );
        res.json({ success: true, message: 'Status do pedido atualizado' });
    } catch (err) {
        console.error('❌ Erro no banco ao atualizar PUT /api/orders/:id/status:', err);
        res.status(500).json({ success: false, error: 'Serviço de Banco de Dados Indisponível' });
    }
});

app.post('/api/invoices', authenticateToken, async (req, res) => {
    const { orderId } = req.body;
    try {
        let order;
        const [rows] = await q('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (rows.length > 0) order = rows[0];

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
        await q('UPDATE orders SET invoice_status = ? WHERE id = ?', ['issued', orderId]);

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

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
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
