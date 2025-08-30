-- Recreate Admin Overrides Rows
-- Run this script directly in your MySQL database

-- First, clear any existing overrides for the seller
DELETE FROM admin_overrides WHERE seller_id = 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e';

-- Insert the admin overrides with the values that were working before
INSERT INTO admin_overrides (
    id, 
    seller_id, 
    metric_name, 
    override_value, 
    original_value, 
    created_at, 
    updated_at
) VALUES 
    (UUID(), 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e', 'orders_sold', 110.00, 0.00, NOW(), NOW()),
    (UUID(), 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e', 'total_sales', 1110.00, 0.00, NOW(), NOW()),
    (UUID(), 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e', 'profit_forecast', 111140.00, 0.00, NOW(), NOW()),
    (UUID(), 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e', 'visitors', 445420.00, 0.00, NOW(), NOW()),
    (UUID(), 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e', 'shop_followers', 100.00, 0.00, NOW(), NOW()),
    (UUID(), 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e', 'shop_rating', 4.20, 0.00, NOW(), NOW()),
    (UUID(), 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e', 'credit_score', 300.00, 0.00, NOW(), NOW());

-- Verify the inserts
SELECT 
    metric_name, 
    override_value, 
    created_at 
FROM admin_overrides 
WHERE seller_id = 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e' 
ORDER BY metric_name;
