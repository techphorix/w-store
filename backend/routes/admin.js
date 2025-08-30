const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { safeParseUserFields } = require('../utils/jsonHelper');

const router = express.Router();

// Enforce admin-only access for all admin routes
router.use(requireAdmin);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/profiles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Product images upload (to uploads/products)
const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const dir = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const productImageUpload = multer({
  storage: productImageStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Apply admin middleware to all routes
router.use(requireAdmin);

// Test route to verify admin routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes are working', timestamp: new Date().toISOString() });
});

// Get admin dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  try {
    // Get system stats
    const systemStats = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'seller') as total_sellers,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
        (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as active_products,
        (SELECT COUNT(*) FROM orders WHERE status != 'cancelled') as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered') as total_revenue
    `);

    // Get recent orders
    const recentOrders = await executeQuery(`
      SELECT o.*, c.full_name as customer_name, s.full_name as seller_name
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.id
      LEFT JOIN users s ON o.seller_id = s.id
      ORDER BY o.created_at DESC LIMIT 10
    `);

    // Get recent users
    const recentUsers = await executeQuery(`
      SELECT id, full_name, email, role, status, created_at
      FROM users
      ORDER BY created_at DESC LIMIT 5
    `);

    // Get recent products
    const recentProducts = await executeQuery(`
      SELECT p.*, c.name as category_name, u.full_name as created_by_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC LIMIT 5
    `);

    // Get system health metrics
    const systemHealth = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as active_users_24h,
        (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as orders_24h,
        (SELECT COUNT(*) FROM products WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as products_updated_24h
    `);

    res.json({
      error: false,
      dashboard: {
        stats: systemStats[0],
        recentOrders,
        recentUsers,
        recentProducts,
        systemHealth: systemHealth[0]
      }
    });
  } catch (error) {
    logger.error('Error fetching admin dashboard:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch dashboard data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get all users
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;
  
  let whereClause = '1=1';
  const params = [];

  if (role && role !== 'all') {
    whereClause += ' AND role = ?';
    params.push(role);
  }

  if (search) {
    whereClause += ' AND (full_name LIKE ? OR email LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const users = await executeQuery(`
    SELECT id, full_name, email, phone_number, role, status, email_verified, 
           phone_verified, profile_image, business_info, address, preferences, 
           created_at, last_login
    FROM users 
    WHERE ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count for pagination
  const totalCount = await executeQuery(`
    SELECT COUNT(*) as total FROM users WHERE ${whereClause}
  `, params);

  // Transform users to match frontend interface
  const transformedUsers = users.map(user => {
    // Safely parse JSON fields with error handling
    let businessInfo = {};
    let address = {};
    let preferences = {};
    
    try {
      if (user.business_info && user.business_info !== '[object Object]') {
        businessInfo = JSON.parse(user.business_info);
      }
    } catch (e) {
      businessInfo = {};
    }
    
    try {
      if (user.address && user.address !== '[object Object]') {
        address = JSON.parse(user.address);
      }
    } catch (e) {
      address = {};
    }
    
    try {
      if (user.preferences && user.preferences !== '[object Object]') {
        preferences = JSON.parse(user.preferences);
      }
    } catch (e) {
      preferences = {};
    }
    
    return {
      _id: user.id,
      fullName: user.full_name,
      email: user.email,
      phoneNumber: user.phone_number,
      role: user.role,
      status: user.status,
      isActive: user.status === 'active',
      isEmailVerified: user.email_verified,
      isPhoneVerified: user.phone_verified,
      profileImage: user.profile_image,
      businessInfo,
      address,
      preferences,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };
  });

  res.json({
    error: false,
    users: transformedUsers,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total: totalCount[0].total,
      pages: Math.ceil(totalCount[0].total / parsedLimit)
    }
  });
}));

// Get users statistics
router.get('/users/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'seller' THEN 1 END) as total_sellers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_users,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
        COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
        COUNT(CASE WHEN email_verified = FALSE THEN 1 END) as unverified_users
      FROM users
    `);

    res.json({
      error: false,
      stats: stats[0]
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch user statistics'
    });
  }
}));

// Get specific user by ID
router.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const user = await executeQuery(`
      SELECT id, full_name, email, phone_number, role, status, email_verified, 
             phone_verified, profile_image, business_info, address, preferences, 
             created_at, last_login
      FROM users WHERE id = ?
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

    // Transform to match frontend interface
    const transformedUser = {
      _id: userData.id,
      fullName: userData.full_name,
      email: userData.email,
      phoneNumber: userData.phone_number,
      role: userData.role,
      status: userData.status,
      isEmailVerified: userData.email_verified,
      isPhoneVerified: userData.phone_verified,
      profileImage: userData.profile_image,
      businessInfo: userData.business_info,
      address: userData.address,
      preferences: userData.preferences,
      createdAt: userData.created_at,
      lastLogin: userData.last_login
    };

    res.json({
      error: false,
      user: transformedUser
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get users analytics
router.get('/users/analytics', asyncHandler(async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    // Get user growth over time
    const userGrowth = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users,
        SUM(CASE WHEN role = 'seller' THEN 1 ELSE 0 END) as new_sellers
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [days]);

    // Get user statistics
    const userStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'seller' THEN 1 END) as total_sellers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_users,
        COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users
      FROM users
    `);

    // Get recent user activity
    const recentActivity = await executeQuery(`
      SELECT 
        id, full_name, email, role, status, created_at, last_login
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      error: false,
      analytics: {
        userGrowth,
        userStats: userStats[0],
        recentActivity
      }
    });
  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch user analytics'
    });
  }
}));

