const { logger } = require('../utils/logger');
const { executeQuery } = require('../config/database');

class RealtimeService {
  constructor(io) {
    this.io = io;
    this.adminNamespace = io.of('/admin');
    this.activeAdmins = new Map();
    this.lastStats = {};
    this.lastActiveOrdersCount = 0;
    this.lastPendingApprovalsCount = 0;
    this.statsCache = {};
    this.cacheExpiry = 30000; // 30 seconds cache
    this.lastCacheUpdate = 0;
    
    this.setupAdminNamespace();
  }

  setupAdminNamespace() {
    this.adminNamespace.on('connection', (socket) => {
      logger.info(`Admin connected: ${socket.id}`);

      // Handle admin authentication
      socket.on('admin-auth', async (data) => {
        try {
          const { userId, token } = data;
          
          // Verify admin user (in production, verify JWT token)
          const admin = await executeQuery(
            'SELECT id, full_name, email, role FROM users WHERE id = ? AND role = "admin" AND status = "active"',
            [userId]
          );

          if (admin.length > 0) {
            this.activeAdmins.set(socket.id, {
              ...admin[0],
              lastActivity: Date.now(),
              socketId: socket.id
            });
            socket.userId = userId;
            socket.join('admin-room');
            
            socket.emit('admin-authenticated', {
              success: true,
              user: admin[0]
            });

            // Send initial real-time data
            this.sendInitialData(socket);
            
            logger.info(`Admin ${admin[0].full_name} authenticated for real-time updates`);
          } else {
            socket.emit('admin-authenticated', {
              success: false,
              message: 'Invalid admin credentials'
            });
          }
        } catch (error) {
          logger.error('Admin authentication error:', error);
          socket.emit('admin-authenticated', {
            success: false,
            message: 'Authentication failed'
          });
        }
      });

      // Handle admin joining specific monitoring rooms
      socket.on('join-monitoring', (data) => {
        const { type, id } = data;
        const roomName = `${type}-${id}`;
        socket.join(roomName);
        logger.info(`Admin ${socket.id} joined monitoring room: ${roomName}`);
      });

      // Handle admin leaving monitoring rooms
      socket.on('leave-monitoring', (data) => {
        const { type, id } = data;
        const roomName = `${type}-${id}`;
        socket.leave(roomName);
        logger.info(`Admin ${socket.id} left monitoring room: ${roomName}`);
      });

      // Handle admin preferences
      socket.on('set-preferences', (data) => {
        const { preferences } = data;
        if (socket.userId) {
          // Store admin preferences (could be saved to database)
          socket.adminPreferences = preferences;
          logger.info(`Admin ${socket.userId} updated preferences`);
        }
      });

      socket.on('disconnect', () => {
        if (this.activeAdmins.has(socket.id)) {
          const admin = this.activeAdmins.get(socket.id);
          logger.info(`Admin ${admin.full_name} disconnected: ${socket.id}`);
          this.activeAdmins.delete(socket.id);
        }
      });
    });
  }

