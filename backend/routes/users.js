const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireOwnershipOrAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await executeQuery(`
    SELECT id, full_name, email, phone_number, role, status, email_verified, 
           phone_verified, profile_image, business_info, address, preferences, 
           created_at, last_login
    FROM users WHERE id = ?
  `, [req.userId]);

  if (user.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'User not found'
    });
  }

  const userData = user[0];
  
  // Parse JSON fields
  if (userData.business_info) {
    try {
      userData.business_info = JSON.parse(userData.business_info);
    } catch (e) {
      userData.business_info = {};
    }
  }
  if (userData.address) {
    try {
      userData.address = JSON.parse(userData.address);
    } catch (e) {
      userData.address = {};
    }
  }
  if (userData.preferences) {
    try {
      userData.preferences = JSON.parse(userData.preferences);
    } catch (e) {
      userData.preferences = {};
    }
  }

  // Transform field names to match frontend interface (camelCase)
  const transformedUser = {
    _id: userData.id,
    fullName: userData.full_name,
    email: userData.email,
    phoneNumber: userData.phone_number,
    role: userData.role,
    status: userData.status,
    businessInfo: userData.business_info,
    address: userData.address,
    isEmailVerified: userData.email_verified,
    isPhoneVerified: userData.phone_verified,
    profileImage: userData.profile_image,
    preferences: userData.preferences,
    createdAt: userData.created_at,
    lastLogin: userData.last_login
  };

  res.json({
    error: false,
    user: transformedUser
  });
}));

// Update user profile
router.put('/profile', authenticateToken, [
  body('fullName').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Full name must be between 2 and 255 characters'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { fullName, phoneNumber, businessInfo, address, preferences } = req.body;

  const updates = [];
  const params = [];

  if (fullName) {
    updates.push('full_name = ?');
    params.push(fullName);
  }

  if (phoneNumber) {
    updates.push('phone_number = ?');
    params.push(phoneNumber);
  }

  if (businessInfo) {
    updates.push('business_info = ?');
    params.push(JSON.stringify(businessInfo));
  }

  if (address) {
    updates.push('address = ?');
    params.push(JSON.stringify(address));
  }

  if (preferences) {
    updates.push('preferences = ?');
    params.push(JSON.stringify(preferences));
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: true,
      message: 'No fields to update'
    });
  }

  updates.push('updated_at = ?');
  params.push(new Date());
  params.push(req.userId);

  await executeQuery(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info(`Profile updated for user: ${req.userId}`);

  res.json({
    error: false,
    message: 'Profile updated successfully'
  });
}));

// Get user by ID (for public profiles)
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await executeQuery(`
    SELECT id, full_name, profile_image, business_info, created_at
    FROM users WHERE id = ? AND status = 'active'
  `, [id]);

  if (user.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'User not found'
    });
  }

  const userData = user[0];
  
  // Parse JSON fields
  if (userData.business_info) {
    try {
      userData.business_info = JSON.parse(userData.business_info);
    } catch (e) {
      userData.business_info = {};
    }
  }

  res.json({
    error: false,
    user: userData
  });
}));

// Get seller shop info
router.get('/seller/:id/shop', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const seller = await executeQuery(`
    SELECT u.id, u.full_name, u.profile_image, u.business_info, u.created_at,
           COUNT(p.id) as total_products,
           COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
    FROM users u
    LEFT JOIN products p ON u.id = p.created_by
    WHERE u.id = ? AND u.role = 'seller' AND u.role != 'admin' AND u.status = 'active'
    GROUP BY u.id
  `, [id]);

  if (seller.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Seller not found'
    });
  }

  const sellerData = seller[0];
  
  // Parse JSON fields
  if (sellerData.business_info) {
    try {
      sellerData.business_info = JSON.parse(sellerData.business_info);
    } catch (e) {
      sellerData.business_info = {};
    }
  }

  res.json({
    error: false,
    seller: sellerData
  });
}));

// Get seller products
router.get('/seller/:id/products', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, category, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 20;
  const offset = (parsedPage - 1) * parsedLimit;

  // Verify seller exists and is active
  const seller = await executeQuery(
    'SELECT id FROM users WHERE id = ? AND role = "seller" AND role != "admin" AND status = "active"',
    [id]
  );

  if (seller.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Seller not found'
    });
  }

  let whereClause = 'p.created_by = ? AND p.is_active = TRUE';
  const params = [id];

  if (category) {
    whereClause += ' AND p.category_id = ?';
    params.push(category);
  }

  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const products = await executeQuery(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${whereClause}
    ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count
  const countResult = await executeQuery(
    `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`,
    params
  );

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / parsedLimit);

  // Parse JSON fields
  products.forEach(product => {
    if (product.images) {
      try {
        product.images = JSON.parse(product.images);
      } catch (e) {
        product.images = [];
      }
    }
    if (product.features) {
      try {
        product.features = JSON.parse(product.features);
      } catch (e) {
        product.features = [];
      }
    }
    if (product.specifications) {
      try {
        product.specifications = JSON.parse(product.specifications);
      } catch (e) {
        product.specifications = {};
      }
    }
    if (product.tags) {
      try {
        product.tags = JSON.parse(product.tags);
      } catch (e) {
        product.tags = [];
      }
    }
  });

  res.json({
    error: false,
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}));

// Get user orders
router.get('/orders', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 20;
  const offset = (parsedPage - 1) * parsedLimit;

  let whereClause = 'customer_id = ?';
  const params = [req.userId];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const orders = await executeQuery(`
    SELECT o.*, s.full_name as seller_name, s.email as seller_email
    FROM orders o
    LEFT JOIN users s ON o.seller_id = s.id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count
  const countResult = await executeQuery(
    `SELECT COUNT(*) as total FROM orders WHERE ${whereClause}`,
    params
  );

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / parsedLimit);

  // Parse JSON fields
  orders.forEach(order => {
    if (order.shipping_address) {
      try {
        order.shipping_address = JSON.parse(order.shipping_address);
      } catch (e) {
        order.shipping_address = {};
      }
    }
    if (order.billing_address) {
      try {
        order.billing_address = JSON.parse(order.billing_address);
      } catch (e) {
        order.billing_address = {};
      }
    }
  });

  res.json({
    error: false,
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}));

// Get user statistics
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const stats = await executeQuery(`
    SELECT 
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
      COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
      SUM(total_amount) as total_spent,
      AVG(total_amount) as average_order_value
    FROM orders
    WHERE customer_id = ?
  `, [req.userId]);

  res.json({
    error: false,
    stats: stats[0]
  });
}));

module.exports = router;
