console.log('1. Starting debug server...');

const express = require('express');
console.log('2. Express loaded');

const cors = require('cors');
console.log('3. CORS loaded');

const helmet = require('helmet');
console.log('4. Helmet loaded');

const compression = require('compression');
console.log('5. Compression loaded');

const morgan = require('morgan');
console.log('6. Morgan loaded');

const rateLimit = require('express-rate-limit');
console.log('7. Rate limit loaded');

const http = require('http');
console.log('8. HTTP loaded');

const socketIo = require('socket.io');
console.log('9. Socket.io loaded');

console.log('10. Loading routes...');
const authRoutes = require('./routes/auth');
console.log('11. Auth routes loaded');

const productRoutes = require('./routes/products');
console.log('12. Product routes loaded');

const orderRoutes = require('./routes/orders');
console.log('13. Order routes loaded');

const userRoutes = require('./routes/users');
console.log('14. User routes loaded');

const adminRoutes = require('./routes/admin');
console.log('15. Admin routes loaded');

const notificationRoutes = require('./routes/notifications');
console.log('16. Notification routes loaded');

const analyticsRoutes = require('./routes/analytics');
console.log('17. Analytics routes loaded');

const financeRoutes = require('./routes/finance');
console.log('18. Finance routes loaded');

const searchRoutes = require('./routes/search');
console.log('19. Search routes loaded');

const distributionRoutes = require('./routes/distributions');
console.log('20. Distribution routes loaded');

const uploadRoutes = require('./routes/uploads');
console.log('21. Upload routes loaded');

const categoryRoutes = require('./routes/categories');
console.log('22. Category routes loaded');

console.log('23. Loading middleware...');
const { errorHandler } = require('./middleware/errorHandler');
console.log('24. Error handler loaded');

const { authenticateToken } = require('./middleware/auth');
console.log('25. Auth middleware loaded');

const { logger } = require('./utils/logger');
console.log('26. Logger loaded');

const { createRateLimiters } = require('./config/rateLimit');
console.log('27. Rate limiters loaded');

console.log('28. Loading database...');
const { connectDB } = require('./config/database');
console.log('29. Database config loaded');

console.log('30. Loading RealtimeService...');
const RealtimeService = require('./services/realtimeService');
console.log('31. RealtimeService loaded');

console.log('32. Creating Express app...');
const app = express();
console.log('33. Express app created');

console.log('34. Creating HTTP server...');
const server = http.createServer(app);
console.log('35. HTTP server created');

console.log('36. Creating Socket.io...');
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
console.log('37. Socket.io created');

console.log('38. Creating rate limiters...');
const { general, auth, sensitive, uploads, search } = createRateLimiters();
console.log('39. Rate limiters created');

console.log('40. Setting up middleware...');
app.use(helmet());
console.log('41. Helmet middleware set');

app.use(compression());
console.log('42. Compression middleware set');

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
console.log('43. Morgan middleware set');

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
console.log('44. CORS middleware set');

app.use(express.json({ limit: '10mb' }));
console.log('45. JSON middleware set');

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('46. URL encoded middleware set');

app.use(general);
console.log('47. General rate limiting set');

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  }
}));
console.log('48. Static files middleware set');

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
console.log('49. Health check route set');

console.log('50. Setting up API routes...');
app.use('/api/auth', auth, authRoutes);
console.log('51. Auth routes set');

app.use('/api/products', productRoutes);
console.log('52. Product routes set');

app.use('/api/orders', orderRoutes);
console.log('53. Order routes set');

app.use('/api/users', userRoutes);
console.log('54. User routes set');

app.use('/api/admin', authenticateToken, adminRoutes);
console.log('55. Admin routes set');

app.use('/api/categories', categoryRoutes);
console.log('56. Category routes set');

app.use('/api/notifications', authenticateToken, notificationRoutes);
console.log('57. Notification routes set');

app.use('/api/analytics', authenticateToken, analyticsRoutes);
console.log('58. Analytics routes set');

app.use('/api/finance', authenticateToken, financeRoutes);
console.log('59. Finance routes set');

app.use('/api/search', search, searchRoutes);
console.log('60. Search routes set');

app.use('/api/distributions', authenticateToken, distributionRoutes);
console.log('61. Distribution routes set');

app.use('/api/uploads', uploadRoutes);
console.log('62. Upload routes set');

console.log('63. Initializing RealtimeService...');
const realtimeService = new RealtimeService(io);
console.log('64. RealtimeService initialized');

console.log('65. Setting up Socket.io...');
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
console.log('66. Socket.io setup complete');

console.log('67. Starting periodic updates...');
realtimeService.startPeriodicUpdates();
console.log('68. Periodic updates started');

app.set('io', io);
console.log('69. IO set on app');

app.use(errorHandler);
console.log('70. Error handler middleware set');

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});
console.log('71. 404 handler set');

const PORT = 5000;
console.log('72. Port set to:', PORT);

console.log('73. Starting server...');
const startServer = async () => {
  try {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
console.log('74. Server start function called');
