const express = require('express');
const { query, validationResult, body } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireSeller, requireAdminOrSeller } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Simple rate limiting to prevent 429 errors
const rateLimit = new Map();
const WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

const rateLimiter = (req, res, next) => {
  const key = req.userId || req.ip;
  const now = Date.now();
  
  if (!rateLimit.has(key)) {
    rateLimit.set(key, { count: 1, resetTime: now + WINDOW_MS });
  } else {
    const userLimit = rateLimit.get(key);
    
    if (now > userLimit.resetTime) {
      // Reset window
      userLimit.count = 1;
      userLimit.resetTime = now + WINDOW_MS;
    } else if (userLimit.count >= MAX_REQUESTS) {
      // Rate limit exceeded
      return res.status(429).json({
        error: true,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    } else {
      userLimit.count++;
    }
  }
  
  next();
};

// Debug endpoint to test authentication
router.get('/debug/auth', authenticateToken, asyncHandler(async (req, res) => {
  console.log('🔍 Debug auth endpoint called:', {
    userId: req.userId,
    user: req.user,
    headers: req.headers,
    url: req.originalUrl
  });

  res.json({
    error: false,
    message: 'Authentication debug info',
    debug: {
      userId: req.userId,
      user: req.user,
      hasUser: !!req.user,
      userRole: req.user?.role,
      userStatus: req.user?.status,
      timestamp: new Date().toISOString()
    }
  });
}));

// Simple test endpoint for admin/seller access
router.get('/debug/access-test', authenticateToken, requireAdminOrSeller, asyncHandler(async (req, res) => {
  console.log('🔍 Access test endpoint called:', {
    userId: req.userId,
    user: req.user,
    url: req.originalUrl
  });

  res.json({
    error: false,
    message: 'Access test successful',
    debug: {
      userId: req.userId,
      user: req.user,
      userRole: req.user?.role,
      userStatus: req.user?.status,
      timestamp: new Date().toISOString()
    }
  });
}));

// Test endpoint for seller role validation
router.get('/debug/seller-test', authenticateToken, requireAdminOrSeller, asyncHandler(async (req, res) => {
  console.log('🔍 Seller test endpoint called:', {
    userId: req.userId,
    user: req.user,
    url: req.originalUrl
  });

  res.json({
    error: false,
    message: 'Seller role validation successful',
    debug: {
      userId: req.userId,
      user: req.user,
      userRole: req.user?.role,
      userStatus: req.user?.status,
      timestamp: new Date().toISOString()
    }
  });
}));

// Database connection test endpoint
router.get('/debug/db-test', authenticateToken, asyncHandler(async (req, res) => {
  try {
    console.log('🔍 Database test endpoint called');
    
    // Test a simple query
    const result = await executeQuery('SELECT 1 as test');
    console.log('✅ Database query successful:', result);
    
    // Test user lookup
    if (req.userId) {
      const user = await executeQuery(
        'SELECT id, email, full_name, role, status FROM users WHERE id = ?',
        [req.userId]
      );
      console.log('✅ User lookup successful:', user);
      
      res.json({
        error: false,
        message: 'Database connection test successful',
        debug: {
          dbTest: result,
          userLookup: user,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        error: false,
        message: 'Database connection test successful (no user)',
        debug: {
          dbTest: result,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      error: true,
      message: 'Database test failed',
      error: error.message
    });
  }
}));

// Apply rate limiting to all routes
router.use(rateLimiter);

// Get dashboard analytics
router.get('/dashboard', authenticateToken, [
  query('period').optional().isIn(['7', '30', '90']).withMessage('Period must be 7, 30, or 90 days')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { period = '7' } = req.query;
  const days = parseInt(period);

  let analytics;
  
  if (req.user.role === 'seller') {
    // Seller analytics
    analytics = await executeQuery(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as average_order_value,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(CASE WHEN p.stock_quantity <= p.low_stock_threshold THEN 1 END) as low_stock_products
      FROM users u
      LEFT JOIN orders o ON u.id = o.seller_id AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      LEFT JOIN products p ON u.id = p.created_by
      WHERE u.id = ?
    `, [days, req.userId]);
  } else if (req.user.role === 'seller') {
    // Seller analytics (same as above, but keeping for consistency)
    analytics = await executeQuery(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as average_order_value
      FROM orders o
      WHERE o.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [req.userId, days]);
  } else {
    // Admin analytics
    analytics = await executeQuery(`
      SELECT 
        COUNT(DISTINCT u.id) as new_users,
        COUNT(DISTINCT p.id) as new_products,
        COUNT(DISTINCT o.id) as new_orders,
        SUM(o.total_amount) as total_revenue
      FROM (
        SELECT DATE_SUB(NOW(), INTERVAL ? DAY) + INTERVAL n DAY as created_at
        FROM (
          SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION
          SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION
          SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
        ) numbers
        WHERE n < ?
      ) dates
      LEFT JOIN users u ON DATE(u.created_at) = dates.created_at
      LEFT JOIN products p ON DATE(p.created_at) = dates.created_at
      LEFT JOIN orders o ON DATE(o.created_at) = dates.created_at
    `, [days, days]);
  }

  res.json({
    error: false,
    analytics: analytics[0]
  });
}));

// Get financial analytics
router.get('/financial', authenticateToken, [
  query('period').optional().isIn(['7', '30', '90']).withMessage('Period must be 7, 30, or 90 days')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { period = '30' } = req.query;
  const days = parseInt(period);

  // Load persisted admin overrides so values always show until re-updated by admin
  const sellerId = req.userId;
  let adminOverrides = {};
  try {
    const overridesResult = await executeQuery(
      'SELECT metric_name, metric_period, period_specific_value, override_value FROM admin_overrides WHERE seller_id = ?',
      [sellerId]
    );
    overridesResult.forEach(override => {
      const periodKey = override.metric_period || 'total';
      const value = override.period_specific_value ?? override.override_value;
      if (!adminOverrides[periodKey]) adminOverrides[periodKey] = {};
      adminOverrides[periodKey][override.metric_name] = { value };
    });
  } catch (e) {
    logger.warn(`Failed to load admin overrides for seller ${sellerId}:`, e.message);
  }
  const overridePeriodKey = String(period) === '7'
    ? 'last7days'
    : (String(period) === '30' || String(period) === '90')
      ? 'last30days'
      : 'total';
  const applyOverride = (base, metricName) => {
    const bucket = adminOverrides[overridePeriodKey] || adminOverrides['total'];
    if (bucket && bucket[metricName] && bucket[metricName].value !== undefined && bucket[metricName].value !== null) {
      const v = parseFloat(bucket[metricName].value);
      return Number.isNaN(v) ? base : v;
    }
    return base;
  };

  let financialData;
  
  if (req.user.role === 'seller') {
    // Seller financial analytics
    financialData = await executeQuery(`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as daily_revenue,
        AVG(o.total_amount) as average_order_value
      FROM orders o
      WHERE o.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `, [req.userId, days]);

    // Note: Synthetic orders table removed - using only real orders data
  } else {
    // Admin financial analytics
    financialData = await executeQuery(`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as daily_revenue,
        AVG(o.total_amount) as average_order_value
      FROM orders o
      WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `, [days]);
  }

  res.json({
    error: false,
    financial: financialData
  });
}));

// Get product analytics
router.get('/products', authenticateToken, [
  query('period').optional().isIn(['7', '30', '90']).withMessage('Period must be 7, 30, or 90 days')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { period = '30' } = req.query;
  const days = parseInt(period);

  let productData;
  
  if (req.user.role === 'seller') {
    // Seller product analytics
    productData = await executeQuery(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(oi.id) as total_sold,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.unit_price) as average_price
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      WHERE p.created_by = ?
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `, [days, req.userId]);
  } else {
    // Admin product analytics
    productData = await executeQuery(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(oi.id) as total_sold,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.unit_price) as average_price
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `, [days]);
  }

  res.json({
    error: false,
    products: productData
  });
}));

// Get customer analytics
router.get('/customers', authenticateToken, [
  query('period').optional().isIn(['7', '30', '90']).withMessage('Period must be 7, 30, or 90 days')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { period = '30' } = req.query;
  const days = parseInt(period);

  let customerData;
  
  if (req.user.role === 'seller') {
    // Seller customer analytics
    customerData = await executeQuery(`
      SELECT 
        c.id,
        c.full_name,
        c.email,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as average_order_value,
        MAX(o.created_at) as last_order_date
      FROM users c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      WHERE o.seller_id = ?
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 10
    `, [days, req.userId]);
  } else {
    // Admin customer analytics
    customerData = await executeQuery(`
      SELECT 
        c.id,
        c.full_name,
        c.email,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as average_order_value,
        MAX(o.created_at) as last_order_date
      FROM users c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
              WHERE c.role = 'seller' AND c.role != 'admin'
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 10
    `, [days]);
  }

  res.json({
    error: false,
    customers: customerData
  });
}));

// Record analytics event
// Only sellers can record analytics and seller metrics must use their own ID
router.post('/record', authenticateToken, requireSeller, [
  body('entityType').notEmpty().withMessage('Entity type is required'),
  body('entityId').optional().isUUID().withMessage('Invalid entity ID'),
  body('metricPath').notEmpty().withMessage('Metric path is required'),
  body('value').optional().isFloat().withMessage('Value must be a number'),
  body('increment').optional().isInt({ min: 0 }).withMessage('Increment must be a non-negative integer')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { entityType, entityId, metricPath, value = 0, increment = 1 } = req.body;
  const today = new Date().toISOString().split('T')[0];

  // Enforce that seller analytics are always recorded against the authenticated seller
  let effectiveEntityId = entityId;
  if (entityType === 'seller') {
    // Safety: requireSeller middleware guarantees seller role
    // Always use the authenticated seller's ID to avoid saving under admin or arbitrary IDs
    effectiveEntityId = req.userId;
  }

  // Check if record exists for today
  const existingRecord = await executeQuery(
    'SELECT id FROM analytics WHERE entity_type = ? AND entity_id = ? AND metric_path = ? AND date = ?',
    [entityType, effectiveEntityId, metricPath, today]
  );

  if (existingRecord.length > 0) {
    // Update existing record
    await executeQuery(
      'UPDATE analytics SET value = value + ?, increment = increment + ?, updated_at = ? WHERE entity_type = ? AND entity_id = ? AND metric_path = ? AND date = ?',
      [value, increment, new Date(), entityType, effectiveEntityId, metricPath, today]
    );
  } else {
    // Create new record
    await executeQuery(
      'INSERT INTO analytics (id, entity_type, entity_id, metric_path, value, increment, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [require('uuid').v4(), entityType, effectiveEntityId, metricPath, value, increment, today, new Date()]
    );
  }

  res.json({
    error: false,
    message: 'Analytics recorded successfully'
  });
}));

// Helper function to get fake stats for a seller
async function getFakeStats(sellerId, timeframe) {
  try {
    // Map frontend timeframes to database timeframes
    let dbTimeframe = timeframe;
    if (timeframe === '7') dbTimeframe = '7days';
    else if (timeframe === '30') dbTimeframe = '30days';
    else if (timeframe === '90') dbTimeframe = '30days'; // Use 30days for 90 days period
    
    const fakeStats = await executeQuery(
      'SELECT * FROM seller_fake_stats WHERE seller_id = ? AND timeframe = ?',
      [sellerId, dbTimeframe]
    );
    
    if (fakeStats.length > 0) {
      const stats = fakeStats[0];
      return {
        orders: stats.fake_orders,
        sales: stats.fake_sales,
        revenue: stats.fake_revenue,
        products: stats.fake_products,
        customers: stats.fake_customers,
        visitors: stats.fake_visitors,
        followers: stats.fake_followers,
        rating: stats.fake_rating,
        creditScore: stats.fake_credit_score
      };
    }
    return null;
  } catch (error) {
    logger.error('Error fetching fake stats:', error);
    return null;
  }
}

// Get seller's own analytics (including admin-edited ones)
router.get('/seller', authenticateToken, requireAdminOrSeller, [
  query('period').optional().isIn(['7', '30', '90']).withMessage('Period must be 7, 30, or 90 days')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Role validation is now handled by requireAdminOrSeller middleware
  console.log('✅ Role validation passed for seller analytics');

  const { period = '30' } = req.query;
  const days = parseInt(period);

  try {
    // First, check if there are fake stats in the database for the requested period
    let fakeStats = null;
    try {
      fakeStats = await getFakeStats(req.userId, period);
      if (fakeStats) {
        logger.info(`✅ Found fake stats for seller ${req.userId} for period ${period}:`, fakeStats);
      }
    } catch (error) {
      logger.warn(`Failed to fetch fake stats for seller ${req.userId} for period ${period}:`, error.message);
    }

    // Check business_info for legacy admin-edited analytics
    const businessInfo = await executeQuery(
      'SELECT business_info FROM users WHERE id = ?',
      [req.userId]
    );

    logger.info(`🔍 Checking business_info for seller ${req.userId}:`, {
      hasBusinessInfo: !!businessInfo[0]?.business_info,
      businessInfoType: typeof businessInfo[0]?.business_info,
      businessInfoRaw: businessInfo[0]?.business_info
    });

    let adminEditedAnalytics = null;
    let auditTrail = null;
    
    try {
      if (businessInfo[0]?.business_info && businessInfo[0].business_info !== '[object Object]') {
        const parsed = JSON.parse(businessInfo[0].business_info);
        logger.info(`📊 Parsed business_info:`, parsed);
        
        if (parsed.analytics) {
          adminEditedAnalytics = parsed.analytics;
          auditTrail = parsed.auditTrail || [];
          logger.info(`✅ Found admin-edited analytics:`, adminEditedAnalytics);
        } else {
          logger.info(`❌ No analytics found in business_info`);
        }
      } else {
        logger.info(`❌ No business_info or invalid format`);
      }
    } catch (e) {
      // If parsing fails, continue with calculated analytics
      logger.warn(`Failed to parse business_info for seller ${req.userId}:`, e.message);
    }

    // Get calculated analytics from database tables
    const calculatedAnalytics = await executeQuery(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as average_order_value,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
      FROM users u
      LEFT JOIN orders o ON u.id = o.seller_id AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      LEFT JOIN products p ON u.id = p.created_by
      WHERE u.id = ?
    `, [days, req.userId]);

    // Guard: if no row is returned (e.g., seller not found), use zeroed defaults
    const calcRow = (calculatedAnalytics && calculatedAnalytics.length > 0)
      ? calculatedAnalytics[0]
      : {
          total_orders: 0,
          total_revenue: 0,
          average_order_value: 0,
          completed_orders: 0,
          cancelled_orders: 0,
          total_products: 0,
          active_products: 0
        };

    // Prepare the final analytics response
    // Priority: Fake stats > Admin-edited analytics > Calculated analytics
    let finalAnalytics;
    
    if (fakeStats) {
      // Use fake stats from database
      finalAnalytics = {
        totalSales: fakeStats.sales || 0,
        totalOrders: fakeStats.orders || 0,
        totalProducts: fakeStats.products || 0,
        totalCustomers: fakeStats.customers || 0,
        totalVisitors: fakeStats.visitors || 0,
        shopFollowers: fakeStats.followers || 0,
        shopRating: fakeStats.rating || 0,
        creditScore: fakeStats.creditScore || 0,
        averageOrderValue: calcRow.average_order_value || 0,
        conversionRate: 0,
        customerSatisfaction: fakeStats.rating || 0,
        monthlyGrowth: 0
      };
      logger.info(`📊 Using fake stats for seller ${req.userId} for period ${period}`);
    } else if (adminEditedAnalytics) {
      // Fallback to legacy admin-edited analytics
      finalAnalytics = adminEditedAnalytics;
      logger.info(`📊 Using legacy admin-edited analytics for seller ${req.userId}`);
    } else {
      // Use calculated analytics
      finalAnalytics = {
        totalSales: calcRow.total_revenue || 0,
        totalOrders: calcRow.total_orders || 0,
        totalProducts: calcRow.total_products || 0,
        totalCustomers: 0,
        totalVisitors: 0,
        shopFollowers: 0,
        shopRating: 4.5,
        creditScore: 750,
        averageOrderValue: calcRow.average_order_value || 0,
        conversionRate: 0,
        customerSatisfaction: 0,
        monthlyGrowth: 0
      };
      logger.info(`📊 Using calculated analytics for seller ${req.userId}`);
    }

    // Apply admin overrides to the final analytics snapshot so they persist visually
    if (finalAnalytics) {
      const mappings = [
        ['totalOrders', 'orders_sold'],
        ['totalSales', 'total_sales'],
        ['totalCustomers', 'total_customers'],
        ['totalVisitors', 'visitors'],
        ['shopFollowers', 'shop_followers'],
        ['shopRating', 'shop_rating'],
        ['creditScore', 'credit_score']
      ];
      mappings.forEach(([field, metric]) => {
        if (Object.prototype.hasOwnProperty.call(finalAnalytics, field)) {
          finalAnalytics[field] = applyOverride(finalAnalytics[field], metric);
        }
      });
    }

    const response = {
      error: false,
      analytics: {
        period: period,
        days: days,
        stats: finalAnalytics,
        calculatedStats: calcRow, // Include calculated stats for comparison
        adminEdited: !!adminEditedAnalytics, // Flag indicating if admin-edited analytics exist
        fakeStats: !!fakeStats, // Flag indicating if fake stats exist
        hasAdminOverrides: Object.keys(adminOverrides).length > 0,
        dataSource: fakeStats ? 'fake-stats-db' : (adminEditedAnalytics ? 'admin-edited-legacy' : 'calculated'),
        auditTrail: auditTrail || [], // Include audit trail if available
        source: adminEditedAnalytics ? 'admin-edited' : 'calculated'
      }
    };

    logger.info(`📤 Sending analytics response for seller ${req.userId}:`, {
      adminEdited: response.analytics.adminEdited,
      source: response.analytics.source,
      statsKeys: Object.keys(response.analytics.stats)
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching seller analytics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch seller analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get seller dashboard data for all timeframes (including fake data)
router.get('/seller/dashboard', authenticateToken, requireAdminOrSeller, asyncHandler(async (req, res) => {
  // Role validation is now handled by requireAdminOrSeller middleware
  console.log('✅ Role validation passed for seller dashboard');

  try {
    const sellerId = req.userId;
    const timeframes = ['today', '7days', '30days', 'total'];
    const dashboardData = {};

    // Check for admin overrides first - fetch all overrides for this seller
    let adminOverrides = {};
    try {
      const overridesResult = await executeQuery(
        'SELECT metric_name, metric_period, period_specific_value, override_value FROM admin_overrides WHERE seller_id = ?',
        [sellerId]
      );
      
      // Group overrides by period and metric
      overridesResult.forEach(override => {
        const period = override.metric_period || 'total';
        const value = override.period_specific_value || override.override_value;
        
        if (!adminOverrides[period]) {
          adminOverrides[period] = {};
        }
        
        adminOverrides[period][override.metric_name] = {
          value: value
        };
      });
      
      if (Object.keys(adminOverrides).length > 0) {
        logger.info(`✅ Found ${Object.keys(adminOverrides).length} admin overrides for seller ${sellerId}`);
      }
    } catch (error) {
      logger.warn(`Failed to fetch admin overrides for seller ${sellerId}:`, error.message);
    }

    for (const timeframe of timeframes) {
      try {
        // Check for fake stats first
        let fakeStats = null;
        try {
          const fakeStatsResult = await executeQuery(
            'SELECT * FROM seller_fake_stats WHERE seller_id = ? AND timeframe = ?',
            [sellerId, timeframe]
          );
          
          if (fakeStatsResult.length > 0) {
            const statsData = fakeStatsResult[0];
            fakeStats = {
              orders: statsData.fake_orders,
              sales: statsData.fake_sales,
              revenue: statsData.fake_revenue,
              products: statsData.fake_products,
              customers: statsData.fake_customers,
              visitors: statsData.fake_visitors,
              followers: statsData.fake_followers,
              rating: statsData.fake_rating,
              creditScore: statsData.fake_credit_score
            };
            logger.info(`✅ Found fake stats for seller ${sellerId}, timeframe: ${timeframe}`);
          }
        } catch (error) {
          logger.warn(`Failed to fetch fake stats for seller ${sellerId}, timeframe: ${timeframe}:`, error.message);
        }

        if (fakeStats) {
          // Use fake stats
          dashboardData[timeframe] = {
            orders: fakeStats.orders || 0,
            sales: fakeStats.sales || 0,
            revenue: fakeStats.revenue || 0,
            products: fakeStats.products || 0,
            customers: fakeStats.customers || 0,
            visitors: fakeStats.visitors || 0,
            followers: fakeStats.followers || 0,
            rating: fakeStats.rating || 0,
            creditScore: fakeStats.creditScore || 0,
            source: 'fake-stats',
            hasFakeData: true
          };
        } else {
          // Calculate real stats based on timeframe
          let days = 0;
          if (timeframe === 'today') days = 1;
          else if (timeframe === '7days') days = 7;
          else if (timeframe === '30days') days = 30;
          else if (timeframe === 'total') days = 365; // Use 1 year for total

          const timeCondOrders = timeframe === 'today'
            ? 'AND DATE(o.created_at) = CURDATE()'
            : timeframe === '7days'
            ? 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
            : timeframe === '30days'
            ? 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
            : 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';

          const calculatedStats = await executeQuery(`
            SELECT 
              COALESCE(oagg.orders_count,0) as total_orders,
              COALESCE(oagg.revenue,0) as total_revenue,
              CASE WHEN COALESCE(oagg.orders_count,0) > 0 
                   THEN COALESCE(oagg.revenue,0) / COALESCE(oagg.orders_count,0)
                   ELSE 0 END as average_order_value,
              COALESCE(pagg.total_products,0) as total_products,
              COALESCE(pagg.active_products,0) as active_products
            FROM (
              SELECT COUNT(*) as orders_count, COALESCE(SUM(total_amount),0) as revenue
              FROM orders o
              WHERE o.seller_id = ? ${timeCondOrders}
            ) oagg
            CROSS JOIN (
              SELECT COUNT(DISTINCT p.id) as total_products,
                     COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
              FROM products p
              WHERE p.created_by = ?
            ) pagg
          `, [sellerId, sellerId]);

          dashboardData[timeframe] = {
            orders: calculatedStats[0].total_orders || 0,
            sales: calculatedStats[0].total_revenue || 0,
            revenue: calculatedStats[0].total_revenue || 0,
            products: calculatedStats[0].total_products || 0,
            customers: 0, // Would need separate calculation
            visitors: 0, // Would need separate calculation
            followers: 0, // Would need separate calculation
            rating: 4.5, // Default rating
            creditScore: 750, // Default credit score
            source: 'calculated',
            hasFakeData: false
          };
        }
      } catch (error) {
        logger.error(`Error fetching stats for timeframe ${timeframe}:`, error);
        dashboardData[timeframe] = {
          orders: 0,
          sales: 0,
          revenue: 0,
          products: 0,
          customers: 0,
          visitors: 0,
          followers: 0,
          rating: 0,
          creditScore: 0,
          source: 'error',
          hasFakeData: false,
          error: error.message
        };
      }
    }

    // Also get overall stats for the dashboard
    const overallStats = await executeQuery(`
      SELECT 
        COALESCE(oagg.orders_count,0) as total_orders,
        COALESCE(oagg.revenue,0) as total_revenue,
        CASE WHEN COALESCE(oagg.orders_count,0) > 0 
             THEN COALESCE(oagg.revenue,0) / COALESCE(oagg.orders_count,0)
             ELSE 0 END as average_order_value,
        COALESCE(pagg.total_products,0) as total_products
      FROM (
        SELECT COUNT(*) as orders_count, COALESCE(SUM(total_amount),0) as revenue
        FROM orders o
        WHERE o.seller_id = ?
      ) oagg
      CROSS JOIN (
        SELECT COUNT(DISTINCT p.id) as total_products
        FROM products p
        WHERE p.created_by = ?
      ) pagg
    `, [sellerId, sellerId]);

    // Guard: ensure we have a row to read from
    const overallRow = (overallStats && overallStats.length > 0)
      ? overallStats[0]
      : {
          total_orders: 0,
          total_revenue: 0,
          average_order_value: 0,
          total_products: 0
        };

    // Helper function to apply admin overrides to any value
    const applyOverrides = (data, metricName, period = 'total') => {
      if (adminOverrides[period] && adminOverrides[period][metricName]) {
        return parseFloat(adminOverrides[period][metricName].value);
      }
      return data;
    };

    // Apply overrides to timeframe-specific data
    const applyTimeframeOverrides = (timeframeData, timeframe) => {
      if (!timeframeData) return timeframeData;
      
      // Map timeframe to period key for overrides
      const periodKey = timeframe === 'today' ? 'today' : 
                       timeframe === '7days' ? 'last7days' : 
                       timeframe === '30days' ? 'last30days' : 'total';
      
      return {
        ...timeframeData,
        orders: applyOverrides(timeframeData.orders, 'orders_sold', periodKey),
        sales: applyOverrides(timeframeData.sales, 'total_sales', periodKey),
        revenue: applyOverrides(timeframeData.revenue, 'total_sales', periodKey),
        products: timeframeData.products,
        customers: applyOverrides(timeframeData.customers, 'total_customers', periodKey),
        visitors: applyOverrides(timeframeData.visitors, 'visitors', periodKey),
        followers: applyOverrides(timeframeData.followers, 'shop_followers', periodKey),
        rating: applyOverrides(timeframeData.rating, 'shop_rating', periodKey),
        creditScore: applyOverrides(timeframeData.creditScore, 'credit_score', periodKey)
      };
    };

    // Apply admin overrides to overall stats
    const applyOverallOverrides = (overallData) => {
      return {
        ...overallData,
        totalSales: applyOverrides(overallData.totalSales, 'total_sales', 'total'),
        totalOrders: applyOverrides(overallData.totalOrders, 'orders_sold', 'total'),
        totalProducts: overallData.totalProducts,
        averageOrderValue: overallData.averageOrderValue,
        profitForecast: applyOverrides(0, 'profit_forecast', 'total'),
        visitors: applyOverrides(0, 'visitors', 'total'),
        followers: applyOverrides(0, 'shop_followers', 'total'),
        rating: applyOverrides(4.5, 'shop_rating', 'total'),
        creditScore: applyOverrides(750, 'credit_score', 'total')
      };
    };

    // Return the data in the structure the frontend expects with individual metric values
    const response = {
      error: false,
      // Return timeframes directly in root for easy access with overrides applied
      today: applyTimeframeOverrides(dashboardData.today, 'today'),
      '7days': applyTimeframeOverrides(dashboardData['7days'], '7days'),
      '30days': applyTimeframeOverrides(dashboardData['30days'], '30days'),
      // Overall stats with overrides applied
      overall: applyOverallOverrides({
        totalSales: overallRow.total_revenue || 0,
        totalOrders: overallRow.total_orders || 0,
        totalProducts: overallRow.total_products || 0,
        averageOrderValue: overallRow.average_order_value || 0
      }),
      // Core metrics that can be overridden (mapped to frontend expectations)
      total: {
        orders: applyOverrides(overallRow.total_orders || 0, 'orders_sold', 'total'),
        sales: applyOverrides(overallRow.total_revenue || 0, 'total_sales', 'total'),
        revenue: applyOverrides(overallRow.total_revenue || 0, 'total_sales', 'total'),
        products: overallRow.total_products || 0,
        customers: applyOverrides(0, 'total_customers', 'total'),
        visitors: applyOverrides(0, 'visitors', 'total'),
        followers: applyOverrides(0, 'shop_followers', 'total'),
        rating: applyOverrides(4.5, 'shop_rating', 'total'),
        creditScore: applyOverrides(750, 'credit_score', 'total')
      },
      // Individual metric values for each period (for frontend to use directly)
      metrics: {
        orders_sold: {
          today: applyOverrides(dashboardData.today?.orders || 0, 'orders_sold', 'today'),
          last7days: applyOverrides(dashboardData['7days']?.orders || 0, 'orders_sold', 'last7days'),
          last30days: applyOverrides(dashboardData['30days']?.orders || 0, 'orders_sold', 'last30days'),
          total: applyOverrides(overallRow.total_orders || 0, 'orders_sold', 'total')
        },
        total_sales: {
          today: applyOverrides(dashboardData.today?.sales || 0, 'total_sales', 'today'),
          last7days: applyOverrides(dashboardData['7days']?.sales || 0, 'total_sales', 'last7days'),
          last30days: applyOverrides(dashboardData['30days']?.sales || 0, 'total_sales', 'last30days'),
          total: applyOverrides(overallRow.total_revenue || 0, 'total_sales', 'total')
        },
        profit_forecast: {
          today: applyOverrides(0, 'profit_forecast', 'today'),
          last7days: applyOverrides(0, 'profit_forecast', 'last7days'),
          last30days: applyOverrides(0, 'profit_forecast', 'last30days'),
          total: applyOverrides(0, 'profit_forecast', 'total')
        },
        visitors: {
          today: applyOverrides(dashboardData.today?.visitors || 0, 'visitors', 'today'),
          last7days: applyOverrides(dashboardData['7days']?.visitors || 0, 'visitors', 'last7days'),
          last30days: applyOverrides(dashboardData['30days']?.visitors || 0, 'visitors', 'last30days'),
          total: applyOverrides(0, 'visitors', 'total')
        },
        shop_followers: {
          today: applyOverrides(dashboardData.today?.followers || 0, 'shop_followers', 'today'),
          last7days: applyOverrides(dashboardData['7days']?.followers || 0, 'shop_followers', 'last7days'),
          last30days: applyOverrides(dashboardData['30days']?.followers || 0, 'shop_followers', 'last30days'),
          total: applyOverrides(0, 'shop_followers', 'total')
        },
        shop_rating: {
          today: applyOverrides(dashboardData.today?.rating || 0, 'shop_rating', 'today'),
          last7days: applyOverrides(dashboardData['7days']?.rating || 0, 'shop_rating', 'last7days'),
          last30days: applyOverrides(dashboardData['30days']?.rating || 0, 'shop_rating', 'last30days'),
          total: applyOverrides(4.5, 'shop_rating', 'total')
        },
        credit_score: {
          today: applyOverrides(dashboardData.today?.creditScore || 0, 'credit_score', 'today'),
          last7days: applyOverrides(dashboardData['7days']?.creditScore || 0, 'credit_score', 'last7days'),
          last30days: applyOverrides(dashboardData['30days']?.creditScore || 0, 'credit_score', 'last30days'),
          total: applyOverrides(750, 'credit_score', 'total')
        },
        total_customers: {
          today: applyOverrides(dashboardData.today?.customers || 0, 'total_customers', 'today'),
          last7days: applyOverrides(dashboardData['7days']?.customers || 0, 'total_customers', 'last7days'),
          last30days: applyOverrides(dashboardData['30days']?.customers || 0, 'total_customers', 'last30days'),
          total: applyOverrides(0, 'total_customers', 'total')
        }
      },
      // Enhanced metadata with override information
      hasFakeData: Object.values(dashboardData).some(tf => tf.hasFakeData),
      hasAdminOverrides: Object.keys(adminOverrides).length > 0,
      adminOverrides: Object.keys(adminOverrides).length > 0 ? adminOverrides : undefined,
      overrideSummary: {
        totalOverrides: Object.keys(adminOverrides).length,
        periodsWithOverrides: Object.keys(adminOverrides).filter(period => 
          Object.keys(adminOverrides[period]).length > 0
        ),
        metricsWithOverrides: Object.keys(adminOverrides).flatMap(period => 
          Object.keys(adminOverrides[period])
        ).filter((metric, index, arr) => arr.indexOf(metric) === index)
      },
      timestamp: new Date().toISOString()
    };

    logger.info(`📤 Sending dashboard data for seller ${sellerId}:`, {
      timeframes: Object.keys(dashboardData),
      hasFakeData: response.hasFakeData,
      hasAdminOverrides: response.hasAdminOverrides
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching seller dashboard data:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch seller dashboard data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get seller dashboard data by seller ID (for admin impersonation)
router.get('/seller/dashboard/:sellerId', authenticateToken, requireAdminOrSeller, asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    // Validate seller exists
    const seller = await executeQuery(
      'SELECT id, full_name, email, role FROM users WHERE id = ? AND role = "seller" AND role != "admin"',
      [sellerId]
    );

    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Check for admin overrides
    let adminOverrides = {};
    try {
      const overridesResult = await executeQuery(
        'SELECT metric_name, metric_period, period_specific_value, override_value FROM admin_overrides WHERE seller_id = ?',
        [sellerId]
      );
      
      overridesResult.forEach(override => {
        const period = override.metric_period || 'total';
        const value = override.period_specific_value ?? override.override_value;
        if (!adminOverrides[period]) {
          adminOverrides[period] = {};
        }
        adminOverrides[period][override.metric_name] = { value };
      });
      
      if (Object.keys(adminOverrides).length > 0) {
        logger.info(`✅ Found ${Object.keys(adminOverrides).length} admin overrides for seller ${sellerId}`);
      }
    } catch (error) {
      logger.warn(`Failed to fetch admin overrides for seller ${sellerId}:`, error.message);
    }

    // Get overall stats for the seller
    const overallStats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as average_order_value,
        COUNT(DISTINCT p.id) as total_products
      FROM users u
      LEFT JOIN orders o ON u.id = o.seller_id
      LEFT JOIN products p ON u.id = p.created_by
      WHERE u.id = ?
    `, [sellerId]);

    // Get timeframe-specific stats
    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayStats = await executeQuery(`
      SELECT 
        COALESCE(oagg.cnt,0) as orders,
        COALESCE(oagg.sum_amt,0) as sales
      FROM (
        SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as sum_amt
        FROM orders WHERE seller_id = ? AND DATE(created_at) = CURDATE()
      ) oagg
    `, [sellerId]);

    const last7DaysStats = await executeQuery(`
      SELECT 
        COALESCE(oagg.cnt,0) as orders,
        COALESCE(oagg.sum_amt,0) as sales
      FROM (
        SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as sum_amt
        FROM orders WHERE seller_id = ? AND created_at >= ?
      ) oagg
    `, [sellerId, last7Days]);

    const last30DaysStats = await executeQuery(`
      SELECT 
        COALESCE(oagg.cnt,0) as orders,
        COALESCE(oagg.sum_amt,0) as sales
      FROM (
        SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as sum_amt
        FROM orders WHERE seller_id = ? AND created_at >= ?
      ) oagg
    `, [sellerId, last30Days]);

    // Apply admin overrides to the response
    const applyOverrides = (data, metricName, period = 'total') => {
      if (adminOverrides[period] && adminOverrides[period][metricName]) {
        return parseFloat(adminOverrides[period][metricName].value);
      }
      return data;
    };

    // Return the data in the structure the frontend expects
    const response = {
      error: false,
      seller: seller[0],
      hasAdminOverrides: Object.keys(adminOverrides).length > 0,
      adminOverrides: Object.keys(adminOverrides).length > 0 ? adminOverrides : undefined,
      overall: {
        totalSales: applyOverrides(overallStats[0]?.total_revenue || 0, 'total_sales', 'total'),
        totalOrders: applyOverrides(overallStats[0]?.total_orders || 0, 'orders_sold', 'total'),
        totalProducts: overallStats[0]?.total_products || 0,
        averageOrderValue: overallStats[0]?.average_order_value || 0
      },
      today: {
        sales: applyOverrides(todayStats[0]?.sales || 0, 'total_sales', 'today'),
        orders: applyOverrides(todayStats[0]?.orders || 0, 'orders_sold', 'today')
      },
      '7days': {
        sales: applyOverrides(last7DaysStats[0]?.sales || 0, 'total_sales', 'last7days'),
        orders: applyOverrides(last7DaysStats[0]?.orders || 0, 'orders_sold', 'last7days')
      },
      '30days': {
        sales: applyOverrides(last30DaysStats[0]?.sales || 0, 'total_sales', 'last30days'),
        orders: applyOverrides(last30DaysStats[0]?.orders || 0, 'orders_sold', 'last30days')
      },
      total: {
        orders: applyOverrides(overallStats[0]?.total_orders || 0, 'orders_sold', 'total'),
        sales: applyOverrides(overallStats[0]?.total_revenue || 0, 'total_sales', 'total'),
        revenue: applyOverrides(overallStats[0]?.total_revenue || 0, 'total_sales', 'total'),
        products: overallStats[0]?.total_products || 0,
        customers: 0,
        visitors: applyOverrides(0, 'visitors', 'total'),
        followers: applyOverrides(0, 'shop_followers', 'total'),
        rating: applyOverrides(4.5, 'shop_rating', 'total'),
        creditScore: applyOverrides(750, 'credit_score', 'total')
      },
      timestamp: new Date().toISOString()
    };

    logger.info(`📤 Sending dashboard data for seller ${sellerId} (admin access):`, {
      hasAdminOverrides: response.hasAdminOverrides
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching seller dashboard data by ID:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch seller dashboard data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

module.exports = router;
