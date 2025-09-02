const express = require('express');
const router = express.Router();
const { connectDB } = require('../config/database');
const { logger } = require('../utils/logger');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'unknown',
        server: 'running'
      }
    };

    // Test database connection
    try {
      const db = await connectDB();
      if (db) {
        healthCheck.services.database = 'connected';
      }
    } catch (dbError) {
      healthCheck.services.database = 'disconnected';
      healthCheck.status = 'DEGRADED';
      logger.error('Database health check failed:', dbError);
    }

    // Determine overall status
    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Detailed health check with more information
router.get('/detailed', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
      },
      cpu: {
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : 'N/A',
        platform: process.platform,
        arch: process.arch
      },
      services: {
        database: 'unknown',
        server: 'running'
      },
      endpoints: [
        '/api/auth',
        '/api/products',
        '/api/orders',
        '/api/users',
        '/api/admin',
        '/api/categories',
        '/api/notifications',
        '/api/analytics',
        '/api/finance',
        '/api/search',
        '/api/distributions',
        '/api/uploads',
        '/api/seller'
      ]
    };

    // Test database connection
    try {
      const db = await connectDB();
      if (db) {
        healthCheck.services.database = 'connected';
        
        // Test a simple query
        const [rows] = await db.execute('SELECT 1 as test');
        if (rows && rows.length > 0) {
          healthCheck.services.database = 'healthy';
        }
      }
    } catch (dbError) {
      healthCheck.services.database = 'disconnected';
      healthCheck.status = 'DEGRADED';
      logger.error('Database health check failed:', dbError);
    }

    // Determine overall status
    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error.message
    });
  }
});

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    const db = await connectDB();
    
    if (!db) {
      return res.status(503).json({
        status: 'NOT_READY',
        timestamp: new Date().toISOString(),
        reason: 'Database not connected'
      });
    }

    // Test database with a simple query
    await db.execute('SELECT 1 as test');
    
    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      reason: error.message
    });
  }
});

// Liveness probe (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API information endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    name: 'TikTok Shop API',
    version: '1.0.0',
    description: 'E-commerce platform API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      users: '/api/users',
      admin: '/api/admin',
      categories: '/api/categories',
      notifications: '/api/notifications',
      analytics: '/api/analytics',
      finance: '/api/finance',
      search: '/api/search',
      distributions: '/api/distributions',
      uploads: '/api/uploads',
      seller: '/api/seller'
    },
    documentation: 'https://yourdomain.com/api/docs'
  });
});

module.exports = router;