  async sendInitialData(socket) {
    try {
      // Send system overview data
      const systemStats = await this.getSystemStats();
      socket.emit('system-stats', systemStats);

      // Send recent activity
      const recentActivity = await this.getRecentActivity();
      socket.emit('recent-activity', recentActivity);

      // Send active orders count
      const activeOrders = await this.getActiveOrdersCount();
      socket.emit('active-orders', activeOrders);

      // Send pending approvals count
      const pendingApprovals = await this.getPendingApprovalsCount();
      socket.emit('pending-approvals', pendingApprovals);

    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  async getSystemStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'seller' AND role != 'admin') as total_sellers,
          (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
          (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as active_products,
          (SELECT COUNT(*) FROM orders WHERE status != 'cancelled') as total_orders,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered') as total_revenue,
          (SELECT COUNT(*) FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as active_users_24h,
          (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as orders_24h
      `);

      return stats[0] || {};
    } catch (error) {
      logger.error('Error getting system stats:', error);
      return {};
    }
  }

  async getRecentActivity() {
    try {
      const activity = await executeQuery(`
        SELECT 
          'user_registered' as type,
          COALESCE(u.full_name, 'Unknown User') as name,
          COALESCE(u.email, 'No email') as details,
          u.created_at as timestamp
        FROM users u
        WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        UNION ALL
        SELECT 
          'order_placed' as type,
          CONCAT(COALESCE(c.full_name, 'Unknown Customer'), ' → ', COALESCE(s.full_name, 'Unknown Seller')) as name,
          CONCAT('Order #', COALESCE(o.order_number, 'N/A'), ' - $', COALESCE(o.total_amount, 0)) as details,
          o.created_at as timestamp
        FROM orders o
        LEFT JOIN users c ON o.customer_id = c.id
        LEFT JOIN users s ON o.seller_id = s.id
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY timestamp DESC
        LIMIT 20
      `);

      return activity;
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      return [];
    }
  }

  async getActiveOrdersCount() {
    try {
      const result = await executeQuery(`
        SELECT COUNT(*) as count
        FROM orders 
        WHERE status IN ('pending', 'confirmed', 'processing', 'shipped')
      `);
      return result[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting active orders count:', error);
      return 0;
    }
  }

  async getPendingApprovalsCount() {
    try {
      const result = await executeQuery(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE role = 'seller' AND role != 'admin' AND status = 'pending'
      `);
      return result[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting pending approvals count:', error);
      return 0;
    }
  }

  // Broadcast system updates to all connected admins
  broadcastToAdmins(event, data) {
    this.adminNamespace.to('admin-room').emit(event, data);
  }

  // Send update to specific admin
  sendToAdmin(adminId, event, data) {
    this.adminNamespace.to('admin-room').emit(event, data);
  }

  // Notify about new order
  async notifyNewOrder(orderId) {
    try {
      const order = await executeQuery(`
        SELECT o.*, c.full_name as customer_name, s.full_name as seller_name
        FROM orders o
        LEFT JOIN users c ON o.customer_id = c.id
        LEFT JOIN users s ON o.seller_id = s.id
        WHERE o.id = ?
      `, [orderId]);

      if (order.length > 0) {
        this.broadcastToAdmins('new-order', {
          order: order[0],
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error notifying new order:', error);
    }
  }

  // Notify about new user registration
  async notifyNewUser(userId) {
    try {
      const user = await executeQuery(
        'SELECT id, full_name, email, role, status FROM users WHERE id = ?',
        [userId]
      );

      if (user.length > 0) {
        this.broadcastToAdmins('new-user', {
          user: user[0],
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error notifying new user:', error);
    }
  }

  // Notify about new product
  async notifyNewProduct(productId) {
    try {
      const product = await executeQuery(`
        SELECT p.*, c.name as category_name, u.full_name as created_by_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = ?
      `, [productId]);

      if (product.length > 0) {
        this.broadcastToAdmins('new-product', {
          product: product[0],
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error notifying new product:', error);
    }
  }

  // Notify about order status change
  async notifyOrderStatusChange(orderId, newStatus) {
    try {
      const order = await executeQuery(`
        SELECT o.*, c.full_name as customer_name, s.full_name as seller_name
        FROM orders o
        LEFT JOIN users c ON o.customer_id = c.id
        LEFT JOIN users s ON o.seller_id = s.id
        WHERE o.id = ?
      `, [orderId]);

      if (order.length > 0) {
        this.broadcastToAdmins('order-status-change', {
          order: order[0],
          newStatus,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error notifying order status change:', error);
    }
  }

  // Notify about system alerts
  notifySystemAlert(alert) {
    this.broadcastToAdmins('system-alert', {
      ...alert,
      timestamp: new Date().toISOString()
    });
  }

  // Send periodic updates with caching and intelligent updates
  startPeriodicUpdates() {
    // Update system stats every 2 minutes (instead of 30 seconds)
    setInterval(async () => {
      try {
        const now = Date.now();
        
        // Only update if cache is expired or if there are connected admins
        if (this.getConnectedAdminsCount() > 0 && 
            (now - this.lastCacheUpdate > this.cacheExpiry || Object.keys(this.statsCache).length === 0)) {
          
          const systemStats = await this.getSystemStats();
          
          // Only broadcast if stats have changed significantly
          if (this.hasStatsChanged(systemStats)) {
            this.broadcastToAdmins('system-stats-update', systemStats);
            this.lastStats = { ...systemStats };
          }
          
          this.statsCache = systemStats;
          this.lastCacheUpdate = now;
        }
      } catch (error) {
        logger.error('Error in system stats update:', error);
      }
    }, 120000); // 2 minutes

    // Update active orders count every 1 minute (instead of 10 seconds)
    setInterval(async () => {
      try {
        if (this.getConnectedAdminsCount() > 0) {
          const activeOrders = await this.getActiveOrdersCount();
          
          // Only broadcast if count has changed
          if (activeOrders !== this.lastActiveOrdersCount) {
            this.broadcastToAdmins('active-orders-update', { count: activeOrders });
            this.lastActiveOrdersCount = activeOrders;
          }
        }
      } catch (error) {
        logger.error('Error in active orders update:', error);
      }
    }, 60000); // 1 minute

    // Update pending approvals count every 2 minutes (instead of 30 seconds)
    setInterval(async () => {
      try {
        if (this.getConnectedAdminsCount() > 0) {
          const pendingApprovals = await this.getPendingApprovalsCount();
          
          // Only broadcast if count has changed
          if (pendingApprovals !== this.lastPendingApprovalsCount) {
            this.broadcastToAdmins('pending-approvals-update', { count: pendingApprovals });
            this.lastPendingApprovalsCount = pendingApprovals;
          }
        }
      } catch (error) {
        logger.error('Error in pending approvals update:', error);
      }
    }, 120000); // 2 minutes
  }

  // Check if stats have changed significantly to avoid unnecessary broadcasts
  hasStatsChanged(newStats) {
    if (!this.lastStats || Object.keys(this.lastStats).length === 0) {
      return true;
    }
    
    const significantChange = 0.05; // 5% change threshold
    
    for (const [key, newValue] of Object.entries(newStats)) {
      const oldValue = this.lastStats[key];
      if (oldValue === undefined) continue;
      
      if (typeof newValue === 'number' && typeof oldValue === 'number') {
        if (oldValue === 0 && newValue > 0) return true;
        if (oldValue > 0) {
          const change = Math.abs(newValue - oldValue) / oldValue;
          if (change > significantChange) return true;
        }
      } else if (newValue !== oldValue) {
        return true;
      }
    }
    
    return false;
  }

  // Get connected admins count
  getConnectedAdminsCount() {
    return this.activeAdmins.size;
  }

  // Get connected admins info
  getConnectedAdmins() {
    return Array.from(this.activeAdmins.values());
  }

  // Update admin activity
  updateAdminActivity(adminId) {
    const admin = this.activeAdmins.get(adminId);
    if (admin) {
      admin.lastActivity = Date.now();
    }
  }

  // Check if we should stop updates due to no admin activity
  shouldStopUpdates() {
    const connectedAdmins = this.getConnectedAdminsCount();
    if (connectedAdmins === 0) {
      // If no admins for more than 5 minutes, consider stopping updates
      const lastAdminActivity = Math.max(...Array.from(this.activeAdmins.values()).map(admin => admin.lastActivity || 0));
      const timeSinceLastActivity = Date.now() - lastAdminActivity;
      
      if (timeSinceLastActivity > 300000) { // 5 minutes
        logger.info('No admin activity for 5+ minutes, considering stopping updates');
        return true;
      }
    }
    return false;
  }
}

module.exports = RealtimeService;
