const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoiceNo TEXT,
            date TEXT,
            dateRaw TEXT,
            language TEXT,
            items TEXT,
            totalAmount INTEGER,
            itemCount INTEGER,
            paymentStatus TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating table", err);
            }
        });
    }
});

// API Routes
app.post('/api/orders', (req, res) => {
    const { invoiceNo, date, dateRaw, language, items, totalAmount, itemCount, paymentStatus } = req.body;
    const itemsStr = JSON.stringify(items);

    db.run(
        `INSERT INTO orders (invoiceNo, date, dateRaw, language, items, totalAmount, itemCount, paymentStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceNo, date, dateRaw, language, itemsStr, totalAmount, itemCount, paymentStatus],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: "Order saved successfully" });
        }
    );
});

app.get('/api/orders', (req, res) => {
    const limitCount = parseInt(req.query.limit) || 50;

    db.all(`SELECT * FROM orders ORDER BY createdAt DESC LIMIT ?`, [limitCount], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Parse items back to JSON
        const orders = rows.map(row => {
            try {
                row.items = JSON.parse(row.items);
            } catch (e) {
                row.items = [];
            }
            return row;
        });

        res.json(orders);
    });
});

app.delete('/api/orders/:id', (req, res) => {
    db.run(`DELETE FROM orders WHERE id = ?`, req.params.id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Order deleted", changes: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`To view the app, open your browser and go to http://localhost:${PORT}`);
});
