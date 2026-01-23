-- SQL Script to seed users for Nat Steel Management
-- Use this in your phpMyAdmin SQL tab or MySQL terminal

-- First, ensure you are using the correct database
-- USE `abaystee_`; 

-- Insert Admin User
INSERT INTO `users` (`username`, `password`, `role`) 
VALUES ('abay', '321', 'admin')
ON DUPLICATE KEY UPDATE `password` = '321', `role` = 'admin';

-- Insert Shop/User
INSERT INTO `users` (`username`, `password`, `role`) 
VALUES ('user', '321', 'shop')
ON DUPLICATE KEY UPDATE `password` = '321', `role` = 'shop';
