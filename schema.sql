-- PostgreSQL schema for orders_db
-- Run this in your Render PostgreSQL database using the Render shell or psql

CREATE TABLE IF NOT EXISTS users (
  user_id   SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email     VARCHAR(100) NOT NULL UNIQUE,
  mobile    VARCHAR(15)  NOT NULL UNIQUE,
  status    VARCHAR(10)  NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive'))
);

CREATE TABLE IF NOT EXISTS orders (
  order_id     SERIAL PRIMARY KEY,
  user_id      INT            NOT NULL REFERENCES users(user_id),
  order_date   DATE           NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  item_id      SERIAL PRIMARY KEY,
  order_id     INT            NOT NULL REFERENCES orders(order_id),
  product_name VARCHAR(100)   NOT NULL,
  quantity     INT            NOT NULL,
  price        DECIMAL(10, 2) NOT NULL
);
