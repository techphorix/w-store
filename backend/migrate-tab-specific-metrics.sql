-- Migration: Add Tab-Specific Metric Fields
-- This migration adds separate fields for each dashboard tab (Today, Last 7 Days, Last 30 Days, Total)

-- First, let's add the new tab-specific metric fields
ALTER TABLE admin_overrides 
ADD COLUMN metric_period VARCHAR(20) DEFAULT 'total' AFTER metric_name,
ADD COLUMN period_specific_value DECIMAL(15,2) DEFAULT NULL AFTER override_value;

-- Update existing records to have 'total' as the default period
UPDATE admin_overrides SET metric_period = 'total' WHERE metric_period IS NULL;

-- Create new tab-specific override records for existing metrics
-- This will create separate records for each time period

-- Today period overrides
INSERT INTO admin_overrides (id, seller_id, metric_name, metric_period, override_value, period_specific_value, original_value, created_at, updated_at)
SELECT 
    UUID() as id,
    seller_id,
    metric_name,
    'today' as metric_period,
    override_value,
    override_value as period_specific_value,
    original_value,
    NOW() as created_at,
    NOW() as updated_at
FROM admin_overrides 
WHERE metric_period = 'total';

-- Last 7 Days period overrides
INSERT INTO admin_overrides (id, seller_id, metric_name, metric_period, override_value, period_specific_value, original_value, created_at, updated_at)
SELECT 
    UUID() as id,
    seller_id,
    metric_name,
    'last7days' as metric_period,
    override_value,
    override_value as period_specific_value,
    original_value,
    NOW() as created_at,
    NOW() as updated_at
FROM admin_overrides 
WHERE metric_period = 'total';

-- Last 30 Days period overrides
INSERT INTO admin_overrides (id, seller_id, metric_name, metric_period, override_value, period_specific_value, original_value, created_at, updated_at)
SELECT 
    UUID() as id,
    seller_id,
    metric_name,
    'last30days' as metric_period,
    override_value,
    override_value as period_specific_value,
    original_value,
    NOW() as created_at,
    NOW() as updated_at
FROM admin_overrides 
WHERE metric_period = 'total';

-- Add unique constraint to prevent duplicate metric+period combinations for the same seller
ALTER TABLE admin_overrides 
DROP INDEX uniq_override,
ADD UNIQUE KEY uniq_override_period (seller_id, metric_name, metric_period);

-- Verify the new structure
SELECT 
    metric_name,
    metric_period,
    COUNT(*) as record_count,
    GROUP_CONCAT(override_value) as values
FROM admin_overrides 
GROUP BY metric_name, metric_period
ORDER BY metric_name, metric_period;

-- Show sample data for each period
SELECT 
    seller_id,
    metric_name,
    metric_period,
    override_value,
    period_specific_value,
    created_at
FROM admin_overrides 
ORDER BY metric_name, metric_period, created_at;
