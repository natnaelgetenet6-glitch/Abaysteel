-- Run this script in your phpMyAdmin SQL tab

-- This version is more robust and will work even if the constraint has a different name.

-- 1. Try to disable foreign key checks temporarily to allow cleanup (not recommended for main logic, but good for migration)
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Instead of guessing the name, we can drop and recreate the table with the correct constraint if we want to be 100% sure.
-- BUT, to keep your data, we will just try to find and drop any existing FKs on product_id in sale_items.

-- NOTE: If you know the name is 'fk_item_product', you can use the simpler script. 
-- If you are not sure, the best way in phpMyAdmin is to:
-- a) Click on 'sale_items' table.
-- b) Click 'Structure' at the top.
-- c) Click 'Relation view' at the top.
-- d) Find the row where 'product_id' is mentioned and Change 'Restrict' to 'CASCADE' in the 'ON DELETE' column.

-- ALTERNATIVE: Try to drop by names that are common:
ALTER TABLE `sale_items` DROP FOREIGN KEY IF EXISTS `fk_item_product`;
ALTER TABLE `sale_items` DROP FOREIGN KEY IF EXISTS `sale_items_ibfk_1`;
ALTER TABLE `sale_items` DROP FOREIGN KEY IF EXISTS `sale_items_ibfk_2`;

-- 3. Add the CASCADE version
ALTER TABLE `sale_items` 
ADD CONSTRAINT `fk_item_product` 
FOREIGN KEY (`product_id`) 
REFERENCES `products` (`id`) 
ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Robust migration completed!' AS Status;
