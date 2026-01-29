-- Database Schema for Nat Steel Management
-- Compatible with MySQL and MariaDB

-- Note: If running on a shared server, you may need to create the database manually 
-- and skip the next two lines.
CREATE DATABASE IF NOT EXISTS `nat_steel_db`;
USE `nat_steel_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'shop') NOT NULL DEFAULT 'shop',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(100) NOT NULL,         -- e.g., 'H-Beam', 'Steel', 'Rebar'
    `dimensions` VARCHAR(100),            -- e.g., '100x100mm'
    `unit` VARCHAR(50) DEFAULT 'pcs',     -- e.g., 'pcs', 'kg', 'm'
    `buy_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `sell_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `min_stock_level` INT DEFAULT 10,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Sales Table (The transaction header)
CREATE TABLE IF NOT EXISTS `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `item_count` INT NOT NULL DEFAULT 0,  -- Denormalized count for quick display
    `sell_type` ENUM('Cash', 'Credit', 'Bank Account') NOT NULL DEFAULT 'Cash',
    `buyer_name` VARCHAR(255),
    `buyer_phone` VARCHAR(50),
    `buyer_address` TEXT,
    `processed_by` VARCHAR(255),
    `user_id` INT,
    CONSTRAINT `fk_sale_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- 5. Sale Items Table (The individual items in a sale)
CREATE TABLE IF NOT EXISTS `sale_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10, 2) NOT NULL, -- Price at the moment of sale
    `subtotal` DECIMAL(10, 2) NOT NULL,
    CONSTRAINT `fk_item_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
);

-- 6. Expenses Table
CREATE TABLE IF NOT EXISTS `expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `description` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `expense_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Price Notes Table
CREATE TABLE IF NOT EXISTS `price_notes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `item_name` VARCHAR(255) UNIQUE NOT NULL,
    `min_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `max_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Optional: Indices for faster searching
CREATE INDEX `idx_product_type` ON `products` (`type`);
CREATE INDEX `idx_sale_date` ON `sales` (`sale_date`);
