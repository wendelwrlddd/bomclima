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
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Upgrade existing columns if needed
        const [cols] = await conn.execute("SHOW COLUMNS FROM products");
        if (!cols.find(c => c.Field === 'sku')) {
            await conn.execute(`ALTER TABLE products ADD COLUMN sku VARCHAR(100) AFTER description`);
        }
        await conn.execute(`ALTER TABLE products MODIFY COLUMN imageName LONGTEXT`);
        
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
        const [rows] = await q('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('GET /api/products error:', err.message);
        res.status(500).json({ error: err.message });
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
        console.error('POST /api/products error:', err.message, err.code);
        res.status(500).json({ error: err.message });
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

app.get('/api/movements', async (req, res) => {
    try {
        const [rows] = await q(`
            SELECT m.*, p.name as productName 
            FROM movements m 
            JOIN products p ON m.productId = p.id 
            ORDER BY m.date DESC 
            LIMIT 50
        `);
        res.json(rows);
    } catch (err) {
        console.error('GET /api/movements error:', err.message);
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
