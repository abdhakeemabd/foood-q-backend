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

// Serve static files from the React frontend
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

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
    )`, (err) => {
      if (err) {
        console.error('Error creating inventory table', err.message);
      } else {
        // Seed database if inventory is empty
        db.get("SELECT COUNT(*) as count FROM inventory", (err, row) => {
          if (!err && row && row.count === 0) {
            console.log("Seeding SQLite inventory database with default items...");
            const defaultItems = [
              { id: 'p1', itemName: 'Masala Shawaya', category: 'Chicken', quantity: 100, price: 120, img: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&w=300&q=80' },
              { id: 'p2', itemName: 'Romali', category: 'Breads', quantity: 200, price: 15, img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80' },
              { id: 'p3', itemName: 'Kuboos', category: 'Breads', quantity: 200, price: 10, img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80' },
              { id: 'p4', itemName: 'Water 500ml', category: 'Beverages', quantity: 100, price: 10, img: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=300&q=80' },
              { id: 'p5', itemName: 'Water 1 Lt', category: 'Beverages', quantity: 100, price: 20, img: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=300&q=80' },
              { id: 'p6', itemName: 'Pepsi 500ml', category: 'Beverages', quantity: 100, price: 20, img: '/images/pepsi.png' },
              { id: 'p7', itemName: 'Pepsi 1 Lt', category: 'Beverages', quantity: 100, price: 40, img: '/images/pepsi.png' },
              { id: 'p8', itemName: '7 Up 500ml', category: 'Beverages', quantity: 100, price: 20, img: '/images/7up.png' },
              { id: 'p9', itemName: '7 Up 1 Lt', category: 'Beverages', quantity: 100, price: 40, img: '/images/7up.png' },
              { id: 'p10', itemName: 'Mandi Quarter', category: 'Main Course', quantity: 50, price: 75, img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80' },
              { id: 'p11', itemName: 'Combo: Shawaya + Kuboos', category: 'Combos', quantity: 50, price: 480, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=300&q=80' },
              { id: 'p12', itemName: 'Combo: Shawaya + Romali', category: 'Combos', quantity: 50, price: 500, img: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=300&q=80' },
              { id: 'p13', itemName: 'Tea', category: 'Hot Drinks', quantity: 100, price: 15, img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80' },
              { id: 'p14', itemName: 'Mint Lime', category: 'Beverages', quantity: 50, price: 35, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80' },
              { id: 'p15', itemName: 'Fresh Lime', category: 'Beverages', quantity: 50, price: 25, img: 'https://images.unsplash.com/photo-1523688881242-cb729dbdb825?auto=format&fit=crop&w=300&q=80' }
            ];
            const stmt = db.prepare(`INSERT INTO inventory (id, itemName, category, price, quantity, img, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)`);
            defaultItems.forEach(item => {
              stmt.run(item.id, item.itemName, item.category, item.price, item.quantity, item.img, new Date().toISOString());
            });
            stmt.finalize();
          }
        });
      }
    });
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

// Fallback to React app index.html for any unknown route (React router support)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
