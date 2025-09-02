const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const financeRoutes = require('./routes/finance');
const searchRoutes = require('./routes/search');
const distributionRoutes = require('./routes/distributions');
const uploadRoutes = require('./routes/uploads');
const categoryRoutes = require('./routes/categories');
const sellerRoutes = require('./routes/seller');
const healthRoutes = require('./routes/health');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const { logger } = require('./utils/logger');
const { createRateLimiters } = require('./config/rateLimit');

// Import database connection
const { connectDB } = require('./config/database');

// Import real-time service
const RealtimeService = require('./services/realtimeService');

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.FRONTEND_URL || "https://tik-store-tok-4u.com";
const allowedOrigins = [allowedOrigin];
if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Create rate limiters
const { general, auth, userStatus, sensitive, uploads, search, refresh } = createRateLimiters();

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting to all routes
app.use(general);

// Static files
// Serve uploaded files with relaxed CORP so frontend can preview cross-origin
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    // Allow embedding/consumption from another origin (frontend dev server)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://tik-store-tok-4u.com');
  }
}));

// Root API endpoint
app.get('/api', (req, res) => {
  res.status(200).json({ 
    message: 'TikTok Shop API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
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
      '/api/seller',
      '/api/health'
    ]
  });
});

// Health routes (no rate limiting)
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes); // Keep backward compatibility

// API Routes with specific rate limiting
// Apply refresh rate limiter specifically to refresh endpoint FIRST
app.use('/api/auth/refresh', refresh);
// Apply userStatus rate limiter to /me endpoint and other status checks
app.use('/api/auth/me', userStatus);
app.use('/api/auth', auth, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/finance', authenticateToken, financeRoutes);
app.use('/api/search', search, searchRoutes);
app.use('/api/distributions', authenticateToken, distributionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/seller', sellerRoutes);

// Initialize real-time service
const realtimeService = new RealtimeService(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('join-room', (room) => {
    socket.join(room);
    logger.info(`User ${socket.id} joined room: ${room}`);
  });
  
  socket.on('leave-room', (room) => {
    socket.leave(room);
    logger.info(`User ${socket.id} left room: ${room}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Start periodic updates for admin panel
realtimeService.startPeriodicUpdates();

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Start server first, then connect to database
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      
      // Try to connect to database after server is running
      connectDB().then(() => {
        logger.info('Database connected successfully');
      }).catch((error) => {
        logger.error('Database connection failed:', error);
        logger.info('Server is running but database is not available');
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

startServer();

module.exports = { app, server, io };
