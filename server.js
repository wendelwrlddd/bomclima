const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'https://bomclima-itabuna.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173'
    ],
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Database - auto-reconnecting single connection
let db;

// Connection string prioritization: 
// 1. MYSQL_URL environment variable (Railway provided)
// 2. Constructed string from internal variables
// 3. Fallback to confirmed public proxy (last resort)
const getDBUrl = () => {
    if (process.env.MYSQL_URL) return process.env.MYSQL_URL;
    if (process.env.MYSQLHOST) {
        return `mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASSWORD}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDATABASE}`;
    }
    return '';
};

const MYSQL_URL = getDBUrl();

async function initDB(conn) {
    try {
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id BIGINT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                categories TEXT,
                price VARCHAR(50),
                promoPrice VARCHAR(50),
                stock INT DEFAULT 0,
                stockStatus VARCHAR(50),
                imageName LONGTEXT,
                description TEXT,
                sku VARCHAR(100),
                active TINYINT(1) DEFAULT 1,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Upgrade existing columns if needed
        const [cols] = await conn.execute("SHOW COLUMNS FROM products");
        if (!cols.find(c => c.Field === 'sku')) {
            await conn.execute(`ALTER TABLE products ADD COLUMN sku VARCHAR(100) AFTER description`);
        }
        if (!cols.find(c => c.Field === 'active')) {
            await conn.execute(`ALTER TABLE products ADD COLUMN active TINYINT(1) DEFAULT 1`);
        }
        await conn.execute(`ALTER TABLE products MODIFY COLUMN imageName LONGTEXT`);
        
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS movements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                productId BIGINT,
                type ENUM('ENTRADA', 'SAIDA'),
                quantity INT,
                price DECIMAL(10,2),
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
                lastUpdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabelas verificadas/atualizadas com sucesso');
    } catch (err) {
        console.error('❌ Erro ao inicializar banco:', err.message);
    }
}

async function getDB() {
    if (db) {
        try {
            await db.ping();
            return db;
        } catch (e) {
            console.log('🔄 Reconectando ao MySQL...');
            db = null;
        }
    }
    try {
        db = await mysql.createConnection(MYSQL_URL);
        db.on('error', (err) => {
            console.error('MySQL error:', err.code);
            db = null;
        });
        console.log('✅ Conectado ao MySQL no Railway');
        await initDB(db);
        return db;
    } catch (err) {
        console.error('❌ Erro ao conectar ao MySQL:', err.message);
        return null; 
    }
}

async function q(sql, params = []) {
    const conn = await getDB();
    return conn.execute(sql, params);
}

// Routes — Products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await q('SELECT * FROM products WHERE active = 1 ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('GET /api/products error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { id, name, categories, price, promoPrice, stock, stockStatus, imageName, description, sku } = req.body;
    try {
        let oldStock = 0;
        const cleanPrice = parseFloat((price || "0").toString().replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.')) || 0;

        if (id) {
            // Get old stock for movement diff
            const [rows] = await q('SELECT stock FROM products WHERE id = ?', [id]);
            if (rows.length > 0) oldStock = rows[0].stock;

            await q(
                'UPDATE products SET name=?, categories=?, price=?, promoPrice=?, stock=?, stockStatus=?, imageName=?, description=?, sku=?, active=1 WHERE id=?',
                [name, JSON.stringify(categories), price, promoPrice, stock, stockStatus, imageName, description, sku || null, id]
            );
        } else {
            const newId = Date.now();
            await q(
                'INSERT INTO products (id, name, categories, price, promoPrice, stock, stockStatus, imageName, description, sku, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
                [newId, name, JSON.stringify(categories), price, promoPrice, stock, stockStatus, imageName, description, sku || null]
            );
            // Log initial entry
            if (stock > 0) {
                await q('INSERT INTO movements (productId, type, quantity, price) VALUES (?, ?, ?, ?)', [newId, 'ENTRADA', stock, cleanPrice]);
            }
            return res.json({ success: true, message: 'Produto criado', id: newId });
        }

        // Log movement diff for updates
        const diff = stock - oldStock;
        if (diff !== 0) {
            await q('INSERT INTO movements (productId, type, quantity, price) VALUES (?, ?, ?, ?)', 
                [id, diff > 0 ? 'ENTRADA' : 'SAIDA', Math.abs(diff), cleanPrice]);
        }

        res.json({ success: true, message: 'Produto atualizado' });
    } catch (err) {
        console.error('POST /api/products error:', err.message, err.code);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        // Soft delete
        await q('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Produto desativado (soft delete)' });
    } catch (err) {
        console.error('DELETE /api/products error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Analytics Route
app.get('/api/movements/summary', async (req, res) => {
    try {
        const [rows] = await q(`
            SELECT 
                type, 
                SUM(quantity) as items, 
                SUM(quantity * price) as total 
            FROM movements 
            WHERE MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())
            GROUP BY type
        `);
        res.json(rows);
    } catch (err) {
        console.error('GET /api/movements/summary error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Routes — Orders
app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await q('SELECT * FROM orders ORDER BY lastUpdate DESC');
        res.json(rows);
    } catch (err) {
        console.error('GET /api/orders error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const { id, customer, whatsapp, items, total, status } = req.body;
    try {
        await q(
            'INSERT INTO orders (id, customer, whatsapp, items, total, status, lastUpdate) VALUES (?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE customer=?, whatsapp=?, items=?, total=?, status=?, lastUpdate=NOW()',
            [id, customer, whatsapp, JSON.stringify(items), total, status, customer, whatsapp, JSON.stringify(items), total, status]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('POST /api/orders error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Start server (no need to pre-connect; getDB() handles lazy connect)
app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});
