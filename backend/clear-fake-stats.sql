-- Clear all fake stats from seller_fake_stats table
-- This will remove fake data but keep admin overrides intact

-- First, let's see what we're about to delete
SELECT 
    'BEFORE DELETION' as status,
    COUNT(*) as total_records,
    COUNT(DISTINCT seller_id) as unique_sellers,
    COUNT(DISTINCT timeframe) as timeframes_used
FROM seller_fake_stats;

-- Show sample of what will be deleted
SELECT 
    seller_id,
    timeframe,
    fake_orders,
    fake_sales,
    fake_visitors,
    fake_followers,
    fake_rating,
    fake_credit_score,
    created_at
FROM seller_fake_stats 
ORDER BY seller_id, timeframe
LIMIT 10;

-- Delete all fake stats
DELETE FROM seller_fake_stats;

-- Verify deletion
SELECT 
    'AFTER DELETION' as status,
    COUNT(*) as total_records,
    COUNT(DISTINCT seller_id) as unique_sellers,
    COUNT(DISTINCT timeframe) as timeframes_used
FROM seller_fake_stats;

-- Show that admin overrides are still intact
SELECT 
    'ADMIN OVERRIDES INTACT' as status,
    COUNT(*) as total_overrides,
    COUNT(DISTINCT seller_id) as unique_sellers,
    COUNT(DISTINCT metric_name) as metrics_affected
FROM admin_overrides;

-- Show sample of remaining admin overrides
SELECT 
    seller_id,
    metric_name,
    metric_period,
    override_value,
    period_specific_value,
    updated_at
FROM admin_overrides 
ORDER BY seller_id, metric_name, metric_period
LIMIT 10;
