const express = require('express');
require('dotenv').config();

const pool = require('./config/db');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Auto-create tables when server starts
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id   SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email     VARCHAR(100) NOT NULL UNIQUE,
        mobile    VARCHAR(15)  NOT NULL UNIQUE,
        status    VARCHAR(10)  NOT NULL DEFAULT 'Active'
                  CHECK (status IN ('Active', 'Inactive'))
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id     SERIAL PRIMARY KEY,
        user_id      INT            NOT NULL REFERENCES users(user_id),
        order_date   DATE           NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        item_id      SERIAL PRIMARY KEY,
        order_id     INT            NOT NULL REFERENCES orders(order_id),
        product_name VARCHAR(100)   NOT NULL,
        quantity     INT            NOT NULL,
        price        DECIMAL(10, 2) NOT NULL
      );
    `);

    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1); // stop the server if DB setup fails
  }
}

app.use('/api', orderRoutes);
app.use('/api', userRoutes);

// simple 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server only after DB is ready
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
