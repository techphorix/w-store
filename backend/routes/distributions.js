const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all distributions (with pagination and filtering)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('status').optional().isIn(['pending', 'active', 'paused', 'cancelled']).withMessage('Invalid status'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sortBy').optional().isIn(['created_at', 'updated_at', 'seller_price', 'allocated_stock']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { page = 1, limit = 20, status, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;
  const userId = req.userId;

  // Build WHERE clause based on user role and filters
  let whereClause = 'pd.id IS NOT NULL';
  const params = [];

  // If user is not admin, only show their distributions
  if (req.userRole !== 'admin') {
    whereClause += ' AND pd.seller_id = ?';
    params.push(userId);
  }

  if (status) {
    whereClause += ' AND pd.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  // Build ORDER BY clause
  const orderClause = `ORDER BY pd.${sortBy} ${sortOrder.toUpperCase()}`;

  // Get distributions with product and seller info
  const distributions = await executeQuery(`
    SELECT 
      pd.id,
      pd.product_id,
      pd.seller_id,
      pd.allocated_stock,
      pd.markup_percentage,
      pd.seller_price,
      pd.seller_notes,
      pd.admin_notes,
      pd.status,
      pd.created_at,
      pd.updated_at,
      p.name as product_name,
      p.sku as product_sku,
      p.price,
      p.images as product_images,
      u.full_name as seller_name,
      u.email as seller_email
    FROM product_distributions pd
    LEFT JOIN products p ON pd.product_id = p.id
    LEFT JOIN users u ON pd.seller_id = u.id
    WHERE ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count
  const countResult = await executeQuery(
    `SELECT COUNT(*) as total 
     FROM product_distributions pd
     LEFT JOIN products p ON pd.product_id = p.id
     WHERE ${whereClause}`,
    params
  );

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / parsedLimit);

  res.json({
    error: false,
    distributions,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages
    }
  });
}));

// Get single distribution by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  // Check if user can access this distribution
  let whereClause = 'pd.id = ?';
  const params = [id];

  if (req.userRole !== 'admin') {
    whereClause += ' AND pd.seller_id = ?';
    params.push(userId);
  }

  const distributions = await executeQuery(`
    SELECT 
      pd.*,
      p.name as product_name,
      p.sku as product_sku,
      p.price,
      p.images as product_images,
      u.full_name as seller_name,
      u.email as seller_email
    FROM product_distributions pd
    LEFT JOIN products p ON pd.product_id = p.id
    LEFT JOIN users u ON pd.seller_id = u.id
    WHERE ${whereClause}
  `, params);

  if (distributions.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Distribution not found'
    });
  }

  res.json({
    error: false,
    distribution: distributions[0]
  });
}));

// Create new distribution
router.post('/', authenticateToken, [
  body('productId').isUUID().withMessage('Valid product ID is required'),
  body('allocatedStock').optional().isInt({ min: 1 }).withMessage('Allocated stock must be a positive integer'),
  body('markup').optional().isFloat({ min: 0 }).withMessage('Markup must be a non-negative number'),
  body('sellerNotes').optional().isString().withMessage('Seller notes must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { productId, allocatedStock, markup, sellerNotes } = req.body;
  const sellerId = req.userId;

  // Check if product exists
  const products = await executeQuery('SELECT * FROM products WHERE id = ?', [productId]);
  if (products.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Product not found'
    });
  }

  // Check if distribution already exists for this seller and product
  const existingDistributions = await executeQuery(
    'SELECT * FROM product_distributions WHERE product_id = ? AND seller_id = ?',
    [productId, sellerId]
  );

  if (existingDistributions.length > 0) {
    return res.status(409).json({
      error: true,
      message: 'Distribution already exists for this product and seller'
    });
  }

  // Calculate seller price based on markup
  const basePrice = products[0].price;
  const sellerPrice = markup ? basePrice * (1 + markup / 100) : basePrice;

  const distributionId = uuidv4();
  const now = new Date();

  await executeQuery(`
    INSERT INTO product_distributions (
      id, product_id, seller_id, allocated_stock, markup_percentage, 
      seller_price, seller_notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    distributionId, productId, sellerId, allocatedStock || 0, markup || 0,
    sellerPrice, sellerNotes || '', 'pending', now, now
  ]);

  // Get the created distribution
  const newDistributions = await executeQuery(`
    SELECT 
      pd.*,
      p.name as product_name,
      p.sku as product_sku,
      p.price,
      p.images as product_images,
      u.full_name as seller_name,
      u.email as seller_email
    FROM product_distributions pd
    LEFT JOIN products p ON pd.product_id = p.id
    LEFT JOIN users u ON pd.seller_id = u.id
    WHERE pd.id = ?
  `, [distributionId]);

  res.status(201).json({
    error: false,
    message: 'Distribution created successfully',
    distribution: newDistributions[0]
  });
}));

