const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');
const isDev = process.env.NODE_ENV !== 'production';

// Rate limiting configuration
const rateLimitConfig = {
  // General API requests
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || 200, // 200 requests per 15 minutes
    message: {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // In development, disable general rate limiting to avoid noisy 429s
      if (isDev) return true;
      // Skip rate limiting for health checks and static files
      return req.path === '/health' || req.path.startsWith('/uploads/');
    },
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      });
    }
  },

  // Authentication endpoints (login, register, password reset)
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 100, // 100 auth requests per 15 minutes
    message: {
      error: 'Authentication rate limit exceeded',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + user agent for auth endpoints to prevent abuse
      return `${req.ip}-${req.get('User-Agent')}`;
    },
    handler: (req, res) => {
      logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
      res.status(429).json({
        error: 'Authentication rate limit exceeded',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      });
    }
  },

  // User status check endpoints (/me, profile, etc.) - more lenient
  userStatus: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_USER_STATUS_MAX) || 1000, // 1000 status checks per 15 minutes
    message: {
      error: 'User status rate limit exceeded',
      message: 'Too many status checks. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + user ID for user status endpoints
      const userId = req.userId || 'anonymous';
      return `${req.ip}-${userId}`;
    },
    skip: () => isDev,
    handler: (req, res) => {
      logger.warn(`User status rate limit exceeded for IP: ${req.ip}, User: ${req.userId || 'anonymous'}`);
      res.status(429).json({
        error: 'User status rate limit exceeded',
        message: 'Too many status checks. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      });
    }
  },

  // Sensitive operations (admin actions, file uploads, etc.)
  sensitive: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX) || 100, // 100 sensitive operations per 15 minutes
    message: {
      error: 'Operation rate limit exceeded',
      message: 'Too many operations. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Sensitive operation rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Operation rate limit exceeded',
        message: 'Too many operations. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      });
    }
  },

  // File uploads
  uploads: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_UPLOADS_MAX) || 30, // 30 file uploads per 15 minutes
    message: {
      error: 'Upload rate limit exceeded',
      message: 'Too many file uploads. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDev,
    handler: (req, res) => {
      logger.warn(`Upload rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Upload rate limit exceeded',
        message: 'Too many file uploads. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      });
    }
  },

  // Search operations
  search: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_SEARCH_MAX) || 100, // 100 search requests per 15 minutes
    message: {
      error: 'Search rate limit exceeded',
      message: 'Too many search requests. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDev,
    handler: (req, res) => {
      logger.warn(`Search rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Search rate limit exceeded',
        message: 'Too many search requests. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      });
    }
  },

  // Refresh token operations (more lenient)
  refresh: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_REFRESH_MAX) || 200, // 200 refresh requests per 15 minutes
    message: {
      error: 'Refresh rate limit exceeded',
      message: 'Too many refresh attempts. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + user ID for refresh endpoints to be more specific
      const userId = req.userId || 'anonymous';
      return `${req.ip}-${userId}`;
    },
    skip: () => isDev,
    handler: (req, res) => {
      logger.warn(`Refresh rate limit exceeded for IP: ${req.ip}, User: ${req.userId || 'anonymous'}`);
      res.status(429).json({
        error: 'Refresh rate limit exceeded',
        message: 'Too many refresh attempts. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      });
    }
  }
};

// Create rate limiters
const createRateLimiters = () => {
  const limiters = {};
  
  Object.keys(rateLimitConfig).forEach(key => {
    limiters[key] = rateLimit(rateLimitConfig[key]);
  });
  
  return limiters;
};

module.exports = {
  rateLimitConfig,
  createRateLimiters
};
