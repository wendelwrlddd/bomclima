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
app.use(express.json({ limit: '50mb' })); // Higher limit for Base64 images

// Database Connection
let pool;

async function connectDB() {
    try {
        // Use public proxy since api service is not on the same private network as MySQL
        pool = mysql.createPool({
            host: 'switchyard.proxy.rlwy.net',
            port: 15338,
            user: 'root',
            password: 'nqDUCuUlxtpxZztAHgWpXOKlLiZiUrVb',
            database: 'railway',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            connectTimeout: 30000,
            acquireTimeout: 30000
        });

        // Test connection
        await pool.query('SELECT 1');
        console.log('✅ Conectado ao MySQL no Railway (public proxy)');
    } catch (err) {
        console.error('❌ Erro ao conectar ao MySQL:', err.message);
        process.exit(1);
    }
}

// Routes
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { id, name, categories, price, promoPrice, stock, stockStatus, imageName, description } = req.body;
    try {
        if (id) {
            // Update
            await pool.query(
                'UPDATE products SET name=?, categories=?, price=?, promoPrice=?, stock=?, stockStatus=?, imageName=?, description=? WHERE id=?',
                [name, JSON.stringify(categories), price, promoPrice, stock, stockStatus, imageName, description, id]
            );
            res.json({ success: true, message: 'Produto atualizado' });
        } else {
            // Create
            const newId = Date.now();
            await pool.query(
                'INSERT INTO products (id, name, categories, price, promoPrice, stock, stockStatus, imageName, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newId, name, JSON.stringify(categories), price, promoPrice, stock, stockStatus, imageName, description]
            );
            res.json({ success: true, message: 'Produto criado', id: newId });
        }
    } catch (err) {
        console.error('❌ Erro ao salvar produto:', err.message, err.code);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Produto removido' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Orders Sync
app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM orders ORDER BY lastUpdate DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const { id, customer, whatsapp, items, total, status } = req.body;
    try {
        await pool.query(
            'INSERT INTO orders (id, customer, whatsapp, items, total, status, lastUpdate) VALUES (?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE customer=?, whatsapp=?, items=?, total=?, status=?, lastUpdate=NOW()',
            [id, customer, whatsapp, JSON.stringify(items), total, status, customer, whatsapp, JSON.stringify(items), total, status]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guard middleware - returns 503 if DB not ready
app.use('/api', (req, res, next) => {
    if (!pool) return res.status(503).json({ error: 'Database not ready yet, try again in a moment.' });
    next();
});

// Start Server - connect to DB first, then listen
async function start() {
    await connectDB();
    app.listen(port, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${port}`);
    });
}

start();
