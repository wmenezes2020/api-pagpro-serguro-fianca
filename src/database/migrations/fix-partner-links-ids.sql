-- Fix partner_links table: Fix empty IDs before TypeORM adds PRIMARY KEY
-- Run this SQL script manually in your MySQL database before starting the application

-- Option 1: Delete rows with empty or invalid IDs (RECOMMENDED - if data is not critical)
DELETE FROM `partner_links` WHERE `id` IS NULL OR `id` = '' OR TRIM(`id`) = '';

-- Option 2: If you need to preserve the data, uncomment these lines instead:
-- First, add id column as nullable if it doesn't exist (ignore error if it exists)
-- ALTER TABLE `partner_links` ADD COLUMN `id` CHAR(36) NULL;
-- Then update empty IDs with UUIDs
-- UPDATE `partner_links` SET `id` = UUID() WHERE `id` IS NULL OR `id` = '' OR TRIM(`id`) = '';
-- Finally, make it NOT NULL (TypeORM will add PRIMARY KEY)
-- ALTER TABLE `partner_links` MODIFY COLUMN `id` CHAR(36) NOT NULL;
