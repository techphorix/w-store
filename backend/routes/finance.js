const express = require('express');
const { body, validationResult, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Helper: compute available balance for a seller/user
async function computeAvailableBalance(userId) {
  // Orders delivered revenue
  const orders = await executeQuery(`
    SELECT COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END),0) AS orders_sum
    FROM orders o
    WHERE o.seller_id = ?
  `, [userId]);

  // Approved manual deposits
  const deposits = await executeQuery(`
    SELECT COALESCE(SUM(amount),0) AS deposits_sum
    FROM manual_deposits
    WHERE seller_id = ? AND status = 'approved'
  `, [userId]);

  // Payouts reserved or completed
  const payouts = await executeQuery(`
    SELECT COALESCE(SUM(amount),0) AS payouts_sum
    FROM financial_transactions
    WHERE user_id = ? AND type = 'payout' AND status IN ('pending','completed')
  `, [userId]);

  const ordersSum = Number(orders?.[0]?.orders_sum || 0);
  const depositsSum = Number(deposits?.[0]?.deposits_sum || 0);
  const payoutsSum = Number(payouts?.[0]?.payouts_sum || 0);

  const available = Math.max(0, ordersSum + depositsSum - payoutsSum);
  return { available, sources: { ordersSum, depositsSum, payoutsSum } };
}

// Configure multer storage for deposit screenshots
const depositStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/deposits');
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const depositFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'
  ];
  if (allowedTypes.includes(file.mimetype)) return cb(null, true);
  return cb(new Error(`Unsupported file type: ${file.mimetype}`));
};

const uploadDeposit = multer({
  storage: depositStorage,
  fileFilter: depositFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

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
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('accountId').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { amount, accountId } = req.body;

  // Check if user has sufficient balance (orders + approved deposits - payouts)
  const { available: availableBalance } = await computeAvailableBalance(req.userId);

  if (amount > availableBalance) {
    return res.status(400).json({
      error: true,
      message: 'Insufficient balance for payout'
    });
  }

  // Optional: validate selected withdrawal account belongs to seller
  let accountRow = null;
  if (accountId) {
    const rows = await executeQuery(
      'SELECT * FROM seller_withdrawal_accounts WHERE id = ? AND seller_id = ?',
      [accountId, req.userId]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: true, message: 'Invalid withdrawal account' });
    }
    accountRow = rows[0];
  }

  // Create payout transaction
  const transactionId = require('uuid').v4();
  await executeQuery(
    'INSERT INTO financial_transactions (id, user_id, type, amount, currency, description, reference_id, status, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      transactionId,
      req.userId,
      'payout',
      amount,
      'USD',
      'Payout request',
      `PAY-${Date.now()}`,
      'pending',
      new Date(),
      accountRow ? JSON.stringify({ withdrawalAccountId: accountRow.id, methodId: accountRow.method_id }) : null
    ]
  );

  res.json({
    error: false,
    message: 'Payout request submitted successfully',
    transactionId
  });
}));

// Get computed balance for current user
router.get('/balance', authenticateToken, asyncHandler(async (req, res) => {
  const { available, sources } = await computeAvailableBalance(req.userId);
  res.json({ error: false, availableBalance: available, sources });
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

// Get available payment methods for deposits
router.get('/payment-methods/deposit', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const paymentMethods = await executeQuery(`
      SELECT * FROM payment_methods 
      WHERE (type = 'deposit' OR type = 'both') AND is_active = TRUE
      ORDER BY name ASC
    `);

    res.json({
      error: false,
      paymentMethods
    });
  } catch (error) {
    logger.error('Error fetching deposit payment methods:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch payment methods'
    });
  }
}));

// Get available withdrawal methods
router.get('/payment-methods/withdrawal', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const withdrawalMethods = await executeQuery(`
      SELECT * FROM withdrawal_methods 
      WHERE is_active = TRUE
      ORDER BY name ASC
    `);

    res.json({
      error: false,
      withdrawalMethods
    });
  } catch (error) {
    logger.error('Error fetching withdrawal methods:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch withdrawal methods'
    });
  }
}));

