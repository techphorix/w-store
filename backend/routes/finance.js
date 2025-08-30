const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get finance dashboard
router.get('/dashboard', authenticateToken, asyncHandler(async (req, res) => {
  let dashboard;
  
  if (req.user.role === 'seller') {
    // Seller finance dashboard
    dashboard = await executeQuery(`
      SELECT 
        SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN o.status IN ('pending', 'confirmed', 'processing', 'shipped') THEN o.total_amount ELSE 0 END) as pending_revenue,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN o.status IN ('pending', 'confirmed', 'processing', 'shipped') THEN 1 END) as pending_orders,
        AVG(CASE WHEN o.status = 'delivered' THEN o.total_amount END) as average_order_value
      FROM orders o
      WHERE o.seller_id = ?
    `, [req.userId]);
  } else {
    // Customer finance dashboard
    dashboard = await executeQuery(`
      SELECT 
        SUM(o.total_amount) as total_spent,
        COUNT(o.id) as total_orders,
        AVG(o.total_amount) as average_order_value,
        SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as completed_spent,
        SUM(CASE WHEN o.status IN ('pending', 'confirmed', 'processing', 'shipped') THEN o.total_amount ELSE 0 END) as pending_spent
      FROM orders o
      WHERE o.customer_id = ?
    `, [req.userId]);
  }

  res.json({
    error: false,
    dashboard: dashboard[0]
  });
}));

// Get transactions
router.get('/transactions', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('type').optional().isIn(['sale', 'refund', 'payout', 'fee', 'adjustment']).withMessage('Invalid transaction type')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { page = 1, limit = 20, type, startDate, endDate, status } = req.query;
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;

  let whereClause = 'user_id = ?';
  const params = [req.userId];

  if (type) {
    whereClause += ' AND type = ?';
    params.push(type);
  }

  const transactions = await executeQuery(`
    SELECT id, type, amount, currency, description, reference_id, status, 
           created_at, completed_at
    FROM financial_transactions
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count
  const countResult = await executeQuery(
    `SELECT COUNT(*) as total FROM financial_transactions WHERE ${whereClause}`,
    params
  );

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / parsedLimit);

  res.json({
    error: false,
    transactions,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages
    }
  });
}));

// Update payout info
router.post('/payout-info', authenticateToken, [
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('routingNumber').notEmpty().withMessage('Routing number is required'),
  body('accountHolderName').notEmpty().withMessage('Account holder name is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { bankName, accountNumber, routingNumber, accountHolderName, paymentMethod } = req.body;

  // Update user's payout info in business_info
  const payoutInfo = {
    bankName,
    accountNumber,
    routingNumber,
    accountHolderName,
    paymentMethod,
    updatedAt: new Date().toISOString()
  };

  await executeQuery(
    'UPDATE users SET business_info = JSON_SET(COALESCE(business_info, "{}"), "$.payoutInfo", ?), updated_at = ? WHERE id = ?',
    [JSON.stringify(payoutInfo), new Date(), req.userId]
  );

  res.json({
    error: false,
    message: 'Payout information updated successfully'
  });
}));

// Update payout settings
router.post('/payout-settings', authenticateToken, [
  body('minimumPayout').optional().isFloat({ min: 0 }).withMessage('Minimum payout must be a positive number'),
  body('autoPayoutEnabled').optional().isBoolean().withMessage('Auto payout enabled must be a boolean'),
  body('payoutFrequency').optional().isIn(['weekly', 'monthly', 'manual']).withMessage('Invalid payout frequency')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { minimumPayout, autoPayoutEnabled, payoutFrequency } = req.body;

  // Update user's payout settings in business_info
  const payoutSettings = {
    minimumPayout: minimumPayout || 50,
    autoPayoutEnabled: autoPayoutEnabled !== undefined ? autoPayoutEnabled : false,
    payoutFrequency: payoutFrequency || 'manual',
    updatedAt: new Date().toISOString()
  };

  await executeQuery(
    'UPDATE users SET business_info = JSON_SET(COALESCE(business_info, "{}"), "$.payoutSettings", ?), updated_at = ? WHERE id = ?',
    [JSON.stringify(payoutSettings), new Date(), req.userId]
  );

  res.json({
    error: false,
    message: 'Payout settings updated successfully'
  });
}));

// Request payout
router.post('/request-payout', authenticateToken, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { amount } = req.body;

  // Check if user has sufficient balance
  const balance = await executeQuery(`
    SELECT SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as available_balance
    FROM orders o
    WHERE o.seller_id = ?
  `, [req.userId]);

  const availableBalance = balance[0].available_balance || 0;

  if (amount > availableBalance) {
    return res.status(400).json({
      error: true,
      message: 'Insufficient balance for payout'
    });
  }

  // Create payout transaction
  const transactionId = require('uuid').v4();
  await executeQuery(
    'INSERT INTO financial_transactions (id, user_id, type, amount, currency, description, reference_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [transactionId, req.userId, 'payout', amount, 'USD', 'Payout request', `PAY-${Date.now()}`, 'pending', new Date()]
  );

  res.json({
    error: false,
    message: 'Payout request submitted successfully',
    transactionId
  });
}));

// Get finance analytics
router.get('/analytics', authenticateToken, [
  query('period').optional().isIn(['weekly', 'monthly', 'yearly']).withMessage('Period must be weekly, monthly, or yearly')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { period = 'monthly' } = req.query;

  let analytics;
  
  if (req.user.role === 'seller') {
    // Seller finance analytics
    analytics = await executeQuery(`
      SELECT 
        DATE_FORMAT(o.created_at, ?) as period,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as revenue,
        AVG(o.total_amount) as average_order_value
      FROM orders o
      WHERE o.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      GROUP BY DATE_FORMAT(o.created_at, ?)
      ORDER BY period DESC
    `, [
      period === 'weekly' ? '%Y-%u' : period === 'monthly' ? '%Y-%m' : '%Y',
      req.userId,
      period === 'weekly' ? '%Y-%u' : period === 'monthly' ? '%Y-%m' : '%Y'
    ]);
  } else {
    // Customer finance analytics
    analytics = await executeQuery(`
      SELECT 
        DATE_FORMAT(o.created_at, ?) as period,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as spent,
        AVG(o.total_amount) as average_order_value
      FROM orders o
      WHERE o.customer_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      GROUP BY DATE_FORMAT(o.created_at, ?)
      ORDER BY period DESC
    `, [
      period === 'weekly' ? '%Y-%u' : period === 'monthly' ? '%Y-%m' : '%Y',
      req.userId,
      period === 'weekly' ? '%Y-%u' : period === 'monthly' ? '%Y-%m' : '%Y'
    ]);
  }

  res.json({
    error: false,
    analytics
  });
}));

module.exports = router;
