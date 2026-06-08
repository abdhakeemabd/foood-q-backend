require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit to handle base64 images

// Database Setup
const dbFileName = process.env.DB_FILENAME || 'database.sqlite';
const dbPath = path.resolve(__dirname, dbFileName);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log(`Connected to the SQLite database (${dbFileName}).`);
    // Create Inventory table if not exists
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      itemName TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      img TEXT,
      status TEXT DEFAULT 'Active',
      createdAt TEXT NOT NULL
    )`);
  }
});

// --- API ROUTES ---

// 1. Get all inventory items
app.get('/api/inventory', (req, res) => {
  db.all('SELECT * FROM inventory ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 1.5 Get inventory items added in the last 24 hours (last day)
app.get('/api/inventory/recent', (req, res) => {
  const sql = "SELECT * FROM inventory WHERE datetime(createdAt) >= datetime('now', '-1 day') ORDER BY createdAt DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 2. Add a new item
app.post('/api/inventory', (req, res) => {
  const { id, itemName, category, price, quantity, img, status, createdAt } = req.body;
  const sql = `INSERT INTO inventory (id, itemName, category, price, quantity, img, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [id, itemName, category, price, quantity, img, status, createdAt];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Item created successfully', id: id });
  });
});

// 3. Update an item
app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { itemName, category, price, quantity, img, status } = req.body;
  
  const sql = `UPDATE inventory SET 
    itemName = COALESCE(?, itemName),
    category = COALESCE(?, category),
    price = COALESCE(?, price),
    quantity = COALESCE(?, quantity),
    img = COALESCE(?, img),
    status = COALESCE(?, status)
    WHERE id = ?`;
  
  const params = [itemName, category, price, quantity, img, status, id];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Item updated successfully', changes: this.changes });
  });
});

// 4. Delete an item
app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM inventory WHERE id = ?`, id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Item deleted successfully', changes: this.changes });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