// Submit a manual deposit with screenshot (seller)
router.post('/deposits', authenticateToken, uploadDeposit.single('screenshot'), [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount is required'),
  body('methodId').notEmpty().withMessage('Payment method is required'),
  body('reference').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: true, message: 'Validation failed', errors: errors.array() });
  }

  try {
    const { amount, methodId, reference } = req.body;

    // Validate method
    const method = await executeQuery('SELECT * FROM payment_methods WHERE id = ? AND (type = "deposit" OR type = "both") AND is_active = TRUE', [methodId]);
    if (method.length === 0) {
      return res.status(400).json({ error: true, message: 'Invalid or inactive payment method' });
    }

    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Screenshot file is required' });
    }

    // Persist file info in file_uploads for traceability
    const fileId = uuidv4();
    const fileUrl = `/uploads/deposits/${req.file.filename}`;
    await executeQuery(`
      INSERT INTO file_uploads (
        id, original_name, filename, mimetype, size, path, url, uploaded_by, uploaded_at, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      fileId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size,
      req.file.path, fileUrl, req.userId, new Date(), 'active', JSON.stringify({ context: 'manual_deposit' })
    ]);

    // Create manual deposit
    const depositId = uuidv4();
    await executeQuery(`
      INSERT INTO manual_deposits (id, seller_id, method_id, amount, currency, screenshot_url, file_upload_id, reference, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      depositId, req.userId, methodId, parseFloat(amount), 'USD', fileUrl, fileId, reference || null, new Date()
    ]);

    res.json({ error: false, message: 'Deposit submitted. Pending admin review.', depositId, screenshotUrl: fileUrl });
  } catch (error) {
    logger.error('Error submitting manual deposit:', error);
    res.status(500).json({ error: true, message: 'Failed to submit deposit', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}));

// List current seller's manual deposits
router.get('/deposits/my', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const rows = await executeQuery(`
      SELECT d.*, pm.name as method_name
      FROM manual_deposits d
      LEFT JOIN payment_methods pm ON d.method_id = pm.id
      WHERE d.seller_id = ?
      ORDER BY d.created_at DESC
    `, [req.userId]);
    res.json({ error: false, deposits: rows });
  } catch (error) {
    logger.error('Error fetching my deposits:', error);
    res.status(500).json({ error: true, message: 'Failed to fetch deposits' });
  }
}));

// Seller withdrawal accounts CRUD (minimal)
router.get('/withdrawal-accounts', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const rows = await executeQuery(`
      SELECT a.*, wm.name as method_name, wm.type as method_type
      FROM seller_withdrawal_accounts a
      LEFT JOIN withdrawal_methods wm ON a.method_id = wm.id
      WHERE a.seller_id = ?
      ORDER BY a.created_at DESC
    `, [req.userId]);
    res.json({ error: false, accounts: rows });
  } catch (error) {
    logger.error('Error fetching withdrawal accounts:', error);
    res.status(500).json({ error: true, message: 'Failed to fetch withdrawal accounts' });
  }
}));

router.post('/withdrawal-accounts', authenticateToken, [
  body('methodId').notEmpty().withMessage('Method is required'),
  body('label').optional().isString(),
  body('details').optional()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: true, message: 'Validation failed', errors: errors.array() });
  }
  try {
    const { methodId, label, details, isDefault } = req.body;
    const method = await executeQuery('SELECT * FROM withdrawal_methods WHERE id = ? AND is_active = TRUE', [methodId]);
    if (method.length === 0) {
      return res.status(400).json({ error: true, message: 'Invalid or inactive withdrawal method' });
    }
    const id = uuidv4();
    await executeQuery(`
      INSERT INTO seller_withdrawal_accounts (id, seller_id, method_id, label, details, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, req.userId, methodId, label || null, details ? JSON.stringify(details) : null, !!isDefault, new Date()]);
    res.json({ error: false, message: 'Withdrawal account added', id });
  } catch (error) {
    logger.error('Error adding withdrawal account:', error);
    res.status(500).json({ error: true, message: 'Failed to add withdrawal account' });
  }
}));

router.delete('/withdrawal-accounts/:id', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM seller_withdrawal_accounts WHERE id = ? AND seller_id = ?', [id, req.userId]);
    res.json({ error: false, message: 'Withdrawal account deleted' });
  } catch (error) {
    logger.error('Error deleting withdrawal account:', error);
    res.status(500).json({ error: true, message: 'Failed to delete withdrawal account' });
  }
}));

module.exports = router;
