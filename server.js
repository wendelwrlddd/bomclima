const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Higher limit for Base64 images

// Database Connection
let pool;

async function connectDB() {
    try {
        pool = mysql.createPool({
            host: process.env.MYSQLHOST,
            user: process.env.MYSQLUSER,
            password: process.env.MYSQLPASSWORD,
            database: process.env.MYSQLDATABASE,
            port: process.env.MYSQLPORT,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log('✅ Conectado ao MySQL no Railway');
    } catch (err) {
        console.error('❌ Erro ao conectar ao MySQL:', err);
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

// Start Server
app.listen(port, () => {
    connectDB();
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
