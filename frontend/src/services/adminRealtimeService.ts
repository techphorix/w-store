import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';

export interface SystemStats {
  total_users: number;
  total_sellers: number;
  total_admins: number;
  active_products: number;
  total_orders: number;
  total_revenue: number;
  active_users_24h: number;
  orders_24h: number;
}

export interface RecentActivity {
  type: string;
  name: string;
  details: string;
  timestamp: string;
}

export interface OrderUpdate {
  order: any;
  newStatus: string;
  timestamp: string;
}

export interface NewOrder {
  order: any;
  timestamp: string;
}

export interface NewUser {
  user: any;
  timestamp: string;
}

export interface NewProduct {
  product: any;
  timestamp: string;
}

export interface SystemAlert {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

export interface AdminPreferences {
  notifications: {
    newOrders: boolean;
    newUsers: boolean;
    newProducts: boolean;
    systemAlerts: boolean;
  };
  refreshInterval: number;
  autoRefresh: boolean;
}

class AdminRealtimeService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private adminId: string | null = null;
  private adminToken: string | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.setupSocket();
  }

  private setupSocket() {
    try {
      const base = ((import.meta as any).env?.VITE_API_URL as string) || (((import.meta as any).env?.DEV) ? 'http://localhost:5000/api' : 'https://api.tik-store-tok-4u.com/api');
      const serverUrl = String(base).replace(/\/api\/?$/, '');
      this.socket = io(`${serverUrl}/admin`, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
      });

      this.setupSocketEvents();
    } catch (error) {
      console.error('Failed to setup socket:', error);
    }
  }

  private setupSocketEvents() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Admin real-time service connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Authenticate if we have admin credentials
      if (this.adminId && this.adminToken) {
        this.authenticate(this.adminId, this.adminToken);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Admin real-time service disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Admin real-time service connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Admin real-time service reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      
      // Re-authenticate after reconnection
      if (this.adminId && this.adminToken) {
        this.authenticate(this.adminId, this.adminToken);
      }
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Admin real-time service reconnection failed');
      this.isConnected = false;
    });

    // Handle admin authentication response
    this.socket.on('admin-authenticated', (data) => {
      if (data.success) {
        console.log('Admin authenticated for real-time updates:', data.user);
        this.emit('admin-authenticated', data);
      } else {
        console.error('Admin authentication failed:', data.message);
        this.emit('admin-authentication-failed', data);
      }
    });

    // Handle real-time data updates
    this.socket.on('system-stats', (stats: SystemStats) => {
      this.emit('system-stats', stats);
    });

    this.socket.on('system-stats-update', (stats: SystemStats) => {
      this.emit('system-stats-update', stats);
    });

    this.socket.on('recent-activity', (activity: RecentActivity[]) => {
      this.emit('recent-activity', activity);
    });

    this.socket.on('active-orders', (data: { count: number }) => {
      this.emit('active-orders', data);
    });

    this.socket.on('active-orders-update', (data: { count: number }) => {
      this.emit('active-orders-update', data);
    });

    this.socket.on('pending-approvals', (data: { count: number }) => {
      this.emit('pending-approvals', data);
    });

    this.socket.on('pending-approvals-update', (data: { count: number }) => {
      this.emit('pending-approvals-update', data);
    });

    // Handle real-time notifications
    this.socket.on('new-order', (data: NewOrder) => {
      this.emit('new-order', data);
      this.showNotification('New Order', `Order #${data.order.order_number} received`, 'info');
    });

    this.socket.on('new-user', (data: NewUser) => {
      this.emit('new-user', data);
      this.showNotification('New User', `${data.user.full_name} registered`, 'info');
    });

    this.socket.on('new-product', (data: NewProduct) => {
      this.emit('new-product', data);
      this.showNotification('New Product', `${data.product.name} added`, 'info');
    });

    this.socket.on('order-status-change', (data: OrderUpdate) => {
      this.emit('order-status-change', data);
      this.showNotification('Order Update', `Order #${data.order.order_number} status changed to ${data.newStatus}`, 'info');
    });

    this.socket.on('system-alert', (alert: SystemAlert) => {
      this.emit('system-alert', alert);
      this.showNotification(alert.title, alert.message, alert.type);
    });
  }

  private showNotification(title: string, message: string, type: string) {
    // Show toast notification
    switch (type) {
      case 'success':
        toast.success(`${title}: ${message}`);
        break;
      case 'error':
        toast.error(`${title}: ${message}`);
        break;
      case 'warning':
        toast.error(`${title}: ${message}`);
        break;
      default:
        toast(`${title}: ${message}`);
    }
  }

  // Authenticate admin user
  authenticate(adminId: string, adminToken: string) {
    this.adminId = adminId;
    this.adminToken = adminToken;

    if (this.socket && this.isConnected) {
      this.socket.emit('admin-auth', { userId: adminId, token: adminToken });
    }
  }

  // Join monitoring room for specific entity
  joinMonitoring(type: string, id: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-monitoring', { type, id });
    }
  }

  // Leave monitoring room
  leaveMonitoring(type: string, id: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-monitoring', { type, id });
    }
  }

  // Set admin preferences
  setPreferences(preferences: AdminPreferences) {
    if (this.socket && this.isConnected) {
      this.socket.emit('set-preferences', { preferences });
    }
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.adminId = null;
    this.adminToken = null;
  }

  // Cleanup
  cleanup() {
    this.disconnect();
    this.eventListeners.clear();
  }
}

// Create singleton instance
const adminRealtimeService = new AdminRealtimeService();

export default adminRealtimeService;
