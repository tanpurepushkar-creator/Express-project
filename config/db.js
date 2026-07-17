const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL (provided by Render) or fall back to individual env vars for local dev
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // required for Render's hosted PostgreSQL
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'orders_db',
        port: process.env.DB_PORT || 5432,
      }
);

module.exports = pool;
