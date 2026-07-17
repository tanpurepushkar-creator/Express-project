const mysql = require('mysql2/promise');
require('dotenv').config();

// connection pool so we don't open a new connection for every request
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'orders_db',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
