const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRegex = /^[0-9]{10}$/;

// POST /api/orders
// Creates a user (or reuses an existing one), then creates an order with items.
// Everything happens inside one transaction so partial data never gets saved.
router.post('/orders', async (req, res) => {
  const { user, order } = req.body;

  // ---- basic validation ----
  if (!user || !user.full_name || !user.email || !user.mobile) {
    return res.status(400).json({ error: 'user.full_name, user.email and user.mobile are required' });
  }
  if (!emailRegex.test(user.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!mobileRegex.test(user.mobile)) {
    return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
  }
  if (!order || !order.order_date || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ error: 'order.order_date and at least one item are required' });
  }

  for (const item of order.items) {
    if (!item.product_name || !item.quantity || !item.price) {
      return res.status(400).json({ error: 'Each item needs product_name, quantity and price' });
    }
    if (item.quantity <= 0 || item.price <= 0) {
      return res.status(400).json({ error: 'quantity and price must be greater than 0' });
    }
  }

  // reject duplicate product names inside the same order
  const productNames = order.items.map((i) => i.product_name.toLowerCase());
  const hasDuplicates = new Set(productNames).size !== productNames.length;
  if (hasDuplicates) {
    return res.status(400).json({ error: 'Duplicate product found in the same order' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // check if user already exists by email
    const [existingUsers] = await connection.query(
      'SELECT * FROM users WHERE email = ? OR mobile = ?',
      [user.email, user.mobile]
    );

    let userId;

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      // if email matches but mobile is different (or vice versa), block it
      if (existingUser.email === user.email && existingUser.mobile !== user.mobile) {
        await connection.rollback();
        return res.status(409).json({ error: 'This email is already registered with a different mobile number' });
      }
      if (existingUser.mobile === user.mobile && existingUser.email !== user.email) {
        await connection.rollback();
        return res.status(409).json({ error: 'This mobile number is already registered with a different email' });
      }

      userId = existingUser.user_id;
    } else {
      const [result] = await connection.query(
        'INSERT INTO users (full_name, email, mobile) VALUES (?, ?, ?)',
        [user.full_name, user.email, user.mobile]
      );
      userId = result.insertId;
    }

    // total is always calculated on the server, never trusted from the client
    const totalAmount = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, order_date, total_amount) VALUES (?, ?, ?)',
      [userId, order.order_date, totalAmount]
    );
    const orderId = orderResult.insertId;

    for (const item of order.items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_name, item.quantity, item.price]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Order created successfully',
      order_id: orderId,
      user_id: userId,
      total_amount: totalAmount,
      item_count: order.items.length,
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while creating the order' });
  } finally {
    connection.release();
  }
});

// GET /api/orders/:id
// Fetches the order along with its user and items, returned as nested JSON.
router.get('/orders/:id', async (req, res) => {
  const orderId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT 
        u.user_id, u.full_name, u.email, u.mobile, u.status,
        o.order_id, o.order_date, o.total_amount,
        oi.item_id, oi.product_name, oi.quantity, oi.price
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      JOIN order_items oi ON oi.order_id = o.order_id
      WHERE o.order_id = ?`,
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // all rows share the same user + order info, only items differ
    const first = rows[0];

    const response = {
      user: {
        user_id: first.user_id,
        full_name: first.full_name,
        email: first.email,
        mobile: first.mobile,
        status: first.status,
      },
      order: {
        order_id: first.order_id,
        order_date: first.order_date,
        total_amount: first.total_amount,
      },
      items: rows.map((row) => ({
        item_id: row.item_id,
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price,
      })),
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while fetching the order' });
  }
});

// GET /api/orders
// Fetches all orders with user information and item counts.
router.get('/orders', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        o.order_id, 
        o.order_date, 
        o.total_amount, 
        u.full_name, 
        u.email,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = o.order_id) as total_items
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      ORDER BY o.order_id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while fetching orders' });
  }
});

module.exports = router;
