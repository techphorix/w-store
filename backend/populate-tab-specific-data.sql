-- Populate Tab-Specific Data with Different Values
-- This script shows how each tab can have different metric values

-- First, let's update the existing records with different values for each period
-- This demonstrates how each tab can show different data

-- Update Today period with realistic daily values
UPDATE admin_overrides 
SET 
    period_specific_value = CASE 
        WHEN metric_name = 'orders_sold' THEN 150
        WHEN metric_name = 'total_sales' THEN 2500
        WHEN metric_name = 'profit_forecast' THEN 500
        WHEN metric_name = 'visitors' THEN 1200
        WHEN metric_name = 'shop_followers' THEN 100
        WHEN metric_name = 'shop_rating' THEN 4.2
        WHEN metric_name = 'credit_score' THEN 300
        ELSE period_specific_value
    END,
    updated_at = NOW()
WHERE metric_period = 'today';

-- Update Last 7 Days with weekly totals
UPDATE admin_overrides 
SET 
    period_specific_value = CASE 
        WHEN metric_name = 'orders_sold' THEN 850
        WHEN metric_name = 'total_sales' THEN 12500
        WHEN metric_name = 'profit_forecast' THEN 2500
        WHEN metric_name = 'visitors' THEN 8500
        WHEN metric_name = 'shop_followers' THEN 100
        WHEN metric_name = 'shop_rating' THEN 4.2
        WHEN metric_name = 'credit_score' THEN 300
        ELSE period_specific_value
    END,
    updated_at = NOW()
WHERE metric_period = 'last7days';

-- Update Last 30 Days with monthly totals
UPDATE admin_overrides 
SET 
    period_specific_value = CASE 
        WHEN metric_name = 'orders_sold' THEN 3200
        WHEN metric_name = 'total_sales' THEN 45000
        WHEN metric_name = 'profit_forecast' THEN 9000
        WHEN metric_name = 'visitors' THEN 28000
        WHEN metric_name = 'shop_followers' THEN 100
        WHEN metric_name = 'shop_rating' THEN 4.2
        WHEN metric_name = 'credit_score' THEN 300
        ELSE period_specific_value
    END,
    updated_at = NOW()
WHERE metric_period = 'last30days';

-- Update Total period (overall/all-time values)
UPDATE admin_overrides 
SET 
    period_specific_value = CASE 
        WHEN metric_name = 'orders_sold' THEN 12210
        WHEN metric_name = 'total_sales' THEN 12210
        WHEN metric_name = 'profit_forecast' THEN 21210
        WHEN metric_name = 'visitors' THEN 54540
        WHEN metric_name = 'shop_followers' THEN 100
        WHEN metric_name = 'shop_rating' THEN 4.2
        WHEN metric_name = 'credit_score' THEN 300
        ELSE period_specific_value
    END,
    updated_at = NOW()
WHERE metric_period = 'total';

-- Verify the different values for each period
SELECT 
    metric_name,
    metric_period,
    override_value,
    period_specific_value,
    CASE 
        WHEN metric_period = 'today' THEN '📅 Daily'
        WHEN metric_period = 'last7days' THEN '📊 Weekly'
        WHEN metric_period = 'last30days' THEN '📈 Monthly'
        WHEN metric_period = 'total' THEN '🏆 All-Time'
        ELSE metric_period
    END as period_label
FROM admin_overrides 
ORDER BY metric_name, 
    CASE metric_period
        WHEN 'today' THEN 1
        WHEN 'last7days' THEN 2
        WHEN 'last30days' THEN 3
        WHEN 'total' THEN 4
        ELSE 5
    END;

-- Show summary of what each tab will display
SELECT 
    'Dashboard Tab Summary' as info,
    '' as metric,
    '' as value
UNION ALL
SELECT 
    'Today Tab' as info,
    metric_name as metric,
    CONCAT(period_specific_value, ' (', 
        CASE 
            WHEN metric_name IN ('total_sales', 'profit_forecast') THEN '$'
            ELSE ''
        END,
        period_specific_value, ')'
    ) as value
FROM admin_overrides 
WHERE metric_period = 'today'
UNION ALL
SELECT 
    'Last 7 Days Tab' as info,
    metric_name as metric,
    CONCAT(period_specific_value, ' (', 
        CASE 
            WHEN metric_name IN ('total_sales', 'profit_forecast') THEN '$'
            ELSE ''
        END,
        period_specific_value, ')'
    ) as value
FROM admin_overrides 
WHERE metric_period = 'last7days'
UNION ALL
SELECT 
    'Last 30 Days Tab' as info,
    metric_name as metric,
    CONCAT(period_specific_value, ' (', 
        CASE 
            WHEN metric_name IN ('total_sales', 'profit_forecast') THEN '$'
            ELSE ''
        END,
        period_specific_value, ')'
    ) as value
FROM admin_overrides 
WHERE metric_period = 'last30days'
UNION ALL
SELECT 
    'Total Tab' as info,
    metric_name as metric,
    CONCAT(period_specific_value, ' (', 
        CASE 
            WHEN metric_name IN ('total_sales', 'profit_forecast') THEN '$'
            ELSE ''
        END,
        period_specific_value, ')'
    ) as value
FROM admin_overrides 
WHERE metric_period = 'total';
