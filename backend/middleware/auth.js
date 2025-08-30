const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Enhanced debugging
    console.log('🔐 Auth middleware debug:', {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : 'null',
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'null',
      tokenLength: token ? token.length : 0,
      url: req.originalUrl,
      method: req.method
    });

    if (!token) {
      console.log('❌ No token provided in request');
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified successfully:', {
      userId: decoded.userId,
      exp: decoded.exp,
      tokenAge: decoded.exp ? Math.floor((decoded.exp * 1000 - Date.now()) / 1000) + 's' : 'unknown',
      isImpersonation: decoded.isImpersonation || false,
      originalAdminId: decoded.originalAdminId || null
    });
    
    // Declare user variable in the outer scope
    let user;
    
    // Check if this is an impersonation token
    if (decoded.isImpersonation && decoded.userId) {
      console.log('🎭 Impersonation token detected, fetching impersonated user data');
      
      // For impersonation tokens, fetch the impersonated user's data
      user = await executeQuery(
        'SELECT id, email, full_name, role, status, email_verified FROM users WHERE id = ? AND status = "active"',
        [decoded.userId]
      );
      
      if (!user || user.length === 0) {
        console.log('❌ Impersonated user not found or inactive:', { userId: decoded.userId });
        return res.status(401).json({ 
          error: 'Invalid impersonation token',
          message: 'Impersonated user not found or account is not active'
        });
      }
      
      // Add impersonation info to the user object
      user[0].isImpersonated = true;
      user[0].originalAdminId = decoded.originalAdminId;
      
      console.log('✅ Impersonated user authenticated:', {
        impersonatedUserId: user[0].id,
        impersonatedUserEmail: user[0].email,
        impersonatedUserRole: user[0].role,
        originalAdminId: decoded.originalAdminId
      });
    } else {
      // Regular authentication - check if user exists and is active
      user = await executeQuery(
        'SELECT id, email, full_name, role, status, email_verified FROM users WHERE id = ? AND status = "active"',
        [decoded.userId]
      );
      
      if (!user || user.length === 0) {
        console.log('❌ User not found or inactive:', { userId: decoded.userId });
        return res.status(401).json({ 
          error: 'Invalid token',
          message: 'User not found or account is not active'
        });
      }
    }

    console.log('🔍 Database query result:', {
      userId: decoded.userId,
      queryResult: user,
      hasUser: !!user && user.length > 0,
      userRole: user?.[0]?.role,
      userStatus: user?.[0]?.status
    });

    if (!user || user.length === 0) {
      console.log('❌ User not found or inactive:', { userId: decoded.userId });
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found or account is not active'
      });
    }

    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.log('❌ Token expired:', { 
        exp: decoded.exp, 
        currentTime: Date.now(),
        timeDiff: decoded.exp * 1000 - Date.now()
      });
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Authentication token has expired. Please login again'
      });
    }

    // Check if the session is still valid in user_sessions table (skip for impersonation tokens)
    if (!decoded.isImpersonation) {
      try {
        const session = await executeQuery(
          'SELECT * FROM user_sessions WHERE user_id = ? AND token = ? AND is_active = TRUE AND expires_at > NOW()',
          [decoded.userId, token]
        );

        console.log('🔍 Session validation:', {
          userId: decoded.userId,
          hasSession: !!session && session.length > 0,
          sessionCount: session?.length || 0,
          sessionActive: session?.[0]?.is_active,
          sessionExpires: session?.[0]?.expires_at
        });

        if (!session || session.length === 0) {
          console.log('❌ No valid session found for token');
          return res.status(401).json({
            error: 'Invalid session',
            message: 'Session has expired or been invalidated. Please login again.'
          });
        }
      } catch (sessionError) {
        console.log('⚠️ Session validation failed, skipping:', sessionError.message);
        
        // If it's a table structure issue, continue without session validation
        if (sessionError.code === 'ER_NO_SUCH_TABLE') {
          console.log('⚠️ user_sessions table not found, skipping session validation');
        } else {
          // For other errors, log but continue (don't fail authentication)
          console.warn('⚠️ Session validation error, continuing without validation:', sessionError.message);
        }
      }
    } else {
      console.log('🎭 Skipping session validation for impersonation token');
    }

    // Add user info to request
    req.user = user[0];
    req.userId = user[0].id;
    
    console.log('✅ User authenticated successfully:', {
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role,
      status: user[0].status,
      emailVerified: user[0].email_verified,
      fullName: user[0].full_name
    });
    
    // Verify the user object is properly set
    console.log('🔍 Request user object verification:', {
      reqUserId: req.userId,
      reqUser: req.user,
      reqUserRole: req.user?.role,
      reqUserStatus: req.user?.status
    });
    
    logger.info(`User authenticated: ${user[0].email} (${user[0].role})`);
    next();
    
  } catch (error) {
    console.error('❌ Authentication error:', {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication token is invalid'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Authentication token has expired. Please login again'
      });
    } else {
      logger.error('Authentication error:', error);
      return res.status(500).json({ 
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      });
    }
  }
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('🔍 requireRole middleware called:', {
      url: req.originalUrl,
      requiredRoles: roles,
      hasUser: !!req.user,
      userId: req.userId,
      userRole: req.user?.role,
      userStatus: req.user?.status
    });
    
    if (!req.user) {
      console.log('❌ requireRole: No user object found');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    const userRole = req.user.role;
    console.log('🔍 requireRole: Checking role:', { required: roles, actual: userRole });
    
    if (Array.isArray(roles)) {
      if (!roles.includes(userRole)) {
        console.log('❌ requireRole: Role mismatch (array):', { required: roles, actual: userRole });
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${userRole}`
        });
      }
    } else if (roles !== userRole) {
      console.log('❌ requireRole: Role mismatch (single):', { required: roles, actual: userRole });
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${roles}. Your role: ${userRole}`
      });
    }

    console.log('✅ requireRole: Role validation passed');
    next();
  };
};

// Check if user is admin
const requireAdmin = requireRole('admin');

// Check if user is seller
const requireSeller = requireRole('seller');

// Check if user is admin or seller
const requireAdminOrSeller = requireRole(['admin', 'seller']);

// Check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceTable, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please login to access this resource'
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[resourceIdField];
      if (!resourceId) {
        return res.status(400).json({ 
          error: 'Resource ID required',
          message: 'Resource ID is missing from request'
        });
      }

      // Check if user owns the resource
      const resource = await executeQuery(
        `SELECT * FROM ${resourceTable} WHERE ${resourceIdField} = ?`,
        [resourceId]
      );

      if (!resource || resource.length === 0) {
        return res.status(404).json({ 
          error: 'Resource not found',
          message: 'The requested resource does not exist'
        });
      }

      // Check ownership (assuming there's a user_id field in the resource)
      if (resource[0].user_id !== req.user.id && resource[0].created_by !== req.user.id) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You can only access your own resources'
        });
      }

      next();
      
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({ 
        error: 'Authorization check failed',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

// Optional authentication (doesn't fail if no token, but adds user info if present)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await executeQuery(
        'SELECT id, email, full_name, role, status FROM users WHERE id = ? AND status = "active"',
        [decoded.userId]
      );

      if (user && user.length > 0) {
        req.user = user[0];
        req.userId = user[0].id;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail on token errors, just continue without user info
    next();
  }
};

// Check if user is verified
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }

  if (!req.user.email_verified) {
    return res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email address before accessing this resource'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireSeller,
  requireAdminOrSeller,
  requireOwnershipOrAdmin,
  optionalAuth,
  requireVerifiedEmail
};