// Update distribution
router.put('/:id', authenticateToken, [
  body('allocatedStock').optional().isInt({ min: 0 }).withMessage('Allocated stock must be a non-negative integer'),
  body('markup').optional().isFloat({ min: 0 }).withMessage('Markup must be a non-negative number'),
  body('sellerNotes').optional().isString().withMessage('Seller notes must be a string'),
  body('status').optional().isIn(['pending', 'active', 'paused', 'cancelled']).withMessage('Invalid status'),
  body('adminNotes').optional().isString().withMessage('Admin notes must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { allocatedStock, markup, sellerNotes, status, adminNotes } = req.body;
  const userId = req.userId;

  // Check if user can update this distribution
  let whereClause = 'id = ?';
  const params = [id];

  if (req.userRole !== 'admin') {
    whereClause += ' AND seller_id = ?';
    params.push(userId);
  }

  const existingDistributions = await executeQuery(
    `SELECT * FROM product_distributions WHERE ${whereClause}`,
    params
  );

  if (existingDistributions.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Distribution not found'
    });
  }

  const distribution = existingDistributions[0];

  // Build update fields
  const updateFields = [];
  const updateParams = [];

  if (allocatedStock !== undefined) {
    updateFields.push('allocated_stock = ?');
    updateParams.push(allocatedStock);
  }

  if (markup !== undefined) {
    updateFields.push('markup_percentage = ?');
    updateParams.push(markup);
    
    // Recalculate seller price if markup changed
    const products = await executeQuery('SELECT price FROM products WHERE id = ?', [distribution.product_id]);
    if (products.length > 0) {
      const newSellerPrice = products[0].price * (1 + markup / 100);
      updateFields.push('seller_price = ?');
      updateParams.push(newSellerPrice);
    }
  }

  if (sellerNotes !== undefined && req.userRole !== 'admin') {
    updateFields.push('seller_notes = ?');
    updateParams.push(sellerNotes);
  }

  if (status !== undefined) {
    updateFields.push('status = ?');
    updateParams.push(status);
  }

  if (adminNotes !== undefined && req.userRole === 'admin') {
    updateFields.push('admin_notes = ?');
    updateParams.push(adminNotes);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({
      error: true,
      message: 'No fields to update'
    });
  }

  updateFields.push('updated_at = ?');
  updateParams.push(new Date());
  updateParams.push(id);

  await executeQuery(
    `UPDATE product_distributions SET ${updateFields.join(', ')} WHERE id = ?`,
    updateParams
  );

  // Get updated distribution
  const updatedDistributions = await executeQuery(`
    SELECT 
      pd.*,
      p.name as product_name,
      p.sku as product_sku,
      p.price,
      p.images as product_images,
      u.full_name as seller_name,
      u.email as seller_email
    FROM product_distributions pd
    LEFT JOIN products p ON pd.product_id = p.id
    LEFT JOIN users u ON pd.seller_id = u.id
    WHERE pd.id = ?
  `, [id]);

  res.json({
    error: false,
    message: 'Distribution updated successfully',
    distribution: updatedDistributions[0]
  });
}));

// Delete distribution
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  // Check if user can delete this distribution
  let whereClause = 'id = ?';
  const params = [id];

  if (req.userRole !== 'admin') {
    whereClause += ' AND seller_id = ?';
    params.push(userId);
  }

  const existingDistributions = await executeQuery(
    `SELECT * FROM product_distributions WHERE ${whereClause}`,
    params
  );

  if (existingDistributions.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Distribution not found'
    });
  }

  await executeQuery('DELETE FROM product_distributions WHERE id = ?', [id]);

  res.json({
    error: false,
    message: 'Distribution deleted successfully'
  });
}));

module.exports = router;
