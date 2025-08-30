-- Remove Seller 2 and All Associated Data
-- This script will remove seller ID: e2c5a8c4-5f6f-4878-91de-9c16f33f0693

-- First, let's see what data exists for seller 2
SELECT 'Checking admin_overrides for seller 2' as info;
SELECT COUNT(*) as override_count FROM admin_overrides WHERE seller_id = 'e2c5a8c4-5f6f-4878-91de-9c16f33f0693';

-- Remove admin overrides for seller 2
DELETE FROM admin_overrides WHERE seller_id = 'e2c5a8c4-5f6f-4878-91de-9c16f33f0693';

-- Check if there are any other tables that might reference this seller
-- (You can uncomment these if you want to check other tables)

-- SELECT 'Checking users table for seller 2' as info;
-- SELECT id, email, role FROM users WHERE id = 'e2c5a8c4-5f6f-4878-91de-9c16f33f0693';

-- SELECT 'Checking orders table for seller 2' as info;
-- SELECT COUNT(*) as order_count FROM orders WHERE seller_id = 'e2c5a8c4-5f6f-4878-91de-9c16f33f0693';

-- SELECT 'Checking products table for seller 2' as info;
-- SELECT COUNT(*) as product_count FROM products WHERE seller_id = 'e2c5a8c4-5f6f-4878-91de-9c16f33f0693';

-- Verify seller 2 is removed from admin_overrides
SELECT 'Verifying seller 2 removal from admin_overrides' as info;
SELECT COUNT(*) as remaining_overrides FROM admin_overrides WHERE seller_id = 'e2c5a8c4-5f6f-4878-91de-9c16f33f0693';

-- Show remaining data for seller 1
SELECT 'Remaining data for seller 1' as info;
SELECT metric_name, override_value FROM admin_overrides WHERE seller_id = 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e' ORDER BY metric_name;