// Update user status
router.put('/users/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
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
  const { isActive } = req.body;

  try {
    // Check if user exists
    const user = await executeQuery('SELECT id, status FROM users WHERE id = ?', [id]);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    const newStatus = isActive ? 'active' : 'inactive';
    
    // Update user status
    await executeQuery(
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      [newStatus, new Date(), id]
    );

    res.json({
      error: false,
      message: 'User status updated successfully',
      data: {
        userId: id,
        status: newStatus,
        isActive: isActive
      }
    });
  } catch (error) {
    logger.error('Error updating user status:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update user status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Update user role
router.put('/users/:id/role', [
  body('role').isIn(['seller', 'admin']).withMessage('Role must be either "seller" or "admin"')
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
  const { role } = req.body;

  try {
    // Check if user exists
    const user = await executeQuery('SELECT id, role FROM users WHERE id = ?', [id]);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Prevent changing role of the last admin
    if (user[0].role === 'admin' && role === 'seller') {
      const adminCount = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          error: true,
          message: 'Cannot change the role of the last admin user'
        });
      }
    }

    // Update user role
    await executeQuery(
      'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
      [role, new Date(), id]
    );

    res.json({
      error: false,
      message: 'User role updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user role:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update user role',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Update user information (admin)
router.put('/users/:id', upload.single('profileImage'), [
  body('fullName').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Full name must be between 2 and 255 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('Invalid status'),
  body('isEmailVerified').optional().isBoolean().withMessage('Email verification status must be a boolean'),
  body('isPhoneVerified').optional().isBoolean().withMessage('Phone verification status must be a boolean'),
  body('businessInfo').optional().isObject().withMessage('Business info must be an object'),
  body('address').optional().isObject().withMessage('Address must be an object'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object')
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
  const { fullName, email, phoneNumber, status, isEmailVerified, isPhoneVerified, businessInfo, address, preferences } = req.body;
  const profileImage = req.file;

  try {
    // Check if user exists
    const user = await executeQuery('SELECT id FROM users WHERE id = ?', [id]);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await executeQuery('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existingUser.length > 0) {
        return res.status(400).json({
          error: true,
          message: 'Email is already taken by another user'
        });
      }
    }

    // Check if phone number is already taken by another user
    if (phoneNumber) {
      const existingUser = await executeQuery('SELECT id FROM users WHERE phone_number = ? AND id != ?', [phoneNumber, id]);
      if (existingUser.length > 0) {
        return res.status(400).json({
          error: true,
          message: 'Phone number is already taken by another user'
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (fullName) {
      updates.push('full_name = ?');
      params.push(fullName);
    }

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (phoneNumber) {
      updates.push('phone_number = ?');
      params.push(phoneNumber);
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (profileImage) {
      updates.push('profile_image = ?');
      params.push(`/uploads/profiles/${profileImage.filename}`);
    }

    if (isEmailVerified !== undefined) {
      updates.push('email_verified = ?');
      params.push(isEmailVerified);
    }

    if (isPhoneVerified !== undefined) {
      updates.push('phone_verified = ?');
      params.push(isPhoneVerified);
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
        message: 'No valid fields to update'
      });
    }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(id);

    // Update user
    await executeQuery(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated user info for response
    const updatedUser = await executeQuery(`
      SELECT id, full_name, email, phone_number, role, status, email_verified, phone_verified, 
             profile_image, business_info, address, preferences, updated_at
      FROM users WHERE id = ?
    `, [id]);

    res.json({
      error: false,
      message: 'User updated successfully',
      data: {
        userId: id,
        updatedFields: updates.filter(field => field !== 'updated_at = ?'),
        updatedAt: new Date().toISOString(),
        user: updatedUser[0] ? {
          id: updatedUser[0].id,
          fullName: updatedUser[0].full_name,
          email: updatedUser[0].email,
          phoneNumber: updatedUser[0].phone_number,
          role: updatedUser[0].role,
          status: updatedUser[0].status,
          isEmailVerified: updatedUser[0].email_verified,
          isPhoneVerified: updatedUser[0].phone_verified,
          profileImage: updatedUser[0].profile_image,
          businessInfo: updatedUser[0].business_info ? JSON.parse(updatedUser[0].business_info) : null,
          address: updatedUser[0].address ? JSON.parse(updatedUser[0].address) : null,
          preferences: updatedUser[0].preferences ? JSON.parse(updatedUser[0].preferences) : null,
          updatedAt: updatedUser[0].updated_at
        } : null
      }
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Update user profile image only
router.put('/users/:id/profile-image', upload.single('profileImage'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileImage = req.file;

  if (!profileImage) {
    return res.status(400).json({
      error: true,
      message: 'Profile image file is required'
    });
  }

  try {
    // Check if user exists
    const user = await executeQuery('SELECT id FROM users WHERE id = ?', [id]);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Update profile image
    await executeQuery(
      'UPDATE users SET profile_image = ?, updated_at = ? WHERE id = ?',
      [`/uploads/profiles/${profileImage.filename}`, new Date(), id]
    );

    res.json({
      error: false,
      message: 'Profile image updated successfully',
      data: {
        userId: id,
        profileImage: `/uploads/profiles/${profileImage.filename}`,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error updating profile image:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update profile image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Suspend user
router.put('/users/:id/suspend', [
  body('reason').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer (days)')
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
  const { reason, duration } = req.body;

  try {
    // Check if user exists
    const user = await executeQuery('SELECT id, status FROM users WHERE id = ?', [id]);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    if (user[0].status === 'suspended') {
      return res.status(400).json({
        error: true,
        message: 'User is already suspended'
      });
    }

    // Update user status to suspended
    await executeQuery(
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      ['suspended', new Date(), id]
    );

    // Log the suspension (optional - table may not exist)
    try {
      await executeQuery(
        'INSERT INTO user_actions (user_id, action, reason, duration, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'suspended', reason || 'User suspended by admin', duration || null, req.userId, new Date()]
      );
    } catch (logError) {
      // Ignore logging errors - table may not exist
      logger.warn('Could not log user suspension action:', logError.message);
    }

    res.json({
      error: false,
      message: 'User suspended successfully',
      data: {
        userId: id,
        status: 'suspended',
        suspendedAt: new Date().toISOString(),
        suspendedBy: req.userId,
        reason: reason || 'User suspended by admin',
        duration: duration || null
      }
    });
  } catch (error) {
    logger.error('Error suspending user:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to suspend user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Unsuspend user
router.put('/users/:id/unsuspend', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists and is suspended
    const user = await executeQuery('SELECT id, status FROM users WHERE id = ?', [id]);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    if (user[0].status !== 'suspended') {
      return res.status(400).json({
        error: true,
        message: 'User is not currently suspended'
      });
    }

    // Update user status to active
    await executeQuery(
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      ['active', new Date(), id]
    );

    // Log the unsuspension (optional - table may not exist)
    try {
      await executeQuery(
        'INSERT INTO user_actions (user_id, action, reason, performed_by, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, 'unsuspended', 'User unsuspended by admin', req.userId, new Date()]
      );
    } catch (logError) {
      // Ignore logging errors - table may not exist
      logger.warn('Could not log user unsuspension action:', logError.message);
    }

    res.json({
      error: false,
      message: 'User unsuspended successfully',
      data: {
        userId: id,
        status: 'active',
        unsuspendedAt: new Date().toISOString(),
        unsuspendedBy: req.userId
      }
    });
  } catch (error) {
    logger.error('Error unsuspending user:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to unsuspend user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Delete user
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists
    const user = await executeQuery('SELECT id, role FROM users WHERE id = ?', [id]);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Prevent deletion of the last admin
    if (user[0].role === 'admin') {
      const adminCount = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          error: true,
          message: 'Cannot delete the last admin user'
        });
      }
    }

    // Delete user (cascade will handle related records due to foreign key constraints)
    await executeQuery('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      error: false,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    
    // Check for foreign key constraint violations
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete user. User has associated orders, products, or other data that must be removed first.'
      });
    }

    res.status(500).json({
      error: true,
      message: 'Failed to delete user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Bulk delete users
router.delete('/users/bulk', [
  body('userIds').isArray().withMessage('userIds must be an array')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { userIds } = req.body;

  try {
    // Check if any of the users are admins
    const adminUsers = await executeQuery(
      'SELECT id, role FROM users WHERE id IN (?) AND role = "admin"',
      [userIds]
    );

    // Prevent deletion of all admins
    const totalAdminCount = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    if (totalAdminCount[0].count - adminUsers.length <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete all admin users. At least one admin must remain.'
      });
    }

    // Delete users
    await executeQuery('DELETE FROM users WHERE id IN (?)', [userIds]);

    res.json({
      error: false,
      message: `${userIds.length} users deleted successfully`
    });
  } catch (error) {
    logger.error('Error bulk deleting users:', error);
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete some users. They have associated orders, products, or other data that must be removed first.'
      });
    }

    res.status(500).json({
      error: true,
      message: 'Failed to delete users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Bulk update users
router.put('/users/bulk', [
  body('userIds').isArray().withMessage('userIds must be an array'),
  body('updates').isObject().withMessage('Updates must be an object')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { userIds, updates } = req.body;

  try {
    // Validate updates object
    const allowedFields = ['status', 'role'];
    const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field));
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No valid fields to update. Allowed fields: status, role'
      });
    }

    // Check if any of the users are admins and if we're changing roles
    if (updates.role) {
      const adminUsers = await executeQuery(
        'SELECT id, role FROM users WHERE id IN (?) AND role = "admin"',
        [userIds]
      );

      // If changing admins to sellers, check if we're not removing all admins
      if (updates.role === 'seller' && adminUsers.length > 0) {
        const totalAdminCount = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
        if (totalAdminCount[0].count - adminUsers.length <= 0) {
          return res.status(400).json({
            error: true,
            message: 'Cannot change all admin users to sellers. At least one admin must remain.'
          });
        }
      }
    }

    // Build update query
    const updateClause = updateFields.map(field => `${field} = ?`).join(', ');
    const params = [...updateFields.map(field => updates[field]), new Date()];

    // Update users
    await executeQuery(
      `UPDATE users SET ${updateClause}, updated_at = ? WHERE id IN (?)`,
      [...params, userIds]
    );

    res.json({
      error: false,
      message: `${userIds.length} users updated successfully`
    });
  } catch (error) {
    logger.error('Error bulk updating users:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Export users
router.get('/users/export', asyncHandler(async (req, res) => {
  const { role, status, format = 'json', startDate, endDate } = req.query;
  
  try {
    let whereClause = '1=1';
    const params = [];

    if (role && role !== 'all') {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (startDate && endDate) {
      whereClause += ' AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const users = await executeQuery(`
      SELECT id, full_name, email, phone_number, role, status, email_verified, 
             phone_verified, profile_image, business_info, address, preferences, 
             created_at, last_login
      FROM users 
      WHERE ${whereClause}
      ORDER BY created_at DESC
    `, params);

    // Transform users to match frontend interface
    const transformedUsers = users.map(user => {
      // Safely parse JSON fields with error handling
      let businessInfo = {};
      let address = {};
      let preferences = {};
      
      try {
        if (user.business_info && user.business_info !== '[object Object]') {
          businessInfo = JSON.parse(user.business_info);
        }
      } catch (e) {
        businessInfo = {};
      }
      
      try {
        if (user.address && user.address !== '[object Object]') {
          address = JSON.parse(user.address);
        }
      } catch (e) {
        address = {};
      }
      
      try {
        if (user.preferences && user.preferences !== '[object Object]') {
          preferences = JSON.parse(user.preferences);
        }
      } catch (e) {
        preferences = {};
      }
      
      return {
        _id: user.id,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role,
        status: user.status,
        isEmailVerified: user.email_verified,
        isPhoneVerified: user.phone_verified,
        profileImage: user.profile_image,
        businessInfo,
        address,
        preferences,
        createdAt: user.created_at,
        lastLogin: user.last_login
      };
    });

    if (format === 'csv') {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Convert to CSV format
      const csvHeaders = ['ID', 'Full Name', 'Email', 'Phone', 'Role', 'Status', 'Email Verified', 'Phone Verified', 'Created At', 'Last Login'];
      const csvData = transformedUsers.map(user => [
        user._id,
        user.fullName,
        user.email,
        user.phoneNumber || '',
        user.role,
        user.status,
        user.isEmailVerified ? 'Yes' : 'No',
        user.isPhoneVerified ? 'Yes' : 'No',
        user.createdAt,
        user.lastLogin || ''
      ]);
      
      const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      res.send(csvContent);
    } else {
      // Return JSON format
      res.json({
        error: false,
        users: transformedUsers,
        exportInfo: {
          format: 'json',
          totalUsers: transformedUsers.length,
          exportDate: new Date().toISOString(),
          filters: { role, status, startDate, endDate }
        }
      });
    }
  } catch (error) {
    logger.error('Error exporting users:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to export users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Impersonate user
router.post('/impersonate/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if user exists and is active
    const user = await executeQuery(`
      SELECT id, full_name, email, role, status
      FROM users WHERE id = ? AND status = 'active'
    `, [userId]);

    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found or not active'
      });
    }

    // Generate impersonation token (this would typically be a JWT with impersonation claims)
    const impersonationData = {
      originalAdminId: req.userId,
      impersonatedUserId: userId,
      impersonatedUserRole: user[0].role,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    };

    // In a real implementation, you would sign this as a JWT
    // For now, we'll return the data structure
    res.json({
      error: false,
      message: 'User impersonation initiated',
      impersonationData,
      user: {
        _id: user[0].id,
        fullName: user[0].full_name,
        email: user[0].email,
        role: user[0].role,
        status: user[0].status
      }
    });
  } catch (error) {
    logger.error('Error initiating user impersonation:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to initiate user impersonation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Send announcement
router.post('/announcements', [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level'),
  body('targetRole').optional().isIn(['all', 'seller', 'admin']).withMessage('Invalid target role'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date format')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { title, message, priority = 'normal', targetRole = 'all', expiresAt } = req.body;

  try {
    // Create announcement (this would typically be stored in a notifications or announcements table)
    // For now, we'll return a success response
    const announcementData = {
      id: Date.now().toString(), // Simple ID generation
      title,
      message,
      priority,
      targetRole,
      expiresAt: expiresAt || new Date(Date.now() + 86400000).toISOString(), // Default to 24 hours
      createdBy: req.userId,
      createdAt: new Date().toISOString()
    };

    // In a real implementation, you would store this in the database
    // and potentially send notifications to users

    res.json({
      error: false,
      message: 'Announcement sent successfully',
      announcement: announcementData
    });
  } catch (error) {
    logger.error('Error sending announcement:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to send announcement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Update seller metrics
router.put('/sellers/:sellerId/metrics', [
  body('creditScore').optional().isInt({ min: 0, max: 1000 }).withMessage('Credit score must be between 0 and 1000'),
  body('responseTime').optional().isInt({ min: 0 }).withMessage('Response time must be a positive number'),
  body('fulfillmentRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Fulfillment rate must be between 0 and 100'),
  body('returnRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Return rate must be between 0 and 100'),
  body('customerSatisfaction').optional().isFloat({ min: 0, max: 5 }).withMessage('Customer satisfaction must be between 0 and 5')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { sellerId } = req.params;
  const { creditScore, responseTime, fulfillmentRate, returnRate, customerSatisfaction } = req.body;

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Update seller metrics (this would typically be stored in a seller_metrics table)
    // For now, we'll return a success response
    const metricsData = {
      sellerId,
      creditScore: creditScore || null,
      responseTime: responseTime || null,
      fulfillmentRate: fulfillmentRate || null,
      returnRate: returnRate || null,
      customerSatisfaction: customerSatisfaction || null,
      updatedBy: req.userId,
      updatedAt: new Date().toISOString()
    };

    // In a real implementation, you would store this in the database
    // and potentially update related analytics

    res.json({
      error: false,
      message: 'Seller metrics updated successfully',
      metrics: metricsData
    });
  } catch (error) {
    logger.error('Error updating seller metrics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update seller metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get seller analytics
router.get('/sellers/:sellerId/analytics', asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { period = '30' } = req.query;
  const days = parseInt(period);

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, full_name, email, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // First, check if there are admin-edited analytics in business_info
    const businessInfo = await executeQuery(
      'SELECT business_info FROM users WHERE id = ?',
      [sellerId]
    );

    logger.info(`🔍 Admin GET: Checking business_info for seller ${sellerId}:`, {
      hasBusinessInfo: !!businessInfo[0]?.business_info,
      businessInfoType: typeof businessInfo[0]?.business_info,
      businessInfoRaw: businessInfo[0]?.business_info
    });

    let adminEditedAnalytics = null;
    let auditTrail = null;
    
    try {
      if (businessInfo[0]?.business_info && businessInfo[0].business_info !== '[object Object]') {
        const parsed = JSON.parse(businessInfo[0].business_info);
        logger.info(`📊 Admin GET: Parsed business_info:`, parsed);
        
        if (parsed.analytics) {
          adminEditedAnalytics = parsed.analytics;
          auditTrail = parsed.auditTrail || [];
          logger.info(`✅ Admin GET: Found admin-edited analytics:`, adminEditedAnalytics);
        } else {
          logger.info(`❌ Admin GET: No analytics found in business_info`);
        }
      } else {
        logger.info(`❌ Admin GET: No business_info or invalid format`);
      }
    } catch (e) {
      // If parsing fails, continue with calculated analytics
      logger.warn(`Failed to parse business_info for seller ${sellerId}:`, e.message);
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
    `, [days, sellerId]);

    // Get recent orders
    const recentOrders = await executeQuery(`
      SELECT o.*, c.full_name as customer_name
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.id
      WHERE o.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [sellerId, days]);

    // Get daily revenue
    const dailyRevenue = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders o
      WHERE seller_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [sellerId, days]);

    // Get product performance
    const productPerformance = await executeQuery(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(o.id) as order_count,
        COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      WHERE p.created_by = ?
      GROUP BY p.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `, [sellerId, days, sellerId]);

    // Prepare the final analytics response
    // If admin-edited analytics exist, use them; otherwise use calculated analytics
    const finalAnalytics = adminEditedAnalytics || {
      totalSales: calculatedAnalytics[0].total_revenue || 0,
      totalOrders: calculatedAnalytics[0].total_orders || 0,
      totalProducts: calculatedAnalytics[0].total_products || 0,
      totalCustomers: 0, // This would need to be calculated separately
      averageOrderValue: calculatedAnalytics[0].average_order_value || 0,
      conversionRate: 0, // This would need to be calculated separately
      customerSatisfaction: 0, // This would need to be calculated separately
      monthlyGrowth: 0 // This would need to be calculated separately
    };

    const response = {
      error: false,
      seller: {
        _id: seller[0].id,
        fullName: seller[0].email,
        email: seller[0].email,
        role: seller[0].role
      },
      analytics: {
        period: period,
        days: days,
        stats: finalAnalytics,
        calculatedStats: calculatedAnalytics[0], // Include calculated stats for comparison
        adminEdited: !!adminEditedAnalytics, // Flag indicating if admin-edited analytics exist
        auditTrail: auditTrail || [], // Include audit trail if available
        recentOrders,
        dailyRevenue,
        productPerformance
      }
    };

    logger.info(`📤 Admin GET: Sending analytics response:`, {
      sellerId,
      adminEdited: response.analytics.adminEdited,
      stats: response.analytics.stats,
      calculatedStats: response.analytics.calculatedStats
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

// Update seller analytics
router.put('/sellers/:sellerId/analytics', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { period, metrics, auditInfo } = req.body;

    // Validate seller exists
    const seller = await executeQuery(
      'SELECT id, full_name, email, role FROM users WHERE id = ? AND role = "seller"',
      [sellerId]
    );

    if (!seller || seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Get current analytics from business_info
    const currentBusinessInfo = await executeQuery(
      'SELECT business_info FROM users WHERE id = ?',
      [sellerId]
    );

    logger.info(`🔍 Admin PUT: Current business_info for seller ${sellerId}:`, {
      hasBusinessInfo: !!currentBusinessInfo[0]?.business_info,
      businessInfoType: typeof currentBusinessInfo[0]?.business_info,
      businessInfoRaw: currentBusinessInfo[0]?.business_info
    });

    let businessInfo = {};
    try {
      if (currentBusinessInfo[0]?.business_info && currentBusinessInfo[0].business_info !== '[object Object]') {
        businessInfo = JSON.parse(currentBusinessInfo[0].business_info);
        logger.info(`📊 Admin PUT: Parsed current business_info:`, businessInfo);
      }
    } catch (e) {
      logger.warn(`Admin PUT: Failed to parse current business_info:`, e.message);
      businessInfo = {};
    }

    // Initialize analytics if they don't exist
    if (!businessInfo.analytics) {
      businessInfo.analytics = {
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        customerSatisfaction: 0,
        monthlyGrowth: 0
      };
    }

    // Update analytics with new values
    // Handle both formats: { metrics: {...} } and direct field updates
    const fieldsToUpdate = metrics || req.body;
    logger.info(`🔄 Admin PUT: Fields to update:`, fieldsToUpdate);
    
    if (fieldsToUpdate && typeof fieldsToUpdate === 'object') {
      Object.keys(fieldsToUpdate).forEach(key => {
        // Skip auditInfo and other non-analytics fields
        if (key !== 'auditInfo' && key !== 'period' && businessInfo.analytics.hasOwnProperty(key)) {
          const oldValue = businessInfo.analytics[key];
          businessInfo.analytics[key] = fieldsToUpdate[key];
          logger.info(`📝 Admin PUT: Updated ${key}: ${oldValue} → ${fieldsToUpdate[key]}`);
        }
      });
    }

    // Add audit trail if provided
    const auditData = auditInfo || req.body.auditInfo;
    if (auditData) {
      if (!businessInfo.auditTrail) {
        businessInfo.auditTrail = [];
      }
      businessInfo.auditTrail.push({
        ...auditData,
        timestamp: new Date().toISOString()
      });
    }

    // Update database
    const finalBusinessInfo = JSON.stringify(businessInfo);
    logger.info(`💾 Admin PUT: Saving final business_info:`, {
      sellerId,
      finalBusinessInfo,
      analytics: businessInfo.analytics
    });
    
    await executeQuery(
      'UPDATE users SET business_info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [finalBusinessInfo, sellerId]
    );

    logger.info(`Seller ${sellerId} analytics updated by admin ${req.user.email}`, {
      metrics,
      period,
      auditInfo
    });

    const response = {
      error: false,
      message: 'Seller analytics updated successfully',
      sellerId,
      analytics: businessInfo.analytics,
      auditTrail: businessInfo.auditTrail
    };
    
    logger.info(`📤 Admin PUT: Sending response:`, response);
    
    res.json(response);
  } catch (error) {
    logger.error('Error updating seller analytics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update seller analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get seller financial data
router.get('/sellers/:sellerId/financial', asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { period = '30' } = req.query;
  const days = parseInt(period);

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, full_name, email, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Get financial transactions
    const transactions = await executeQuery(`
      SELECT 
        type,
        amount,
        currency,
        description,
        status,
        created_at
      FROM financial_transactions
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY created_at DESC
    `, [sellerId, days]);

    // Get revenue summary
    const revenueSummary = await executeQuery(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_orders
      FROM orders
      WHERE seller_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [sellerId, days]);

    // Get monthly revenue
    const monthlyRevenue = await executeQuery(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE seller_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `, [sellerId, days]);

    // Calculate profit margin (simplified - in real implementation this would be more complex)
    const profitMargin = revenueSummary[0].total_revenue > 0 ? 
      ((revenueSummary[0].total_revenue - (revenueSummary[0].total_revenue * 0.15)) / revenueSummary[0].total_revenue) * 100 : 0;

    // Calculate refund rate
    const refundRate = revenueSummary[0].total_orders > 0 ? 
      (revenueSummary[0].refunded_orders / revenueSummary[0].total_orders) * 100 : 0;

    res.json({
      error: false,
      seller: {
        _id: seller[0].id,
        fullName: seller[0].full_name,
        email: seller[0].email,
        role: seller[0].role
      },
      financial: {
        period: period,
        days: days,
        summary: {
          ...revenueSummary[0],
          profitMargin: Math.round(profitMargin * 100) / 100,
          refundRate: Math.round(refundRate * 100) / 100
        },
        transactions,
        monthlyRevenue
      }
    });
  } catch (error) {
    logger.error('Error fetching seller financial data:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch seller financial data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get seller performance data
router.get('/sellers/:sellerId/performance', asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { period = '30' } = req.query;
  const days = parseInt(period);

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, full_name, email, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Get performance metrics
    const performance = await executeQuery(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN o.status = 'refunded' THEN 1 END) as refunded_orders,
        AVG(CASE WHEN o.status = 'delivered' THEN DATEDIFF(o.updated_at, o.created_at) END) as avg_delivery_time,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM orders o
      WHERE o.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [sellerId, days]);

    // Calculate performance scores
    const totalOrders = performance[0].total_orders || 0;
    const deliveredOrders = performance[0].delivered_orders || 0;
    const cancelledOrders = performance[0].cancelled_orders || 0;
    const refundedOrders = performance[0].refunded_orders || 0;
    const uniqueCustomers = performance[0].unique_customers || 0;
    const avgDeliveryTime = performance[0].avg_delivery_time || 0;

    // Calculate fulfillment rate
    const fulfillmentRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    // Calculate cancellation rate
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Calculate refund rate
    const refundRate = totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0;

    // Calculate customer retention (simplified)
    const customerRetention = uniqueCustomers > 0 ? Math.min(100, (uniqueCustomers / Math.max(1, totalOrders / 3)) * 100) : 0;

    // Get response time (simplified - in real implementation this would track actual response times)
    const responseTime = Math.floor(Math.random() * 24) + 1; // Mock data for now

    // Get customer satisfaction (simplified - in real implementation this would be from reviews/ratings)
    const customerSatisfaction = 4.2 + (Math.random() * 0.8); // Mock data between 4.2-5.0

    // Get performance trends
    const performanceTrends = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM orders
      WHERE seller_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [sellerId, days]);

    res.json({
      error: false,
      seller: {
        _id: seller[0].id,
        fullName: seller[0].full_name,
        email: seller[0].email,
        role: seller[0].role
      },
      performance: {
        period: period,
        days: days,
        metrics: {
          totalOrders,
          deliveredOrders,
          cancelledOrders,
          refundedOrders,
          uniqueCustomers,
          avgDeliveryTime: Math.round(avgDeliveryTime * 100) / 100
        },
        scores: {
          fulfillmentRate: Math.round(fulfillmentRate * 100) / 100,
          cancellationRate: Math.round(cancellationRate * 100) / 100,
          refundRate: Math.round(refundRate * 100) / 100,
          customerRetention: Math.round(customerRetention * 100) / 100,
          responseTime,
          customerSatisfaction: Math.round(customerSatisfaction * 100) / 100
        },
        trends: performanceTrends
      }
    });
  } catch (error) {
    logger.error('Error fetching seller performance data:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch seller performance data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Compare sellers
router.get('/sellers/compare', asyncHandler(async (req, res) => {
  const { sellerIds, period = '30' } = req.query;
  const days = parseInt(period);

  if (!sellerIds || !Array.isArray(sellerIds) || sellerIds.length < 2 || sellerIds.length > 5) {
    return res.status(400).json({
      error: true,
      message: 'Please provide 2-5 seller IDs to compare'
    });
  }

  try {
    // Get seller information
    const sellers = await executeQuery(`
      SELECT id, full_name, email, role, status, created_at
      FROM users 
      WHERE id IN (?) AND role = 'seller'
    `, [sellerIds]);

    if (sellers.length !== sellerIds.length) {
      return res.status(400).json({
        error: true,
        message: 'Some seller IDs are invalid or not found'
      });
    }

    // Get comparison data for each seller
    const comparisonData = await Promise.all(sellers.map(async (seller) => {
      // Get basic stats
      const stats = await executeQuery(`
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(o.total_amount), 0) as total_revenue,
          COALESCE(AVG(o.total_amount), 0) as average_order_value,
          COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
          COUNT(DISTINCT p.id) as total_products,
          COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
        FROM users u
        LEFT JOIN orders o ON u.id = o.seller_id AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        LEFT JOIN products p ON u.id = p.created_by
        WHERE u.id = ?
      `, [days, seller.id]);

      // Get performance metrics
      const performance = await executeQuery(`
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
          AVG(CASE WHEN o.status = 'delivered' THEN DATEDIFF(o.updated_at, o.created_at) END) as avg_delivery_time,
          COUNT(DISTINCT o.customer_id) as unique_customers
        FROM orders o
        WHERE o.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [seller.id, days]);

      // Calculate scores
      const totalOrders = stats[0].total_orders || 0;
      const deliveredOrders = performance[0].delivered_orders || 0;
      const fulfillmentRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
      const avgDeliveryTime = performance[0].avg_delivery_time || 0;

      return {
        seller: {
          _id: seller.id,
          fullName: seller.full_name,
          email: seller.email,
          role: seller.role,
          status: seller.status,
          createdAt: seller.created_at
        },
        stats: {
          totalOrders,
          totalRevenue: stats[0].total_revenue || 0,
          averageOrderValue: stats[0].average_order_value || 0,
          deliveredOrders,
          cancelledOrders: performance[0].cancelled_orders || 0,
          totalProducts: stats[0].total_products || 0,
          activeProducts: stats[0].active_products || 0,
          uniqueCustomers: performance[0].unique_customers || 0
        },
        scores: {
          fulfillmentRate: Math.round(fulfillmentRate * 100) / 100,
          avgDeliveryTime: Math.round(avgDeliveryTime * 100) / 100
        }
      };
    }));

    // Calculate averages for benchmarking
    const totalRevenue = comparisonData.reduce((sum, data) => sum + data.stats.totalRevenue, 0);
    const avgRevenue = totalRevenue / comparisonData.length;
    const avgFulfillmentRate = comparisonData.reduce((sum, data) => sum + data.scores.fulfillmentRate, 0) / comparisonData.length;
    const avgDeliveryTime = comparisonData.reduce((sum, data) => sum + data.scores.avgDeliveryTime, 0) / comparisonData.length;

    res.json({
      error: false,
      comparison: {
        period: period,
        days: days,
        sellers: comparisonData,
        benchmarks: {
          averageRevenue: Math.round(avgRevenue * 100) / 100,
          averageFulfillmentRate: Math.round(avgFulfillmentRate * 100) / 100,
          averageDeliveryTime: Math.round(avgDeliveryTime * 100) / 100
        }
      }
    });
  } catch (error) {
    logger.error('Error comparing sellers:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to compare sellers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get all sellers with analytics
router.get('/sellers', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;
  
  let whereClause = "u.role = 'seller'";
  const params = [];

  if (status && status !== 'all') {
    whereClause += ' AND u.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  // Validate sort parameters
  const allowedSortFields = ['created_at', 'full_name', 'email', 'status'];
  const allowedSortOrders = ['asc', 'desc'];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const finalSortOrder = allowedSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

  try {
    const sellers = await executeQuery(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.business_info, 
        u.status, 
        u.created_at,
        u.last_login,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      LEFT JOIN orders o ON u.id = o.seller_id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY ${finalSortBy} ${finalSortOrder}
      LIMIT ? OFFSET ?
    `, [...params, parsedLimit, offset]);

    // Parse business_info JSON
    sellers.forEach(seller => {
      if (seller.business_info) {
        try {
          seller.business_info = JSON.parse(seller.business_info);
        } catch (e) {
          seller.business_info = {};
        }
      }
    });

    // Get total count for pagination
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
      params
    );

    // Transform to match frontend interface
    const transformedSellers = sellers.map(seller => ({
      _id: seller.id,
      fullName: seller.full_name,
      email: seller.email,
      businessInfo: seller.business_info,
      status: seller.status,
      createdAt: seller.created_at,
      lastLogin: seller.last_login,
      totalProducts: seller.total_products || 0,
      activeProducts: seller.active_products || 0,
      totalOrders: seller.total_orders || 0,
      totalRevenue: seller.total_revenue || 0
    }));

    res.json({
      error: false,
      sellers: transformedSellers,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / parsedLimit)
      }
    });
  } catch (error) {
    logger.error('Error fetching sellers:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch sellers data'
    });
  }
}));

// Update seller status
router.put('/sellers/:sellerId/status', [
  body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { sellerId } = req.params;
  const { status } = req.body;

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Update seller status
    await executeQuery(
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date(), sellerId]
    );

    res.json({
      error: false,
      message: 'Seller status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating seller status:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update seller status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Suspend seller
router.put('/sellers/:sellerId/suspend', [
  body('reason').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  body('duration').optional().isInt({ min: 1, max: 365 }).withMessage('Duration must be between 1 and 365 days')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { sellerId } = req.params;
  const { reason, duration } = req.body;

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Calculate suspension end date
    const suspensionEndDate = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

    // Update seller status to suspended
    await executeQuery(
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      ['suspended', new Date(), sellerId]
    );

    // In a real implementation, you would store suspension details in a separate table
    // For now, we'll return a success response
    const suspensionData = {
      sellerId,
      reason: reason || 'No reason provided',
      duration: duration || null,
      suspendedAt: new Date().toISOString(),
      suspendedBy: req.userId,
      suspensionEndDate: suspensionEndDate ? suspensionEndDate.toISOString() : null
    };

    res.json({
      error: false,
      message: 'Seller suspended successfully',
      suspension: suspensionData
    });
  } catch (error) {
    logger.error('Error suspending seller:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to suspend seller',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Unsuspend seller
router.put('/sellers/:sellerId/unsuspend', asyncHandler(async (req, res) => {
  const { sellerId } = req.params;

  try {
    // Check if seller exists and is suspended
    const seller = await executeQuery('SELECT id, role, status FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    if (seller[0].status !== 'suspended') {
      return res.status(400).json({
        error: true,
        message: 'Seller is not currently suspended'
      });
    }

    // Update seller status to active
    await executeQuery(
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      ['active', new Date(), sellerId]
    );

    res.json({
      error: false,
      message: 'Seller unsuspended successfully'
    });
  } catch (error) {
    logger.error('Error unsuspending seller:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to unsuspend seller',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Verify seller
router.put('/sellers/:sellerId/verify', [
  body('verificationType').isIn(['email', 'phone', 'business', 'all']).withMessage('Invalid verification type'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { sellerId } = req.params;
  const { verificationType, notes } = req.body;

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, role, email_verified, phone_verified FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    const updates = [];
    const params = [];

    // Update verification status based on type
    if (verificationType === 'email' || verificationType === 'all') {
      updates.push('email_verified = TRUE');
    }

    if (verificationType === 'phone' || verificationType === 'all') {
      updates.push('phone_verified = TRUE');
    }

    if (verificationType === 'business' || verificationType === 'all') {
      // In a real implementation, you might have a business_verified field
      // For now, we'll just update the status to active
      updates.push('status = "active"');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid verification type'
      });
    }

    updates.push('updated_at = ?');
    params.push(new Date(), sellerId);

    // Update seller verification status
    await executeQuery(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // In a real implementation, you would store verification details in a separate table
    const verificationData = {
      sellerId,
      verificationType,
      verifiedAt: new Date().toISOString(),
      verifiedBy: req.userId,
      notes: notes || null
    };

    res.json({
      error: false,
      message: 'Seller verification completed successfully',
      verification: verificationData
    });
  } catch (error) {
    logger.error('Error verifying seller:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to verify seller',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Add seller note
router.post('/sellers/:sellerId/notes', [
  body('note').trim().isLength({ min: 1, max: 1000 }).withMessage('Note must be between 1 and 1000 characters'),
  body('type').optional().isIn(['general', 'warning', 'info', 'critical']).withMessage('Invalid note type')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { sellerId } = req.params;
  const { note, type = 'general' } = req.body;

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // In a real implementation, you would store notes in a separate table
    // For now, we'll return a success response
    const noteData = {
      id: Date.now().toString(), // Simple ID generation
      sellerId,
      note,
      type,
      createdBy: req.userId,
      createdAt: new Date().toISOString()
    };

    res.json({
      error: false,
      message: 'Note added successfully',
      note: noteData
    });
  } catch (error) {
    logger.error('Error adding seller note:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to add note',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get seller notes
router.get('/sellers/:sellerId/notes', asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { page = 1, limit = 20, type } = req.query;
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // In a real implementation, you would fetch notes from a separate table
    // For now, we'll return mock data
    const mockNotes = [
      {
        id: '1',
        sellerId,
        note: 'Seller account created and verified',
        type: 'info',
        createdBy: 'system',
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: '2',
        sellerId,
        note: 'Business information updated',
        type: 'general',
        createdBy: req.userId,
        createdAt: new Date().toISOString()
      }
    ];

    // Filter by type if specified
    const filteredNotes = type && type !== 'all' ? 
      mockNotes.filter(note => note.type === type) : 
      mockNotes;

    // Apply pagination
    const totalNotes = filteredNotes.length;
    const paginatedNotes = filteredNotes.slice(offset, offset + parsedLimit);

    res.json({
      error: false,
      notes: paginatedNotes,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: totalNotes,
        pages: Math.ceil(totalNotes / parsedLimit)
      }
    });
  } catch (error) {
    logger.error('Error fetching seller notes:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch notes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Delete seller
router.delete('/sellers/:sellerId', asyncHandler(async (req, res) => {
  const { sellerId } = req.params;

  try {
    // Check if seller exists
    const seller = await executeQuery('SELECT id, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Prevent deletion of the last admin
    if (seller[0].role === 'admin') {
      const adminCount = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          error: true,
          message: 'Cannot delete the last admin user'
        });
      }
    }

    // Delete user (cascade will handle related records due to foreign key constraints)
    await executeQuery('DELETE FROM users WHERE id = ?', [sellerId]);

    res.json({
      error: false,
      message: 'Seller deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting seller:', error);
    
    // Check for foreign key constraint violations
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete seller. Seller has associated orders, products, or other data that must be removed first.'
      });
    }

    res.status(500).json({
      error: true,
      message: 'Failed to delete seller',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Bulk update sellers
router.put('/sellers/bulk', [
  body('sellerIds').isArray().withMessage('sellerIds must be an array'),
  body('updates').isObject().withMessage('Updates must be an object')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { sellerIds, updates } = req.body;

  try {
    // Validate updates object
    const allowedFields = ['status', 'email_verified', 'phone_verified'];
    const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field));
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No valid fields to update. Allowed fields: status, email_verified, phone_verified'
      });
    }

    // Check if all seller IDs are valid
    const sellers = await executeQuery(
      'SELECT id, role FROM users WHERE id IN (?) AND role = "seller"',
      [sellerIds]
    );

    if (sellers.length !== sellerIds.length) {
      return res.status(400).json({
        error: true,
        message: 'Some seller IDs are invalid or not found'
      });
    }

    // Build update query
    const updateClause = updateFields.map(field => `${field} = ?`).join(', ');
    const params = [...updateFields.map(field => updates[field]), new Date()];

    // Update sellers
    await executeQuery(
      `UPDATE users SET ${updateClause}, updated_at = ? WHERE id IN (?)`,
      [...params, sellerIds]
    );

    res.json({
      error: false,
      message: `${sellerIds.length} sellers updated successfully`
    });
  } catch (error) {
    logger.error('Error bulk updating sellers:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update sellers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Bulk delete sellers
router.delete('/sellers/bulk', [
  body('sellerIds').isArray().withMessage('sellerIds must be an array')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { sellerIds } = req.body;

  try {
    // Check if all seller IDs are valid
    const sellers = await executeQuery(
      'SELECT id, role FROM users WHERE id IN (?) AND role = "seller"',
      [sellerIds]
    );

    if (sellers.length !== sellerIds.length) {
      return res.status(400).json({
        error: true,
        message: 'Some seller IDs are invalid or not found'
      });
    }

    // Check for active orders and products
    const activeOrders = await executeQuery(`
      SELECT COUNT(*) as count FROM orders 
      WHERE seller_id IN (?) AND status IN ('pending', 'confirmed', 'processing', 'shipped')
    `, [sellerIds]);

    if (activeOrders[0].count > 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete sellers with active orders. Please cancel or complete all orders first.'
      });
    }

    const activeProducts = await executeQuery(`
      SELECT COUNT(*) as count FROM products 
      WHERE created_by IN (?) AND is_active = TRUE
    `, [sellerIds]);

    if (activeProducts[0].count > 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete sellers with active products. Please deactivate all products first.'
      });
    }

    // Delete sellers
    await executeQuery('DELETE FROM users WHERE id IN (?)', [sellerIds]);

    res.json({
      error: false,
      message: `${sellerIds.length} sellers deleted successfully`
    });
  } catch (error) {
    logger.error('Error bulk deleting sellers:', error);
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete some sellers. They have associated data that must be removed first.'
      });
    }

    res.status(500).json({
      error: true,
      message: 'Failed to delete sellers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Export sellers
router.get('/sellers/export', asyncHandler(async (req, res) => {
  const { status, format = 'json', startDate, endDate } = req.query;
  
  try {
    let whereClause = "u.role = 'seller'";
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (startDate && endDate) {
      whereClause += ' AND u.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const sellers = await executeQuery(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.phone_number,
        u.business_info, 
        u.status, 
        u.email_verified,
        u.phone_verified,
        u.created_at, 
        u.last_login,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      LEFT JOIN orders o ON u.id = o.seller_id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `, params);

    // Parse business_info JSON
    sellers.forEach(seller => {
      if (seller.business_info) {
        try {
          seller.business_info = JSON.parse(seller.business_info);
        } catch (e) {
          seller.business_info = {};
        }
      }
    });

    // Transform to match frontend interface
    const transformedSellers = sellers.map(seller => ({
      _id: seller.id,
      fullName: seller.full_name,
      email: seller.email,
      phoneNumber: seller.phone_number,
      businessInfo: seller.business_info,
      status: seller.status,
      isEmailVerified: seller.email_verified,
      isPhoneVerified: seller.phone_verified,
      createdAt: seller.created_at,
      lastLogin: seller.last_login,
      totalProducts: seller.total_products || 0,
      activeProducts: seller.active_products || 0,
      totalOrders: seller.total_orders || 0,
      totalRevenue: seller.total_revenue || 0
    }));

    if (format === 'csv') {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sellers-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Convert to CSV format
      const csvHeaders = ['ID', 'Full Name', 'Email', 'Phone', 'Status', 'Email Verified', 'Phone Verified', 'Created At', 'Last Login', 'Total Products', 'Active Products', 'Total Orders', 'Total Revenue'];
      const csvData = transformedSellers.map(seller => [
        seller._id,
        seller.fullName,
        seller.email,
        seller.phoneNumber || '',
        seller.status,
        seller.isEmailVerified ? 'Yes' : 'No',
        seller.isPhoneVerified ? 'Yes' : 'No',
        seller.createdAt,
        seller.lastLogin || '',
        seller.totalProducts,
        seller.activeProducts,
        seller.totalOrders,
        seller.totalRevenue
      ]);
      
      const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      res.send(csvContent);
    } else {
      // Return JSON format
      res.json({
        error: false,
        sellers: transformedSellers,
        exportInfo: {
          format: 'json',
          totalSellers: transformedSellers.length,
          exportDate: new Date().toISOString(),
          filters: { status, startDate, endDate }
        }
      });
    }
  } catch (error) {
    logger.error('Error exporting sellers:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to export sellers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Search sellers
router.get('/sellers/search', asyncHandler(async (req, res) => {
  const { q, status, verified, limit = 10 } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({
      error: true,
      message: 'Search query is required'
    });
  }

  try {
    let whereClause = "u.role = 'seller'";
    const params = [];
    const searchTerm = `%${q.trim()}%`;

    // Add search conditions
    whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)';
    params.push(searchTerm, searchTerm, searchTerm);

    // Add status filter
    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    // Add verification filter
    if (verified === 'true') {
      whereClause += ' AND u.email_verified = TRUE AND u.phone_verified = TRUE';
    } else if (verified === 'false') {
      whereClause += ' AND (u.email_verified = FALSE OR u.phone_verified = FALSE)';
    }

    const sellers = await executeQuery(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.phone_number,
        u.business_info, 
        u.status, 
        u.email_verified,
        u.phone_verified,
        u.created_at,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      LEFT JOIN orders o ON u.id = o.seller_id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY 
        CASE 
          WHEN u.full_name LIKE ? THEN 1
          WHEN u.email LIKE ? THEN 2
          ELSE 3
        END,
        u.created_at DESC
      LIMIT ?
    `, [...params, searchTerm, searchTerm, parseInt(limit)]);

    // Parse business_info JSON
    sellers.forEach(seller => {
      if (seller.business_info) {
        try {
          seller.business_info = JSON.parse(seller.business_info);
        } catch (e) {
          seller.business_info = {};
        }
      }
    });

    // Transform to match frontend interface
    const transformedSellers = sellers.map(seller => ({
      _id: seller.id,
      fullName: seller.full_name,
      email: seller.email,
      phoneNumber: seller.phone_number,
      businessInfo: seller.business_info,
      status: seller.status,
      isEmailVerified: seller.email_verified,
      isPhoneVerified: seller.phone_verified,
      createdAt: seller.created_at,
      totalProducts: seller.total_products || 0,
      totalOrders: seller.total_orders || 0,
      totalRevenue: seller.total_revenue || 0
    }));

    res.json({
      error: false,
      sellers: transformedSellers,
      searchInfo: {
        query: q.trim(),
        totalResults: transformedSellers.length,
        filters: { status, verified }
      }
    });
  } catch (error) {
    logger.error('Error searching sellers:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to search sellers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get orders management
router.get('/orders', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;
  
  let whereClause = '1=1';
  const params = [];

  if (status) {
    whereClause += ' AND o.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (o.order_number LIKE ? OR c.full_name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const orders = await executeQuery(`
    SELECT o.*, c.full_name as customer_name, s.full_name as seller_name
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.id
    LEFT JOIN users s ON o.seller_id = s.id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  res.json({
    error: false,
    orders
  });
}));

// Update order status
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).withMessage('Invalid status')
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
  const { status } = req.body;

  await executeQuery(
    'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
    [status, new Date(), id]
  );

  res.json({
    error: false,
    message: 'Order status updated successfully'
  });
}));

// Create product
router.post('/products', productImageUpload.array('images', 10), [
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category_id').optional(),
  body('categoryId').optional()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { name, description, price, is_active = true } = req.body;
  const categoryId = (req.body.category_id || req.body.categoryId || '').trim() || null;

  // Check if category exists
  if (categoryId) {
    const category = await executeQuery(
      'SELECT id FROM categories WHERE id = ?',
      [categoryId]
    );
    if (category.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid category ID'
      });
    }
  }

  // Prepare image URLs
  const files = req.files || [];
  const imageUrls = files.map(f => `/uploads/products/${f.filename}`);

  const id = uuidv4();
  await executeQuery(
    'INSERT INTO products (id, name, description, price, category_id, images, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, description, price, categoryId, imageUrls.length ? JSON.stringify(imageUrls) : null, is_active, req.userId, new Date(), new Date()]
  );

  res.status(201).json({
    error: false,
    message: 'Product created successfully',
    productId: id
  });
}));

// Update product
router.put('/products/:id', productImageUpload.array('images', 10), [
  body('name').optional().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().notEmpty().withMessage('Product description cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category_id').optional(),
  body('categoryId').optional(),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
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
  const { name, description, price, is_active } = req.body;
  const rawCat = (req.body.category_id ?? req.body.categoryId ?? '').toString();
  const categoryId = rawCat.trim() === '' ? null : rawCat;

  // Check if product exists
  const product = await executeQuery(
    'SELECT id FROM products WHERE id = ?',
    [id]
  );

  if (product.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Product not found'
    });
  }

  // Check if category exists if updating category
  if (categoryId) {
    const category = await executeQuery(
      'SELECT id FROM categories WHERE id = ?',
      [categoryId]
    );

    if (category.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid category ID'
      });
    }
  }

  // Build update query dynamically
  const updateFields = [];
  const updateValues = [];

  if (name !== undefined) {
    updateFields.push('name = ?');
    updateValues.push(name);
  }
  if (description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(description);
  }
  if (price !== undefined) {
    updateFields.push('price = ?');
    updateValues.push(price);
  }
  if (categoryId !== undefined) {
    updateFields.push('category_id = ?');
    updateValues.push(categoryId);
  }

  // Handle additional images on update
  if (req.files && req.files.length > 0) {
    const existing = await executeQuery('SELECT images FROM products WHERE id = ?', [id]);
    let current = [];
    if (existing[0]?.images) {
      try { current = JSON.parse(existing[0].images) || []; } catch {}
    }
    const added = req.files.map(f => `/uploads/products/${f.filename}`);
    const merged = [...current, ...added];
    updateFields.push('images = ?');
    updateValues.push(JSON.stringify(merged));
  }
  if (is_active !== undefined) {
    updateFields.push('is_active = ?');
    updateValues.push(is_active);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({
      error: true,
      message: 'No fields to update'
    });
  }

  updateFields.push('updated_at = ?');
  updateValues.push(new Date());
  updateValues.push(id);

  // Update product
  await executeQuery(
    `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  res.json({
    error: false,
    message: 'Product updated successfully'
  });
}));

// Get products management
router.get('/products', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, search, status } = req.query;
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;
  
  let whereClause = '1=1';
  const params = [];

  if (category) {
    whereClause += ' AND p.category_id = ?';
    params.push(category);
  }

  if (status && status !== 'all') {
    whereClause += ' AND p.is_active = ?';
    params.push(status === 'active');
  }

  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const products = await executeQuery(`
    SELECT 
      p.id as _id,
      p.name,
      p.description,
      p.price,
      p.category_id,
      c.name as category,
      p.images,
      p.is_active as isActive,
      p.created_at as createdAt,
      u.full_name as created_by_name,
      u.id as seller_id,
      u.full_name as seller_fullName,
      u.business_info as seller_businessInfo
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count for pagination
  const countResult = await executeQuery(
    `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`,
    params
  );
  
  const total = countResult[0]?.total || 0;
  const totalPages = Math.ceil(total / parsedLimit);

  // Transform products to match frontend interface
  const transformedProducts = products.map(product => {
    let businessInfo = {};
    if (product.seller_businessInfo) {
      try {
        businessInfo = JSON.parse(product.seller_businessInfo);
      } catch (e) {
        console.error('Error parsing business_info for product:', product._id, e);
        businessInfo = {};
      }
    }

    let images = [];
    if (product.images) {
      try {
        images = JSON.parse(product.images);
      } catch (e) {
        console.error('Error parsing images for product:', product._id, e);
        images = [];
      }
    }

    // Ensure all required fields are present with fallbacks
    const transformedProduct = {
      _id: product._id,
      images,
      name: product.name || 'Unnamed Product',
      category: product.category || 'Uncategorized',
      price: parseFloat(product.price) || 0,
      isActive: Boolean(product.isActive),
      createdAt: product.createdAt || new Date().toISOString(),
      description: product.description || '',
      seller: {
        _id: product.seller_id || product.created_by,
        fullName: product.seller_fullName || product.created_by_name,
        businessInfo
      }
    };

    return transformedProduct;
  });

  res.json({
    error: false,
    products: transformedProducts,
    total,
    totalPages,
    currentPage: parsedPage
  });
}));

// Update product status
router.put('/products/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
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
  const { isActive } = req.body;

  await executeQuery(
    'UPDATE products SET is_active = ?, updated_at = ? WHERE id = ?',
    [isActive, new Date(), id]
  );

  res.json({
    error: false,
    message: 'Product status updated successfully'
  });
}));

// Delete product
router.delete('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if product exists
  const product = await executeQuery(
    'SELECT id FROM products WHERE id = ?',
    [id]
  );

  if (product.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Product not found'
    });
  }

  // Delete the product
  await executeQuery(
    'DELETE FROM products WHERE id = ?',
    [id]
  );

  res.json({
    error: false,
    message: 'Product deleted successfully'
  });
}));

// Get categories for products
router.get('/categories', asyncHandler(async (req, res) => {
  try {
    const categories = await executeQuery(
      'SELECT id, name FROM categories ORDER BY name ASC'
    );

    res.json({
      error: false,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch categories'
    });
  }
}));

// Get sellers for products
router.get('/sellers', asyncHandler(async (req, res) => {
  try {
    const sellers = await executeQuery(
      'SELECT id, full_name, business_info FROM users WHERE role = "seller" AND status = "active" ORDER BY full_name ASC'
    );

    // Parse business_info JSON for each seller
    const formattedSellers = sellers.map(seller => {
      let businessInfo = {};
      if (seller.business_info) {
        try {
          businessInfo = JSON.parse(seller.business_info);
        } catch (e) {
          console.error('Error parsing business_info for seller:', seller.id, e);
          businessInfo = {};
        }
      }

      return {
        id: seller.id,
        fullName: seller.full_name,
        storeName: businessInfo.storeName || businessInfo.business_name || seller.full_name
      };
    });

    res.json({
      error: false,
      sellers: formattedSellers
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch sellers'
    });
  }
}));

// Get shops management
router.get('/shops', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, type } = req.query;
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20));
    const offset = (parsedPage - 1) * parsedLimit;
    
    let whereClause = "u.role = 'seller'";
    const params = [];

    if (status) {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (type && type !== 'all') {
      whereClause += ' AND JSON_EXTRACT(u.business_info, "$.business_type") = ?';
      params.push(type);
    }

    if (search) {
      whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    const shops = await executeQuery(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.business_info, 
        u.status, 
        u.created_at,
        COUNT(p.id) as total_products,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, parsedLimit, offset]);

    // Parse business_info JSON
    shops.forEach(shop => {
      if (shop.business_info) {
        try {
          shop.business_info = JSON.parse(shop.business_info);
        } catch (e) {
          shop.business_info = {};
        }
      }
    });

    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
      params
    );

    res.json({
      error: false,
      shops,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parsedLimit)
      }
    });
  } catch (error) {
    logger.error('Error fetching shops:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch shops data'
    });
  }
}));

// Get individual shop
router.get('/shops/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const shop = await executeQuery(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.business_info, 
        u.status, 
        u.created_at,
        COUNT(p.id) as total_products,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      WHERE u.id = ? AND u.role = 'seller'
      GROUP BY u.id
    `, [id]);

    if (shop.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Shop not found'
      });
    }

    // Parse business_info JSON
    if (shop[0].business_info) {
      try {
        shop[0].business_info = JSON.parse(shop[0].business_info);
        logger.info(`🔍 GET /shops/${id} - Parsed business_info:`, shop[0].business_info);
      } catch (e) {
        logger.error(`🔍 GET /shops/${id} - Error parsing business_info:`, e);
        shop[0].business_info = {};
      }
    }

    logger.info(`🔍 GET /shops/${id} - Returning shop data:`, shop[0]);

    res.json({
      error: false,
      shop: shop[0]
    });
  } catch (error) {
    logger.error('Error fetching shop:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch shop data'
    });
  }
}));

// Update shop status
router.put('/shops/:id/status', [
  body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
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
  const { status } = req.body;

  await executeQuery(
    'UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND role = "seller"',
    [status, new Date(), id]
  );

  res.json({
    error: false,
    message: 'Shop status updated successfully',
    shopId: id,
    status
  });
}));

// Update shop information
router.put('/shops/:id', upload.single('logo'), [
  body('business_name').optional().isLength({ min: 1, max: 255 }).withMessage('Business name must be between 1 and 255 characters'),
  body('business_type').optional().isIn(['retail', 'wholesale', 'service', 'business', 'individual', 'corporation']).withMessage('Invalid business type'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  body('website').optional().custom((value) => {
    if (value === '' || value === undefined || value === null) return true;
    // Simple URL validation - check if it starts with http:// or https://
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return true;
    }
    return false;
  }).withMessage('Website must be a valid URL starting with http:// or https://'),
  body('instagram').optional().custom((value) => {
    if (value === '' || value === undefined || value === null) return true;
    return value.length <= 100;
  }).withMessage('Instagram handle too long'),
  body('facebook').optional().custom((value) => {
    if (value === '' || value === undefined || value === null) return true;
    if (value && typeof value === 'string' && value.trim() !== '') {
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return false;
      }
    }
    return value.length <= 500;
  }).withMessage('Facebook must be a valid URL starting with http:// or https:// and less than 500 characters'),
  body('tiktok').optional().custom((value) => {
    if (value === '' || value === undefined || value === null) return true;
    return value.length <= 100;
  }).withMessage('TikTok handle too long'),
  body('remove_logo').optional().isBoolean().withMessage('Remove logo must be a boolean')
], asyncHandler(async (req, res) => {
  // Handle multer errors
  if (req.fileValidationError) {
    return res.status(400).json({
      error: true,
      message: 'File validation failed',
      details: req.fileValidationError
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const updateData = req.body;

  // Add detailed logging
  logger.info(`🔍 Shop update request for ID: ${id}`);
  logger.info(`🔍 Update data received:`, updateData);
  logger.info(`🔍 Files received:`, req.file);
  
  // Log each field individually for debugging
  logger.info(`🔍 Business name: "${updateData.business_name}"`);
  logger.info(`🔍 Business type: "${updateData.business_type}"`);
  logger.info(`🔍 Description: "${updateData.description}"`);
  logger.info(`🔍 Status: "${updateData.status}"`);
  logger.info(`🔍 Website: "${updateData.website}"`);
  logger.info(`🔍 Instagram: "${updateData.instagram}"`);
  logger.info(`🔍 Facebook: "${updateData.facebook}"`);
  logger.info(`🔍 TikTok: "${updateData.tiktok}"`);

  try {
    // Get current shop data
    const currentShop = await executeQuery(
      'SELECT business_info FROM users WHERE id = ? AND role = "seller"',
      [id]
    );

    if (currentShop.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Shop not found'
      });
    }

    // Parse current business_info
    let businessInfo = {};
    if (currentShop[0].business_info) {
      try {
        businessInfo = JSON.parse(currentShop[0].business_info);
      } catch (e) {
        businessInfo = {};
      }
    }

    // Handle logo upload or removal
    if (req.file) {
      // Generate the URL for the uploaded logo
      const logoUrl = `/uploads/profiles/${req.file.filename}`;
      businessInfo.logo = logoUrl;
      logger.info(`Logo uploaded for shop ${id}: ${logoUrl}`);
    } else if (updateData.remove_logo === 'true' || updateData.remove_logo === true) {
      // Remove the logo
      businessInfo.logo = null;
      logger.info(`Logo removed for shop ${id}`);
    }

    // Update business_info with new data
    if (updateData.business_name !== undefined) businessInfo.business_name = updateData.business_name;
    if (updateData.business_type !== undefined) businessInfo.business_type = updateData.business_type;
    if (updateData.description !== undefined) businessInfo.description = updateData.description;
    if (updateData.website !== undefined) businessInfo.website = updateData.website;
    if (updateData.instagram !== undefined) businessInfo.instagram = updateData.instagram;
    if (updateData.facebook !== undefined) businessInfo.facebook = updateData.facebook;
    if (updateData.tiktok !== undefined) businessInfo.tiktok = updateData.tiktok;

    // Log the updated business info
    logger.info(`🔍 Updated business info:`, businessInfo);
    logger.info(`🔍 Business name from update:`, updateData.business_name);
    logger.info(`🔍 Business type from update:`, updateData.business_type);
    logger.info(`🔍 Description from update:`, updateData.description);
    logger.info(`🔍 Website from update:`, updateData.website);
    logger.info(`🔍 Instagram from update:`, updateData.instagram);
    logger.info(`🔍 Facebook from update:`, updateData.facebook);
    logger.info(`🔍 TikTok from update:`, updateData.tiktok);
    
    // Test: Add a timestamp to verify the update is working
    businessInfo.last_updated = new Date().toISOString();

    // Update the user record
    const updateQuery = `UPDATE users SET 
      business_info = ?, 
      status = ?,
      updated_at = ? 
     WHERE id = ? AND role = "seller"`;
    
    const updateParams = [
      JSON.stringify(businessInfo),
      updateData.status || 'active',
      new Date(),
      id
    ];

    logger.info(`🔍 Executing SQL update:`, updateQuery);
    logger.info(`🔍 Update parameters:`, updateParams);

    const updateResult = await executeQuery(updateQuery, updateParams);
    logger.info(`🔍 Update query result:`, updateResult);

    // Verify the update was successful
    const verifyUpdate = await executeQuery(
      'SELECT business_info FROM users WHERE id = ? AND role = "seller"',
      [id]
    );
    
    logger.info(`🔍 Verification query result:`, verifyUpdate[0]);
    
    // Parse and log the updated business_info to verify it was stored correctly
    if (verifyUpdate[0] && verifyUpdate[0].business_info) {
      try {
        const parsedBusinessInfo = JSON.parse(verifyUpdate[0].business_info);
        logger.info(`🔍 Parsed updated business_info:`, parsedBusinessInfo);
        logger.info(`🔍 Business name in stored data: "${parsedBusinessInfo.business_name}"`);
        logger.info(`🔍 Business type in stored data: "${parsedBusinessInfo.business_type}"`);
        logger.info(`🔍 Description in stored data: "${parsedBusinessInfo.description}"`);
        logger.info(`🔍 Website in stored data: "${parsedBusinessInfo.website}"`);
        logger.info(`🔍 Instagram in stored data: "${parsedBusinessInfo.instagram}"`);
        logger.info(`🔍 Facebook in stored data: "${parsedBusinessInfo.facebook}"`);
        logger.info(`🔍 TikTok in stored data: "${parsedBusinessInfo.tiktok}"`);
      } catch (parseError) {
        logger.error(`🔍 Error parsing updated business_info:`, parseError);
      }
    }

    res.json({
      error: false,
      message: 'Shop updated successfully'
    });
  } catch (error) {
    logger.error('Error updating shop:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({
      error: true,
      message: 'Failed to update shop'
    });
  }
}));

// Get system analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  try {
    // Handle complex query parameters like period[period]=month
    let period = 'month';
    if (req.query.period) {
      if (typeof req.query.period === 'object' && req.query.period.period) {
        period = req.query.period.period;
      } else if (typeof req.query.period === 'string') {
        period = req.query.period;
      }
    }
    
    // Convert period to days
    let days = 30;
    if (period === 'week') days = 7;
    else if (period === 'month') days = 30;
    else if (period === 'quarter') days = 90;
    else if (period === 'year') days = 365;
    else days = parseInt(period) || 30;

    // Get system-wide analytics with safe queries
    let systemStats = [{
      total_users: 0,
      total_sellers: 0,
      total_admins: 0,
      total_products: 0,
      recent_orders: 0,
      recent_revenue: 0,
      average_order_value: 0
    }];

    try {
      systemStats = await executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'seller') as total_sellers,
          (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
          (SELECT COUNT(*) FROM products) as total_products,
          (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as recent_orders,
          COALESCE((SELECT SUM(total_amount) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)), 0) as recent_revenue,
          COALESCE((SELECT AVG(total_amount) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)), 0) as average_order_value
        `, [days, days, days]);
    } catch (statsError) {
      // If stats query fails, use default values
      console.log('Stats query failed, using defaults:', statsError.message);
    }

    // Get recent activity safely
    let recentActivity = [];
    try {
      recentActivity = await executeQuery(`
        SELECT 
          'user_registered' as type,
          COALESCE(u.full_name, 'Unknown User') as name,
          COALESCE(u.email, 'No email') as details,
          u.created_at as timestamp
        FROM users u
        WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        UNION ALL
        SELECT 
          'order_placed' as type,
          CONCAT(COALESCE(c.full_name, 'Unknown Customer'), ' → ', COALESCE(s.full_name, 'Unknown Seller')) as name,
          CONCAT('Order #', COALESCE(o.order_number, 'N/A'), ' - $', COALESCE(o.total_amount, 0)) as details,
          o.created_at as timestamp
        FROM orders o
        LEFT JOIN users c ON o.customer_id = c.id
        LEFT JOIN users s ON o.seller_id = s.id
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY timestamp DESC
        LIMIT 20
      `, [days, days]);
    } catch (activityError) {
      // If activity query fails, use empty array
      console.log('Activity query failed, using empty array:', activityError.message);
    }

    // Get growth metrics safely
    let growthMetrics = [];
    try {
      growthMetrics = await executeQuery(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, [days]);
    } catch (growthError) {
      // If growth query fails, use empty array
      console.log('Growth query failed, using empty array:', growthError.message);
    }

    res.json({
      error: false,
      analytics: {
        period: period,
        days: days,
        stats: systemStats[0],
        recentActivity,
        growthMetrics
      }
    });
  } catch (error) {
    // Ultimate fallback - return basic analytics
    res.json({
      error: false,
      analytics: {
        period: 'month',
        days: 30,
        stats: {
          total_users: 0,
          total_sellers: 0,
          total_admins: 0,
          total_products: 0,
          recent_orders: 0,
          recent_revenue: 0,
          average_order_value: 0
        },
        recentActivity: [],
        growthMetrics: []
      }
    });
  }
}));

// Get system settings
router.get('/settings', asyncHandler(async (req, res) => {
  try {
    // For now, return default system settings
    // In a real application, these would be stored in a database
    const systemSettings = {
      site_name: 'W-Store',
      site_description: 'E-commerce platform for sellers and customers',
      maintenance_mode: false,
      registration_enabled: true,
      email_verification_required: true,
      phone_verification_required: false,
      max_file_size: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
      allowed_file_types: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
      currency: 'USD',
      timezone: 'UTC',
      date_format: 'YYYY-MM-DD',
      time_format: 'HH:mm:ss',
      pagination_limit: 20,
      session_timeout: 3600,
      max_login_attempts: 5,
      lockout_duration: 900,
      email_settings: {
        smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtp_port: parseInt(process.env.SMTP_PORT) || 587,
        smtp_user: process.env.SMTP_USER || '',
        smtp_from: process.env.SMTP_FROM || 'noreply@wstore.com'
      },
      payment_settings: {
        currency: 'USD',
        payment_methods: ['credit_card', 'paypal', 'bank_transfer'],
        minimum_payout: 50.00,
        payout_frequency: 'weekly'
      },
      notification_settings: {
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false
      }
    };

    res.json({
      error: false,
      settings: systemSettings
    });
  } catch (error) {
    logger.error('Error fetching system settings:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch system settings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Update system settings
router.put('/settings', asyncHandler(async (req, res) => {
  try {
    const {
      site_name,
      site_description,
      maintenance_mode,
      registration_enabled,
      email_verification_required,
      phone_verification_required,
      currency,
      timezone,
      date_format,
      time_format,
      pagination_limit,
      session_timeout,
      max_login_attempts,
      lockout_duration,
      email_settings,
      payment_settings,
      notification_settings
    } = req.body;

    // Validate required fields
    if (!site_name || !site_description) {
      return res.status(400).json({
        error: true,
        message: 'Site name and description are required'
      });
    }

    // In a real application, these settings would be saved to a database
    // For now, we'll just return success
    logger.info('System settings updated by admin:', req.user.email);

    res.json({
      error: false,
      message: 'System settings updated successfully',
      settings: {
        site_name,
        site_description,
        maintenance_mode,
        registration_enabled,
        email_verification_required,
        phone_verification_required,
        currency,
        timezone,
        date_format,
        time_format,
        pagination_limit,
        session_timeout,
        max_login_attempts,
        lockout_duration,
        email_settings,
        payment_settings,
        notification_settings
      }
    });
  } catch (error) {
    logger.error('Error updating system settings:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update system settings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Send announcement
router.post('/announcements', asyncHandler(async (req, res) => {
  try {
    const {
      title,
      message,
      priority = 'normal',
      targetRole,
      expiresAt
    } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        error: true,
        message: 'Title and message are required'
      });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid priority level'
      });
    }

    // Create notification for all users or specific role
    let targetUsers = [];
    if (targetRole && targetRole !== 'all') {
      targetUsers = await executeQuery(
        'SELECT id FROM users WHERE role = ? AND status = "active"',
        [targetRole]
      );
    } else {
      targetUsers = await executeQuery(
        'SELECT id FROM users WHERE status = "active"'
      );
    }

    // Create notifications for all target users
    const notificationPromises = targetUsers.map(user => {
      const notificationId = uuidv4();
      return executeQuery(`
        INSERT INTO notifications (id, recipient_id, type, title, message, data, priority, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notificationId,
        user.id,
        'announcement',
        title,
        message,
        JSON.stringify({
          sender: req.user.id,
          sender_name: req.user.full_name,
          target_role: targetRole || 'all'
        }),
        priority,
        expiresAt || null
      ]);
    });

    await Promise.all(notificationPromises);

    logger.info(`Announcement sent by admin ${req.user.email} to ${targetUsers.length} users`);

    res.json({
      error: false,
      message: `Announcement sent successfully to ${targetUsers.length} users`,
      announcement: {
        title,
        message,
        priority,
        targetRole: targetRole || 'all',
        expiresAt,
        recipientsCount: targetUsers.length
      }
    });
  } catch (error) {
    logger.error('Error sending announcement:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to send announcement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get admin analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    // Get user growth analytics
    const userGrowth = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users,
        SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_users
      FROM users 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [days]);

    // Get order analytics
    const orderAnalytics = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [days]);

    // Get product analytics
    const productAnalytics = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_products,
        SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_products
      FROM products 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [days]);

    // Get top performing categories
    const topCategories = await executeQuery(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as product_count,
        COALESCE(SUM(oi.total_price), 0) as total_sales
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'delivered' OR o.status IS NULL
      GROUP BY c.id, c.name
      ORDER BY total_sales DESC
      LIMIT 10
    `);

    // Get top performing sellers
    const topSellers = await executeQuery(`
      SELECT 
        u.full_name as seller_name,
        u.email as seller_email,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        AVG(o.total_amount) as avg_order_value
      FROM users u
      LEFT JOIN orders o ON u.id = o.seller_id
      WHERE u.role = 'seller' AND (o.status = 'delivered' OR o.status IS NULL)
      GROUP BY u.id, u.full_name, u.email
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    res.json({
      error: false,
      analytics: {
        period: days,
        userGrowth,
        orderAnalytics,
        productAnalytics,
        topCategories,
        topSellers
      }
    });
  } catch (error) {
    logger.error('Error fetching admin analytics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get shops management data
router.get('/shops', asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      businessType,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    let whereClause = 'u.role = "seller"';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.business_info LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (businessType && businessType !== 'all') {
      whereClause += ' AND JSON_EXTRACT(u.business_info, "$.business_type") = ?';
      params.push(businessType);
    }

    // Validate sortBy and sortOrder
    const validSortFields = ['full_name', 'email', 'created_at', 'status'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (!validSortFields.includes(sortBy)) {
      sortBy = 'created_at';
    }
    if (!validSortOrders.includes(sortOrder.toUpperCase())) {
      sortOrder = 'DESC';
    }

    const shops = await executeQuery(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone_number,
        u.status,
        u.business_info,
        u.profile_image,
        u.created_at,
        u.last_login,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      LEFT JOIN orders o ON u.id = o.seller_id AND o.status = 'delivered'
      WHERE ${whereClause}
      GROUP BY u.id, u.full_name, u.email, u.phone_number, u.status, u.business_info, u.profile_image, u.created_at, u.last_login
      ORDER BY u.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...params, parsedLimit, offset]);

    // Get total count for pagination
    const totalCount = await executeQuery(`
      SELECT COUNT(*) as total FROM users u WHERE ${whereClause}
    `, params);

    // Transform shops data
    const transformedShops = shops.map(shop => {
      let businessInfo = {};
      try {
        if (shop.business_info && shop.business_info !== '[object Object]') {
          businessInfo = JSON.parse(shop.business_info);
        }
      } catch (e) {
        businessInfo = {};
      }

      return {
        ...shop,
        business_info: businessInfo,
        business_name: businessInfo.business_name || 'N/A',
        business_type: businessInfo.business_type || 'N/A'
      };
    });

    res.json({
      error: false,
      shops: transformedShops,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: totalCount[0]?.total || 0,
        totalPages: Math.ceil((totalCount[0]?.total || 0) / parsedLimit)
      }
    });
  } catch (error) {
    logger.error('Error fetching shops:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch shops',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get shop details
router.get('/shops/:shopId', asyncHandler(async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await executeQuery(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone_number,
        u.status,
        u.business_info,
        u.profile_image,
        u.address,
        u.preferences,
        u.created_at,
        u.last_login,
        u.email_verified,
        u.phone_verified
      FROM users u
      WHERE u.id = ? AND u.role = 'seller'
    `, [shopId]);

    if (!shop || shop.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Shop not found'
      });
    }

    // Get shop statistics
    const stats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT CASE WHEN p.is_active = TRUE THEN p.id END) as active_products,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as completed_orders,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as total_revenue,
        AVG(CASE WHEN o.status = 'delivered' THEN o.total_amount END) as avg_order_value
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      LEFT JOIN orders o ON u.id = o.seller_id
      WHERE u.id = ?
    `, [shopId]);

    // Get recent products
    const recentProducts = await executeQuery(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.stock_quantity,
        p.is_active,
        p.created_at,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.created_by = ?
      ORDER BY p.created_at DESC
      LIMIT 10
    `, [shopId]);

    // Get recent orders
    const recentOrders = await executeQuery(`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.created_at,
        c.full_name as customer_name
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.id
      WHERE o.seller_id = ?
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [shopId]);

    // Transform shop data
    let businessInfo = {};
    let address = {};
    let preferences = {};

    try {
      if (shop[0].business_info && shop[0].business_info !== '[object Object]') {
        businessInfo = JSON.parse(shop[0].business_info);
      }
    } catch (e) {
      businessInfo = {};
    }

    try {
      if (shop[0].address && shop[0].address !== '[object Object]') {
        address = JSON.parse(shop[0].address);
      }
    } catch (e) {
      address = {};
    }

    try {
      if (shop[0].preferences && shop[0].preferences !== '[object Object]') {
        preferences = JSON.parse(shop[0].preferences);
      }
    } catch (e) {
      preferences = {};
    }

    const transformedShop = {
      ...shop[0],
      business_info: businessInfo,
      address,
      preferences,
      stats: stats[0] || {},
      recent_products: recentProducts,
      recent_orders: recentOrders
    };

    res.json({
      error: false,
      shop: transformedShop
    });
  } catch (error) {
    logger.error('Error fetching shop details:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch shop details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Update shop status
router.put('/shops/:shopId/status', asyncHandler(async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid status'
      });
    }

    // Update shop status
    await executeQuery(
      'UPDATE users SET status = ? WHERE id = ? AND role = "seller"',
      [status, shopId]
    );

    // Create notification for the seller
    const notificationId = uuidv4();
    await executeQuery(`
      INSERT INTO notifications (id, recipient_id, type, title, message, data, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      notificationId,
      shopId,
      'status_change',
      'Shop Status Updated',
      `Your shop status has been updated to: ${status}`,
      JSON.stringify({
        previous_status: 'unknown',
        new_status: status,
        updated_by: req.user.id,
        updated_by_name: req.user.full_name
      }),
      'normal'
    ]);

    logger.info(`Shop ${shopId} status updated to ${status} by admin ${req.user.email}`);

    res.json({
      error: false,
      message: 'Shop status updated successfully',
      shopId,
      status
    });
  } catch (error) {
    logger.error('Error updating shop status:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update shop status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Update shop information
router.put('/shops/:shopId', asyncHandler(async (req, res) => {
  try {
    const { shopId } = req.params;
    const updateData = req.body;

    // Validate shop exists
    const shop = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "seller"',
      [shopId]
    );

    if (!shop || shop.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Shop not found'
      });
    }

    // Prepare update fields
    const updateFields = [];
    const params = [];

    if (updateData.fullName !== undefined) {
      updateFields.push('full_name = ?');
      params.push(updateData.fullName);
    }

    if (updateData.email !== undefined) {
      updateFields.push('email = ?');
      params.push(updateData.email);
    }

    if (updateData.phoneNumber !== undefined) {
      updateFields.push('phone_number = ?');
      params.push(updateData.phoneNumber);
    }

    if (updateData.businessInfo !== undefined) {
      updateFields.push('business_info = ?');
      params.push(JSON.stringify(updateData.businessInfo));
    }

    if (updateData.address !== undefined) {
      updateFields.push('address = ?');
      params.push(JSON.stringify(updateData.address));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No fields to update'
      });
    }

    // Update shop
    params.push(shopId);
    await executeQuery(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    logger.info(`Shop ${shopId} updated by admin ${req.user.email}`);

    res.json({
      error: false,
      message: 'Shop updated successfully',
      shopId
    });
  } catch (error) {
    logger.error('Error updating shop:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update shop',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get financial reports
router.get('/finance/reports', asyncHandler(async (req, res) => {
  try {
    const { period = '30', startDate, endDate, sellerId } = req.query;
    const days = parseInt(period);

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE o.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      dateFilter = 'WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(days);
    }

    if (sellerId) {
      dateFilter += dateFilter.includes('WHERE') ? ' AND o.seller_id = ?' : 'WHERE o.seller_id = ?';
      params.push(sellerId);
    }

    // Get revenue summary
    const revenueSummary = await executeQuery(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders o
      ${dateFilter}
    `, params);

    // Get revenue by seller
    const revenueBySeller = await executeQuery(`
      SELECT 
        s.full_name as seller_name,
        s.email as seller_email,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as average_order_value
      FROM orders o
      LEFT JOIN users s ON o.seller_id = s.id
      ${dateFilter}
      GROUP BY s.id, s.full_name, s.email
      ORDER BY total_revenue DESC
    `, params);

    // Get daily revenue
    const dailyRevenue = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders o
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, params);

    // Get top selling products
    const topProducts = await executeQuery(`
      SELECT 
        p.name as product_name,
        p.sku,
        COUNT(oi.id) as units_sold,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.unit_price) as avg_price
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id
      ${dateFilter}
      GROUP BY p.id, p.name, p.sku
      ORDER BY units_sold DESC
      LIMIT 20
    `, params);

    res.json({
      error: false,
      financial: {
        summary: revenueSummary[0],
        bySeller: revenueBySeller,
        dailyRevenue,
        topProducts
      }
    });
  } catch (error) {
    logger.error('Error fetching financial reports:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch financial data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get seller statistics
router.get('/sellers/stats', asyncHandler(async (req, res) => {
  try {
    // Get overall seller statistics
    const overallStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_sellers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sellers,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_sellers,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_sellers,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sellers,
        COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as email_verified_sellers,
        COUNT(CASE WHEN phone_verified = TRUE THEN 1 END) as phone_verified_sellers,
        COUNT(CASE WHEN email_verified = TRUE AND phone_verified = TRUE THEN 1 END) as fully_verified_sellers
      FROM users 
      WHERE role = 'seller'
    `);

    // Get seller performance statistics
    const performanceStats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT u.id) as sellers_with_products,
        COUNT(DISTINCT u.id) as sellers_with_orders,
        AVG(product_counts.total_products) as avg_products_per_seller,
        AVG(order_counts.total_orders) as avg_orders_per_seller,
        AVG(revenue_counts.total_revenue) as avg_revenue_per_seller
      FROM users u
      LEFT JOIN (
        SELECT created_by, COUNT(*) as total_products
        FROM products
        GROUP BY created_by
      ) product_counts ON u.id = product_counts.created_by
      LEFT JOIN (
        SELECT seller_id, COUNT(*) as total_orders, SUM(total_amount) as total_revenue
        FROM orders
        GROUP BY seller_id
      ) order_counts ON u.id = order_counts.seller_id
      WHERE u.role = 'seller'
    `);

    // Get recent seller activity
    const recentActivity = await executeQuery(`
      SELECT 
        'new_seller' as type,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM users
      WHERE role = 'seller' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    // Get top performing sellers
    const topSellers = await executeQuery(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      LEFT JOIN orders o ON u.id = o.seller_id
      WHERE u.role = 'seller' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    res.json({
      error: false,
      stats: {
        overall: overallStats[0],
        performance: performanceStats[0],
        recentActivity,
        topSellers: topSellers.map(seller => ({
          _id: seller.id,
          fullName: seller.full_name,
          email: seller.email,
          totalProducts: seller.total_products || 0,
          totalOrders: seller.total_orders || 0,
          totalRevenue: seller.total_revenue || 0
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching seller statistics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch seller statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get individual seller statistics
router.get('/seller/:sellerId/stats', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    // Get basic seller info
    const seller = await executeQuery(`
      SELECT id, full_name, email, status, business_info, created_at
      FROM users WHERE id = ? AND role = 'seller'
    `, [sellerId]);

    if (!seller || seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Get seller statistics
    const stats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT CASE WHEN p.is_active = TRUE THEN p.id END) as active_products,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as completed_orders,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as total_revenue,
        AVG(CASE WHEN o.status = 'delivered' THEN o.total_amount END) as avg_order_value
      FROM users u
      LEFT JOIN products p ON u.id = p.created_by
      LEFT JOIN orders o ON u.id = o.seller_id
      WHERE u.id = ?
    `, [sellerId]);

    // Get recent activity
    const recentActivity = await executeQuery(`
      SELECT 
        'order' as type,
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.created_at,
        c.full_name as customer_name
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.id
      WHERE o.seller_id = ?
      UNION ALL
      SELECT 
        'product' as type,
        p.id,
        p.name as order_number,
        p.is_active as status,
        p.price as total_amount,
        p.created_at,
        '' as customer_name
      FROM products p
      WHERE p.created_by = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [sellerId, sellerId]);

    res.json({
      error: false,
      seller: seller[0],
      stats: stats[0] || {},
      recentActivity
    });
  } catch (error) {
    logger.error('Error fetching seller statistics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch seller statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Update seller metrics
router.put('/seller/:sellerId/metrics', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { creditScore, followers, rating } = req.body;

    // Validate seller exists
    const seller = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "seller"',
      [sellerId]
    );

    if (!seller || seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Update seller metrics in business_info
    const currentBusinessInfo = await executeQuery(
      'SELECT business_info FROM users WHERE id = ?',
      [sellerId]
    );

    let businessInfo = {};
    try {
      if (currentBusinessInfo[0]?.business_info && currentBusinessInfo[0].business_info !== '[object Object]') {
        businessInfo = JSON.parse(currentBusinessInfo[0].business_info);
      }
    } catch (e) {
      businessInfo = {};
    }

    // Update metrics
    if (creditScore !== undefined) businessInfo.credit_score = creditScore;
    if (followers !== undefined) businessInfo.followers = followers;
    if (rating !== undefined) businessInfo.rating = rating;

    // Update database
    await executeQuery(
      'UPDATE users SET business_info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(businessInfo), sellerId]
    );

    logger.info(`Seller ${sellerId} metrics updated by admin ${req.user.email}`);

    res.json({
      error: false,
      message: 'Seller metrics updated successfully',
      sellerId,
      metrics: businessInfo
    });
  } catch (error) {
    logger.error('Error updating seller metrics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update seller metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Impersonate user
router.post('/impersonate/:userId', asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user exists and get complete user data
    const user = await executeQuery(
      'SELECT id, email, full_name, role, status, phone_number, date_of_birth, address, business_info, profile_photo, created_at, last_login, is_active, email_verified, phone_verified, has_payment_password, has_funds_password, two_factor_enabled, email_notifications, sms_notifications, push_notifications, marketing_emails FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    if (user[0].status !== 'active') {
      return res.status(400).json({
        error: true,
        message: 'Cannot impersonate inactive user'
      });
    }

    // Parse business_info JSON if it exists
    let businessInfo = {};
    try {
      if (user[0].business_info && user[0].business_info !== '[object Object]') {
        businessInfo = JSON.parse(user[0].business_info);
      }
    } catch (e) {
      businessInfo = {};
    }

    // Parse address JSON if it exists
    let address = {};
    try {
      if (user[0].address && user[0].address !== '[object Object]') {
        address = JSON.parse(user[0].address);
      }
    } catch (e) {
      address = {};
    }

    // Create impersonation token (special JWT with impersonation flag)
    const impersonationToken = jwt.sign(
      {
        userId: user[0].id,
        originalAdminId: req.user.id,
        isImpersonation: true,
        role: user[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.info(`Admin ${req.user.email} impersonating user ${user[0].email}`);

    res.json({
      error: false,
      message: 'Impersonation successful',
      impersonationToken,
      user: {
        _id: user[0].id,
        id: user[0].id,
        email: user[0].email,
        fullName: user[0].full_name,
        role: user[0].role,
        status: user[0].status,
        phoneNumber: user[0].phone_number || '',
        dateOfBirth: user[0].date_of_birth || '',
        address: address,
        businessInfo: businessInfo,
        profilePhoto: user[0].profile_photo || '',
        createdAt: user[0].created_at || '',
        lastLogin: user[0].last_login || '',
        isActive: user[0].is_active || false,
        isEmailVerified: user[0].email_verified || false,
        isPhoneVerified: user[0].phone_verified || false,
        hasPaymentPassword: user[0].has_payment_password || false,
        hasFundsPassword: user[0].has_funds_password || false,
        twoFactorEnabled: user[0].two_factor_enabled || false,
        emailNotifications: user[0].email_notifications !== null ? user[0].email_notifications : true,
        smsNotifications: user[0].sms_notifications || false,
        pushNotifications: user[0].push_notifications !== null ? user[0].push_notifications : true,
        marketingEmails: user[0].marketing_emails || false
      }
    });
  } catch (error) {
    logger.error('Error during user impersonation:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to impersonate user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Activate current user account (for development/testing)
router.post('/activate-current-user', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Update user status to active
    await executeQuery(
      'UPDATE users SET status = "active", email_verified = TRUE, phone_verified = TRUE WHERE id = ?',
      [userId]
    );

    logger.info(`User ${req.user.email} account activated by admin`);

    res.json({
      error: false,
      message: 'Account activated successfully',
      userId
    });
  } catch (error) {
    logger.error('Error activating user account:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to activate account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ========================================
// FAKE DATA CONFIGURATIONS ENDPOINTS
// ========================================

// Save fake data configuration
router.post('/fake-data-configs', asyncHandler(async (req, res) => {
  try {
    const { sellerId, sellerName, analytics, metadata } = req.body;
    
    // Validate required fields
    if (!sellerId || !sellerName || !analytics || !metadata) {
      return res.status(400).json({
        error: true,
        message: 'Missing required fields: sellerId, sellerName, analytics, metadata'
      });
    }

    // Validate seller exists
    const seller = await executeQuery(
      'SELECT id, role FROM users WHERE id = ? AND role = "seller"',
      [sellerId]
    );

    if (!seller || seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found or user is not a seller'
      });
    }

    // Check if configuration already exists for this seller
    const existingConfig = await executeQuery(
      'SELECT id FROM fake_data_configs WHERE seller_id = ? AND status = "active"',
      [sellerId]
    );

    let configId;
    if (existingConfig && existingConfig.length > 0) {
      // Update existing configuration
      configId = existingConfig[0].id;
      await executeQuery(
        `UPDATE fake_data_configs 
         SET analytics = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [JSON.stringify(analytics), JSON.stringify(metadata), configId]
      );
      
      logger.info(`Updated fake data config for seller ${sellerId} by admin ${req.user.email}`);
    } else {
      // Create new configuration
      configId = uuidv4();
      await executeQuery(
        `INSERT INTO fake_data_configs (id, seller_id, seller_name, analytics, metadata) 
         VALUES (?, ?, ?, ?, ?)`,
        [configId, sellerId, sellerName, JSON.stringify(analytics), JSON.stringify(metadata)]
      );
      
      logger.info(`Created fake data config for seller ${sellerId} by admin ${req.user.email}`);
    }

    // Return the saved configuration
    const savedConfig = await executeQuery(
      'SELECT * FROM fake_data_configs WHERE id = ?',
      [configId]
    );

    res.status(200).json({
      error: false,
      message: 'Fake data configuration saved successfully',
      config: savedConfig[0]
    });

  } catch (error) {
    logger.error('Error saving fake data configuration:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to save fake data configuration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get fake data configuration for a seller
router.get('/fake-data-configs', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.query;
    
    if (!sellerId) {
      return res.status(400).json({
        error: true,
        message: 'sellerId query parameter is required'
      });
    }

    // Get the active configuration for the seller
    const config = await executeQuery(
      'SELECT * FROM fake_data_configs WHERE seller_id = ? AND status = "active" ORDER BY updated_at DESC LIMIT 1',
      [sellerId]
    );

    if (!config || config.length === 0) {
      return res.status(404).json({
        error: false,
        message: 'No fake data configuration found for this seller',
        config: null
      });
    }

    res.json({
      error: false,
      message: 'Fake data configuration retrieved successfully',
      config: config[0]
    });

  } catch (error) {
    logger.error('Error retrieving fake data configuration:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve fake data configuration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Delete fake data configuration
router.delete('/fake-data-configs/:configId', asyncHandler(async (req, res) => {
  try {
    const { configId } = req.params;
    
    // Check if configuration exists
    const config = await executeQuery(
      'SELECT * FROM fake_data_configs WHERE id = ?',
      [configId]
    );

    if (!config || config.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Fake data configuration not found'
      });
    }

    // Soft delete by setting status to deleted
    await executeQuery(
      'UPDATE fake_data_configs SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [configId]
    );

    logger.info(`Deleted fake data config ${configId} by admin ${req.user.email}`);

    res.json({
      error: false,
      message: 'Fake data configuration deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting fake data configuration:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete fake data configuration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// List all fake data configurations
router.get('/fake-data-configs/list', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countResult = await executeQuery(
      'SELECT COUNT(*) as total FROM fake_data_configs WHERE status = ?',
      [status]
    );
    const total = countResult[0].total;

    // Get configurations with pagination
    const configs = await executeQuery(
      `SELECT fc.*, u.email as seller_email, u.full_name as seller_full_name
       FROM fake_data_configs fc
       LEFT JOIN users u ON fc.seller_id = u.id
       WHERE fc.status = ?
       ORDER BY fc.updated_at DESC
       LIMIT ? OFFSET ?`,
      [status, parseInt(limit), offset]
    );

    res.json({
      error: false,
      message: 'Fake data configurations retrieved successfully',
      configs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error listing fake data configurations:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to list fake data configurations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ===================================
// SELLER FAKE STATS MANAGEMENT
// ===================================

// Get fake stats for a seller
router.get('/sellers/:sellerId/fake-stats', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const fakeStats = await executeQuery(
      'SELECT * FROM seller_fake_stats WHERE seller_id = ? ORDER BY timeframe',
      [sellerId]
    );

    res.json({ 
      success: true, 
      fakeStats,
      message: 'Fake stats retrieved successfully' 
    });
  } catch (error) {
    logger.error('Error fetching fake stats:', error);
    res.status(500).json({ error: 'Failed to fetch fake stats' });
  }
}));

// Save/Update fake stats for a seller
router.post('/sellers/:sellerId/fake-stats', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { timeframe, stats } = req.body;
    
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate timeframe
    const validTimeframes = ['today', '7days', '30days', 'total'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({ error: 'Invalid timeframe' });
    }

    // Check if the seller_fake_stats table exists
    try {
      const tableCheck = await executeQuery('SHOW TABLES LIKE "seller_fake_stats"');
      if (tableCheck.length === 0) {
        logger.error('seller_fake_stats table does not exist');
        return res.status(500).json({ error: 'Database table not found' });
      }
      logger.info('✅ seller_fake_stats table exists');
      
      // Also check the table structure
      const tableStructure = await executeQuery('DESCRIBE seller_fake_stats');
      logger.info('Table structure:', tableStructure);
    } catch (tableError) {
      logger.error('Error checking table existence:', tableError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Log the data being saved
    logger.info(`Saving fake stats for seller ${sellerId}, timeframe: ${timeframe}`);
    logger.info('Stats data:', stats);
    
    // Upsert fake stats
    const result = await executeQuery(`
      INSERT INTO seller_fake_stats (
        seller_id, timeframe, fake_orders, fake_sales, fake_revenue, 
        fake_products, fake_customers, fake_visitors, fake_followers, 
        fake_rating, fake_credit_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        fake_orders = VALUES(fake_orders),
        fake_sales = VALUES(fake_sales),
        fake_revenue = VALUES(fake_revenue),
        fake_products = VALUES(fake_products),
        fake_customers = VALUES(fake_customers),
        fake_visitors = VALUES(fake_visitors),
        fake_followers = VALUES(fake_followers),
        fake_rating = VALUES(fake_rating),
        fake_credit_score = VALUES(fake_credit_score),
        updated_at = CURRENT_TIMESTAMP
    `, [
      sellerId, timeframe,
      stats.orders || 0,
      stats.sales || 0,
      stats.revenue || 0,
      stats.products || 0,
      stats.customers || 0,
      stats.visitors || 0,
      stats.followers || 0,
      stats.rating || 0,
      stats.creditScore || 0
    ]);

    logger.info(`Fake stats saved for seller ${sellerId}, timeframe: ${timeframe}`);
    
    res.json({ 
      success: true, 
      message: 'Fake stats saved successfully',
      id: result.insertId
    });
  } catch (error) {
    logger.error('Error saving fake stats:', error);
    logger.error('Request body:', req.body);
    logger.error('Seller ID:', req.params.sellerId);
    res.status(500).json({ 
      error: 'Failed to save fake stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Delete fake stats for a seller
router.delete('/sellers/:sellerId/fake-stats', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { timeframe } = req.query; // Optional: delete specific timeframe or all
    
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    let query, params;
    if (timeframe) {
      query = 'DELETE FROM seller_fake_stats WHERE seller_id = ? AND timeframe = ?';
      params = [sellerId, timeframe];
    } else {
      query = 'DELETE FROM seller_fake_stats WHERE seller_id = ?';
      params = [sellerId];
    }

    const result = await executeQuery(query, params);
    
    logger.info(`Fake stats deleted for seller ${sellerId}${timeframe ? `, timeframe: ${timeframe}` : ''}`);
    
    res.json({ 
      success: true, 
      message: 'Fake stats deleted successfully',
      deletedCount: result.affectedRows
    });
  } catch (error) {
    logger.error('Error deleting fake stats:', error);
    res.status(500).json({ error: 'Failed to delete fake stats' });
  }
}));

// Get all fake stats (admin overview)
router.get('/fake-stats', asyncHandler(async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const fakeStats = await executeQuery(`
      SELECT fs.*, u.email as seller_email, u.full_name as seller_full_name
      FROM seller_fake_stats fs
      JOIN users u ON fs.seller_id = u.id
      ORDER BY fs.updated_at DESC
    `);

    res.json({ 
      success: true, 
      fakeStats,
      message: 'All fake stats retrieved successfully' 
    });
  } catch (error) {
    logger.error('Error fetching all fake stats:', error);
    res.status(500).json({ error: 'Failed to fetch fake stats' });
  }
}));

// Get seller statistics for different timeframes (Today, 7 Days, 30 Days, Total)
router.get('/sellers/:sellerId/timeframe-stats', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    // Check if seller exists
    const seller = await executeQuery('SELECT id, full_name, email, role FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    
    if (seller.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    const timeframes = ['today', '7days', '30days', 'total'];
    const stats = {};

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
          stats[timeframe] = {
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

          const calculatedStats = await executeQuery(`
            SELECT 
              COUNT(DISTINCT o.id) as total_orders,
              COALESCE(SUM(o.total_amount), 0) as total_revenue,
              COALESCE(AVG(o.total_amount), 0) as average_order_value,
              COUNT(DISTINCT p.id) as total_products,
              COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
            FROM users u
            LEFT JOIN orders o ON u.id = o.seller_id ${timeframe !== 'total' ? 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)' : ''}
            LEFT JOIN products p ON u.id = p.created_by
            WHERE u.id = ?
          `, timeframe !== 'total' ? [days, sellerId] : [sellerId]);

          stats[timeframe] = {
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
        stats[timeframe] = {
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

    res.json({
      error: false,
      seller: {
        _id: seller[0].id,
        fullName: seller[0].full_name,
        email: seller[0].email,
        role: seller[0].role
      },
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching seller timeframe stats:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch seller timeframe stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Admin Overrides Management
// Get admin overrides for any user (seller, admin, etc.)
router.get('/seller/:sellerId/overrides', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    logger.info(`🔍 Fetching admin overrides for seller: ${sellerId}`);
    
    // Validate sellerId format
    if (!sellerId || typeof sellerId !== 'string' || sellerId.length !== 36) {
      logger.warn(`❌ Invalid sellerId format: ${sellerId}`);
      return res.status(400).json({
        error: true,
        message: 'Invalid seller ID format'
      });
    }
    
    // Validate user exists (can be any role, not just seller)
    const user = await executeQuery(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [sellerId]
    );

    if (user.length === 0) {
      logger.warn(`❌ User not found: ${sellerId}`);
      return res.status(404).json({
        error: true,
        message: 'Seller not found'
      });
    }

    // Log the user role for debugging
    logger.info(`🔍 Found user: ${user[0].full_name} with role: ${user[0].role}`);

    // Get all overrides for this seller, organized by period
    let overrides = [];
    try {
      overrides = await executeQuery(
        'SELECT id, seller_id, metric_name, metric_period, override_value, period_specific_value, original_value, created_at, updated_at FROM admin_overrides WHERE seller_id = ? ORDER BY metric_name, metric_period',
        [sellerId]
      );
      logger.info(`✅ Found ${overrides.length} overrides for seller ${sellerId}`);
      
      // Log each override for debugging
      overrides.forEach(override => {
        logger.info(`📊 Override: ${override.metric_name} (${override.metric_period}) = ${override.period_specific_value || override.override_value} (original: ${override.original_value})`);
      });
    } catch (error) {
      // If table doesn't exist, return empty overrides
      if (error.code === 'ER_NO_SUCH_TABLE') {
        logger.warn(`❌ admin_overrides table does not exist for seller ${sellerId}, returning empty overrides`);
        overrides = [];
      } else {
        logger.error(`❌ Database error fetching overrides for seller ${sellerId}:`, error);
        throw error;
      }
    }

    // Create a structured response organized by dashboard tabs/periods
    const structuredOverrides = {
      today: {
        orders_sold: null,
        total_sales: null,
        profit_forecast: null,
        visitors: null,
        shop_followers: null,
        shop_rating: null,
        credit_score: null
      },
      last7days: {
        orders_sold: null,
        total_sales: null,
        profit_forecast: null,
        visitors: null,
        shop_followers: null,
        shop_rating: null,
        credit_score: null
      },
      last30days: {
        orders_sold: null,
        total_sales: null,
        profit_forecast: null,
        visitors: null,
        shop_followers: null,
        shop_rating: null,
        credit_score: null
      },
      total: {
        orders_sold: null,
        total_sales: null,
        profit_forecast: null,
        visitors: null,
        shop_followers: null,
        shop_rating: null,
        credit_score: null
      }
    };

    // Map existing overrides to structured format by period
    overrides.forEach(override => {
      const period = override.metric_period || 'total';
      if (structuredOverrides[period] && structuredOverrides[period].hasOwnProperty(override.metric_name)) {
        structuredOverrides[period][override.metric_name] = {
          id: override.id,
          value: parseFloat(override.period_specific_value || override.override_value),
          original: parseFloat(override.original_value),
          hasOverride: true,
          createdAt: override.created_at,
          updatedAt: override.updated_at
        };
      }
    });

    // Fill in missing metrics with default values for each period
    Object.keys(structuredOverrides).forEach(period => {
      Object.keys(structuredOverrides[period]).forEach(metric => {
        if (!structuredOverrides[period][metric]) {
          structuredOverrides[period][metric] = {
            value: 0,
            original: 0,
            hasOverride: false,
            createdAt: null,
            updatedAt: null
          };
        }
      });
    });

    // Always return the response, even if no overrides exist
    res.json({
      error: false,
      user: user[0],
      overrides,
      structuredOverrides,
      hasOverrides: overrides.length > 0,
      timestamp: new Date().toISOString()
    });
    logger.info(`✅ Successfully returned ${overrides.length} overrides for user ${sellerId} with structured format`);
  } catch (error) {
    logger.error(`❌ Error fetching admin overrides for seller ${sellerId}:`, error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch admin overrides',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Create or update admin override
router.post('/seller/:sellerId/overrides', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { metricName, overrideValue, originalValue } = req.body;
    
    logger.info(`💾 Saving admin override for seller ${sellerId}, metric: ${metricName}, value: ${overrideValue}`);
    
    // Validate sellerId format
    if (!sellerId || typeof sellerId !== 'string' || sellerId.length !== 36) {
      logger.warn(`❌ Invalid sellerId format for override: ${sellerId}`);
      return res.status(400).json({
        error: true,
        message: 'Invalid seller ID format'
      });
    }
    
    // Validate required fields
    if (!metricName || overrideValue === undefined) {
      logger.warn(`❌ Invalid override data for seller ${sellerId}: metricName=${metricName}, overrideValue=${overrideValue}`);
      return res.status(400).json({
        error: true,
        message: 'metricName and overrideValue are required'
      });
    }

    // Validate metric name against allowed values
    const allowedMetrics = [
      'orders_sold',
      'total_sales', 
      'profit_forecast',
      'visitors',
      'shop_followers',
      'shop_rating',
      'credit_score'
    ];
    
    if (!allowedMetrics.includes(metricName)) {
      logger.warn(`❌ Invalid metric name for override: ${metricName}`);
      return res.status(400).json({
        error: true,
        message: `Invalid metric name. Allowed values: ${allowedMetrics.join(', ')}`
      });
    }

    // Validate override value type and range
    const numericValue = parseFloat(overrideValue);
    if (isNaN(numericValue)) {
      logger.warn(`❌ Invalid override value type for seller ${sellerId}, metric: ${metricName}, value: ${overrideValue}`);
      return res.status(400).json({
        error: true,
        message: 'overrideValue must be a valid number'
      });
    }

    // Validate specific ranges for different metrics
    if (metricName === 'shop_rating' && (numericValue < 0 || numericValue > 5)) {
      return res.status(400).json({
        error: true,
        message: 'Shop rating must be between 0 and 5'
      });
    }
    
    if (metricName === 'credit_score' && (numericValue < 300 || numericValue > 850)) {
      return res.status(400).json({
        error: true,
        message: 'Credit score must be between 300 and 850'
      });
    }
    
    if (['orders_sold', 'total_sales', 'profit_forecast', 'visitors', 'shop_followers'].includes(metricName) && numericValue < 0) {
      return res.status(400).json({
        error: true,
        message: `${metricName} cannot be negative`
      });
    }

    // Validate user exists (can be any role, not just seller)
    const user = await executeQuery(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [sellerId]
    );

    if (user.length === 0) {
      logger.warn(`❌ User not found for override: ${sellerId}`);
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Log the user role for debugging
    logger.info(`🔍 Found user: ${user[0].full_name} with role: ${user[0].role}`);

    // Get the period from request body (default to 'total' if not specified)
    const period = req.body.period || 'total';
    
    // Check if override already exists for this seller, metric, and period
    let existingOverride = null;
    try {
      existingOverride = await executeQuery(
        'SELECT * FROM admin_overrides WHERE seller_id = ? AND metric_name = ? AND metric_period = ?',
        [sellerId, metricName, period]
      );
      logger.info(`🔍 Existing override check for period ${period}: ${existingOverride.length > 0 ? 'Found' : 'Not found'}`);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        logger.warn('admin_overrides table does not exist, creating it...');
        await executeQuery(`
          CREATE TABLE admin_overrides (
            id VARCHAR(36) NOT NULL,
            seller_id VARCHAR(36) NOT NULL,
            metric_name VARCHAR(100) NOT NULL,
            metric_period VARCHAR(20) DEFAULT 'total',
            override_value DECIMAL(15,2) DEFAULT '0.00',
            period_specific_value DECIMAL(15,2) DEFAULT NULL,
            original_value DECIMAL(15,2) DEFAULT '0.00',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_override_period (seller_id, metric_name, metric_period),
            KEY idx_seller_id (seller_id),
            KEY idx_metric_name (metric_name),
            KEY idx_metric_period (metric_period),
            CONSTRAINT admin_overrides_ibfk_1 FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        logger.info('✅ admin_overrides table created successfully');
        existingOverride = [];
      } else {
        throw error;
      }
    }

    let result;
    let overrideId;

    if (existingOverride.length > 0) {
      // Update existing override
      overrideId = existingOverride[0].id;
      result = await executeQuery(`
        UPDATE admin_overrides 
        SET override_value = ?, 
            period_specific_value = ?,
            original_value = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [overrideValue, overrideValue, originalValue || 0, overrideId]);
      logger.info(`✅ Updated existing override ${overrideId} for metric ${metricName}`);
    } else {
      // Insert new override
      overrideId = uuidv4();
      result = await executeQuery(`
        INSERT INTO admin_overrides (id, seller_id, metric_name, metric_period, override_value, period_specific_value, original_value) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [overrideId, sellerId, metricName, period, overrideValue, overrideValue, originalValue || 0]);
      logger.info(`✅ Created new override ${overrideId} for metric ${metricName}`);
    }

    // Verify the override was saved by fetching it back
    const savedOverride = await executeQuery(
      'SELECT * FROM admin_overrides WHERE id = ?',
      [overrideId]
    );

    if (savedOverride.length === 0) {
      throw new Error('Failed to verify override was saved');
    }

    logger.info(`✅ Admin ${req.user.email} successfully saved override for seller ${sellerId}, metric: ${metricName}, value: ${overrideValue}`);

    res.json({
      error: false,
      message: 'Override saved successfully',
      override: {
        id: overrideId,
        sellerId,
        metricName,
        period,
        overrideValue,
        periodSpecificValue: overrideValue,
        originalValue: originalValue || 0,
        createdAt: savedOverride[0].created_at,
        updatedAt: savedOverride[0].updated_at
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error saving admin override:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to save admin override',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Reset override to default (delete override)
router.delete('/seller/:sellerId/overrides/:metricName', asyncHandler(async (req, res) => {
  try {
    const { sellerId, metricName } = req.params;
    
    // Validate user exists (can be any role, not just seller)
    const user = await executeQuery(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [sellerId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Delete the override
    let result;
    try {
      result = await executeQuery(
        'DELETE FROM admin_overrides WHERE seller_id = ? AND metric_name = ?',
        [sellerId, metricName]
      );
    } catch (error) {
      // If table doesn't exist, return success (nothing to delete)
      if (error.code === 'ER_NO_SUCH_TABLE') {
        logger.warn('admin_overrides table does not exist, nothing to delete');
        result = { affectedRows: 0 };
      } else {
        throw error;
      }
    }

    logger.info(`Admin ${req.user.email} reset override for seller ${sellerId}, metric: ${metricName}`);

    res.json({
      error: false,
      message: 'Override reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting admin override:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to reset admin override',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Clear override (set to 0)
router.put('/seller/:sellerId/overrides/:metricName/clear', asyncHandler(async (req, res) => {
  try {
    const { sellerId, metricName } = req.params;
    
    // Validate user exists (can be any role, not just seller)
    const user = await executeQuery(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [sellerId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Update override to 0
    let result;
    try {
      result = await executeQuery(
        'UPDATE admin_overrides SET override_value = 0, updated_at = CURRENT_TIMESTAMP WHERE seller_id = ? AND metric_name = ?',
        [sellerId, metricName]
      );
    } catch (error) {
      // If table doesn't exist, return success (nothing to update)
      if (error.code === 'ER_NO_SUCH_TABLE') {
        logger.warn('admin_overrides table does not exist, nothing to update');
        result = { affectedRows: 0 };
      } else {
        throw error;
      }
    }

    logger.info(`Admin ${req.user.email} cleared override for seller ${sellerId}, metric: ${metricName}`);

    res.json({
      error: false,
      message: 'Override cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing admin override:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to clear admin override',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get seller dashboard data by seller ID (for admin impersonation)
router.get('/seller/:sellerId/dashboard', asyncHandler(async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    // Validate seller exists
    const seller = await executeQuery(
      'SELECT id, full_name, email, role, business_info FROM users WHERE id = ? AND role = "seller"',
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
        'SELECT metric_name, override_value, original_value FROM admin_overrides WHERE seller_id = ?',
        [sellerId]
      );
      
      overridesResult.forEach(override => {
        adminOverrides[override.metric_name] = {
          value: parseFloat(override.override_value),
          originalValue: parseFloat(override.original_value)
        };
      });
      
      if (Object.keys(adminOverrides).length > 0) {
        logger.info(`✅ Found ${Object.keys(adminOverrides).length} admin overrides for seller ${sellerId}`);
      }
    } catch (error) {
      // If table doesn't exist, just log warning and continue
      if (error.code === 'ER_NO_SUCH_TABLE') {
        logger.warn(`admin_overrides table does not exist for seller ${sellerId}`);
      } else {
        logger.warn(`Failed to fetch admin overrides for seller ${sellerId}:`, error.message);
      }
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
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total_amount), 0) as sales
      FROM orders o 
      WHERE o.seller_id = ? AND DATE(o.created_at) = CURDATE()
    `, [sellerId]);

    const last7DaysStats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total_amount), 0) as sales
      FROM orders o 
      WHERE o.seller_id = ? AND o.created_at >= ?
    `, [sellerId, last7Days]);

    const last30DaysStats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total_amount), 0) as sales
      FROM orders o 
      WHERE o.seller_id = ? AND o.created_at >= ?
    `, [sellerId, last30Days]);

    // Apply admin overrides to the response
    const applyOverrides = (data, metricName) => {
      if (adminOverrides[metricName]) {
        return adminOverrides[metricName].value;
      }
      return data;
    };

    // Return the data in the structure the frontend expects
    const response = {
      error: false,
      seller: seller[0],
      hasAdminOverrides: Object.keys(adminOverrides).length > 0,
      adminOverrides,
      overall: {
        totalSales: applyOverrides(overallStats[0]?.total_revenue || 0, 'total_sales'),
        totalOrders: applyOverrides(overallStats[0]?.total_orders || 0, 'orders_sold'),
        totalProducts: overallStats[0]?.total_products || 0,
        averageOrderValue: overallStats[0]?.average_order_value || 0
      },
      today: {
        sales: applyOverrides(todayStats[0]?.sales || 0, 'total_sales'),
        orders: applyOverrides(todayStats[0]?.orders || 0, 'orders_sold')
      },
      '7days': {
        sales: applyOverrides(last7DaysStats[0]?.sales || 0, 'total_sales'),
        orders: applyOverrides(last7DaysStats[0]?.orders || 0, 'orders_sold')
      },
      '30days': {
        sales: applyOverrides(last30DaysStats[0]?.sales || 0, 'total_sales'),
        orders: applyOverrides(last30DaysStats[0]?.orders || 0, 'orders_sold')
      },
      total: {
        orders: applyOverrides(overallStats[0]?.total_orders || 0, 'orders_sold'),
        sales: applyOverrides(overallStats[0]?.total_revenue || 0, 'total_sales'),
        revenue: applyOverrides(overallStats[0]?.total_revenue || 0, 'total_sales'),
        products: overallStats[0]?.total_products || 0,
        customers: 0,
        visitors: applyOverrides(0, 'visitors'),
        followers: applyOverrides(0, 'shop_followers'),
        rating: applyOverrides(4.5, 'shop_rating'),
        creditScore: applyOverrides(750, 'credit_score')
      },
      timestamp: new Date().toISOString()
    };

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

// Debug endpoint to test impersonation token validation
router.get('/debug-impersonation', asyncHandler(async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('🔍 Debug impersonation endpoint called:', {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : 'null',
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'null',
      tokenLength: token ? token.length : 0
    });
    
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'No token provided'
      });
    }
    
    // Verify token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('✅ Token decoded successfully:', {
      userId: decoded.userId,
      originalAdminId: decoded.originalAdminId,
      isImpersonation: decoded.isImpersonation,
      role: decoded.role,
      exp: decoded.exp
    });
    
    res.json({
      error: false,
      message: 'Token validation successful',
      tokenInfo: {
        userId: decoded.userId,
        originalAdminId: decoded.originalAdminId,
        isImpersonation: decoded.isImpersonation,
        role: decoded.role,
        exp: decoded.exp
      }
    });
    
  } catch (error) {
    console.error('❌ Token validation failed:', error.message);
    res.status(401).json({
      error: true,
      message: 'Token validation failed',
      details: error.message
    });
  }
}));

module.exports = router;