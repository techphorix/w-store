const { logger } = require('../utils/logger');
const { executeQuery } = require('../config/database');

class RealtimeService {
  constructor(io) {
    this.io = io;
    this.adminNamespace = io.of('/admin');
    this.activeAdmins = new Map(); // Map of admin socket IDs to user info
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
            this.activeAdmins.set(socket.id, admin[0]);
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
          (SELECT COUNT(*) FROM users WHERE role = 'seller') as total_sellers,
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
        WHERE role = 'seller' AND status = 'pending'
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

  // Send periodic updates
  startPeriodicUpdates() {
    setInterval(async () => {
      try {
        // Update system stats every 30 seconds
        const systemStats = await this.getSystemStats();
        this.broadcastToAdmins('system-stats-update', systemStats);

        // Update active orders count every 10 seconds
        const activeOrders = await this.getActiveOrdersCount();
        this.broadcastToAdmins('active-orders-update', { count: activeOrders });

        // Update pending approvals count every 30 seconds
        const pendingApprovals = await this.getPendingApprovalsCount();
        this.broadcastToAdmins('pending-approvals-update', { count: pendingApprovals });

      } catch (error) {
        logger.error('Error in periodic updates:', error);
      }
    }, 10000); // 10 seconds interval
  }

  // Get connected admins count
  getConnectedAdminsCount() {
    return this.activeAdmins.size;
  }

  // Get connected admins info
  getConnectedAdmins() {
    return Array.from(this.activeAdmins.values());
  }
}

module.exports = RealtimeService;
