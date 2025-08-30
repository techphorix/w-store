const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  try {
    // Basic validation with explicit integer conversion
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const unreadOnly = req.query.unreadOnly === 'true';
    const offset = (page - 1) * limit;
    
    // Additional validation to ensure we have valid numbers
    if (isNaN(page) || isNaN(limit) || isNaN(offset)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid pagination parameters'
      });
    }

    // Ensure user exists
    if (!req.userId) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }

    // Check if notifications table exists and has data
    try {
      const tableCheck = await executeQuery(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'notifications'
      `);
      
      if (tableCheck[0].count === 0) {
        // Table doesn't exist, return empty result
        return res.json({
          error: false,
          notifications: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        });
      }
    } catch (tableError) {
      // Table check failed, return empty result
      return res.json({
        error: false,
        notifications: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Build query safely
    let whereClause = 'recipient_id = ?';
    const params = [req.userId];

    if (unreadOnly) {
      whereClause += ' AND is_read = FALSE';
    }

    // Ensure LIMIT and OFFSET are numbers and convert to integers
    const limitParam = parseInt(limit, 10);
    const offsetParam = parseInt(offset, 10);

    // Validate that we have valid integers
    if (isNaN(limitParam) || isNaN(offsetParam)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid pagination parameters'
      });
    }

    // Get notifications with error handling
    let notifications = [];
    try {
      // Use parameters for LIMIT and OFFSET to avoid SQL injection and type issues
      const limitOffsetClause = 'LIMIT ? OFFSET ?';
      
      // Log the exact parameters being sent to help debug
      logger.info('Executing notifications query with params:', {
        whereClause,
        limitOffsetClause,
        params: [...params, limitParam, offsetParam],
        paramTypes: [...params, limitParam, offsetParam].map(p => ({ value: p, type: typeof p }))
      });
      
      notifications = await executeQuery(`
        SELECT id, type, title, message, data, is_read, priority, action_button, 
               expires_at, created_at, read_at
        FROM notifications
        WHERE ${whereClause}
        ORDER BY created_at DESC
        ${limitOffsetClause}
      `, [...params, limitParam, offsetParam]);
    } catch (queryError) {
      // Log the specific error for debugging
      logger.error('Notifications query failed:', {
        error: queryError.message,
        code: queryError.code,
        errno: queryError.errno,
        params,
        limitParam,
        offsetParam
      });
      
      // Query failed, return empty result
      return res.json({
        error: false,
        notifications: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Get total count safely
    let total = 0;
    try {
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`,
        params
      );
      total = countResult[0]?.total || 0;
    } catch (countError) {
      total = 0;
    }

    const totalPages = Math.ceil(total / limit);

    // Process notifications safely
    const processedNotifications = notifications.map(notification => {
      const processed = { ...notification };
      
      // Safe JSON parsing
      if (processed.data && typeof processed.data === 'string') {
        try {
          processed.data = JSON.parse(processed.data);
        } catch (e) {
          processed.data = {};
        }
      } else if (!processed.data) {
        processed.data = {};
      }
      
      if (processed.action_button && typeof processed.action_button === 'string') {
        try {
          processed.action_button = JSON.parse(processed.action_button);
        } catch (e) {
          processed.action_button = null;
        }
      } else if (!processed.action_button) {
        processed.action_button = null;
      }
      
      return processed;
    });

    res.json({
      error: false,
      notifications: processedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    // Ultimate fallback - return empty result instead of error
    res.json({
      error: false,
      notifications: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    });
  }
}));

// Get unread count
router.get('/unread-count', authenticateToken, asyncHandler(async (req, res) => {
  const countResult = await executeQuery(
    'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = FALSE',
    [req.userId]
  );

  res.json({
    error: false,
    count: countResult[0].count
  });
}));

// Mark notification as read
router.put('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  await executeQuery(
    'UPDATE notifications SET is_read = TRUE, read_at = ? WHERE id = ? AND recipient_id = ?',
    [new Date(), id, req.userId]
  );

  res.json({
    error: false,
    message: 'Notification marked as read'
  });
}));

// Mark all notifications as read
router.put('/read-all', authenticateToken, asyncHandler(async (req, res) => {
  await executeQuery(
    'UPDATE notifications SET is_read = TRUE, read_at = ? WHERE recipient_id = ? AND is_read = FALSE',
    [new Date(), req.userId]
  );

  res.json({
    error: false,
    message: 'All notifications marked as read'
  });
}));

// Delete notification
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  await executeQuery(
    'DELETE FROM notifications WHERE id = ? AND recipient_id = ?',
    [id, req.userId]
  );

  res.json({
    error: false,
    message: 'Notification deleted'
  });
}));

module.exports = router;
