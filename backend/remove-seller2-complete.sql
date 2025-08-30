-- Complete Removal of Seller 2 from All Tables
-- This script will remove seller ID: e2c5a8c4-5f6f-4878-91de-9c16f33f0693

-- Set the seller ID to remove
SET @seller_id_to_remove = 'e2c5a8c4-5f6f-4878-91de-9c16f33f0693';

-- Start transaction for safety
START TRANSACTION;

-- 1. Remove admin overrides for seller 2
SELECT 'Removing admin overrides for seller 2...' as action;
DELETE FROM admin_overrides WHERE seller_id = @seller_id_to_remove;
SELECT ROW_COUNT() as overrides_removed;

-- 2. Remove orders for seller 2 (if exists)
SELECT 'Removing orders for seller 2...' as action;
DELETE FROM orders WHERE seller_id = @seller_id_to_remove;
SELECT ROW_COUNT() as orders_removed;

-- 3. Remove products for seller 2 (if exists)
SELECT 'Removing products for seller 2...' as action;
DELETE FROM products WHERE seller_id = @seller_id_to_remove;
SELECT ROW_COUNT() as products_removed;

-- 4. Remove inventory for seller 2 (if exists)
SELECT 'Removing inventory for seller 2...' as action;
DELETE FROM inventory WHERE seller_id = @seller_id_to_remove;
SELECT ROW_COUNT() as inventory_removed;

-- 5. Remove seller analytics for seller 2 (if exists)
SELECT 'Removing seller analytics for seller 2...' as action;
DELETE FROM seller_analytics WHERE seller_id = @seller_id_to_remove;
SELECT ROW_COUNT() as analytics_removed;

-- 6. Remove seller settings for seller 2 (if exists)
SELECT 'Removing seller settings for seller 2...' as action;
DELETE FROM seller_settings WHERE seller_id = @seller_id_to_remove;
SELECT ROW_COUNT() as settings_removed;

-- 7. Remove seller notifications for seller 2 (if exists)
SELECT 'Removing seller notifications for seller 2...' as action;
DELETE FROM notifications WHERE user_id = @seller_id_to_remove;
SELECT ROW_COUNT() as notifications_removed;

-- 8. Remove seller sessions for seller 2 (if exists)
SELECT 'Removing seller sessions for seller 2...' as action;
DELETE FROM user_sessions WHERE user_id = @seller_id_to_remove;
SELECT ROW_COUNT() as sessions_removed;

-- 9. Remove the user account for seller 2
SELECT 'Removing user account for seller 2...' as action;
DELETE FROM users WHERE id = @seller_id_to_remove;
SELECT ROW_COUNT() as user_removed;

-- Verify removal
SELECT 'Verifying seller 2 removal...' as verification;
SELECT 
    'admin_overrides' as table_name,
    COUNT(*) as remaining_records
FROM admin_overrides 
WHERE seller_id = @seller_id_to_remove
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as remaining_records
FROM users 
WHERE id = @seller_id_to_remove;

-- Show remaining data for seller 1
SELECT 'Remaining data for seller 1:' as info;
SELECT 
    metric_name, 
    override_value,
    created_at
FROM admin_overrides 
WHERE seller_id = 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e' 
ORDER BY metric_name;

-- Commit the transaction
COMMIT;

SELECT 'Seller 2 removal completed successfully!' as result;
