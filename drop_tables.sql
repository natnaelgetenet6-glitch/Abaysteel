-- 1. Remove foreign key constraint from sales table first
ALTER TABLE `sales` DROP FOREIGN KEY IF EXISTS `fk_sale_site`;

-- 2. Drop the exchange rates table
DROP TABLE IF EXISTS `exchange_rates`;

-- 3. Drop the construction related tables
DROP TABLE IF EXISTS `construction_sites`;
DROP TABLE IF EXISTS `construction`;
