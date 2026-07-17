-- Run this file first to create the database and tables

CREATE DATABASE IF NOT EXISTS orders_db;
USE orders_db;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  status ENUM('Active', 'Inactive') DEFAULT 'Active'
);

CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_date DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE order_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
