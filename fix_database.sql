-- Run this script in your phpMyAdmin SQL tab

-- 1. First, we drop the existing foreign key constraint if it exists.
ALTER TABLE `sale_items` DROP FOREIGN KEY `fk_item_product`;

-- 2. Now we add it back with ON DELETE CASCADE.
ALTER TABLE `sale_items` 
ADD CONSTRAINT `fk_item_product` 
FOREIGN KEY (`product_id`) 
REFERENCES `products` (`id`) 
ON DELETE CASCADE;

SELECT 'Migration completed successfully!' AS Status;
