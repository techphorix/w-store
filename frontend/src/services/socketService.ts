import { io, Socket } from 'socket.io-client';
import { CookieManager } from '../utils/cookieManager';

interface Notification {
  id?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read?: boolean;
}

interface OrderUpdate {
  orderId: string;
  order: any;
  timestamp: Date;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  
  // Event listeners
  private notificationListeners: ((notification: Notification) => void)[] = [];
  private orderUpdateListeners: ((update: OrderUpdate) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private systemAnnouncementListeners: ((announcement: any) => void)[] = [];

  initialize() {
    const token = CookieManager.getAuthToken();
    if (!token) {
      console.warn('No authentication token found');
      return;
    }

    const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      autoConnect: true
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);
      
      // Request recent notifications on connect
      this.socket?.emit('request_notifications');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.notifyConnectionListeners(false);
      
      // Attempt to reconnect if disconnection was unexpected
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }
      
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.notifyConnectionListeners(false);
      this.attemptReconnect();
    });

    // Notification events
    this.socket.on('new_notification', (notification: Notification) => {
      console.log('New notification received:', notification);
      this.notifyNotificationListeners(notification);
      
      // Show browser notification if permission granted
      this.showBrowserNotification(notification);
    });

    this.socket.on('notifications_update', (notifications: Notification[]) => {
      console.log('Notifications update received:', notifications);
      // Handle bulk notification updates
      notifications.forEach(notification => {
        this.notifyNotificationListeners(notification);
      });
    });

    // Order events
    this.socket.on('order_updated', (update: OrderUpdate) => {
      console.log('Order update received:', update);
      this.notifyOrderUpdateListeners(update);
    });

    // System events
    this.socket.on('system_announcement', (announcement: any) => {
      console.log('System announcement received:', announcement);
      this.notifySystemAnnouncementListeners(announcement);
    });

    // Analytics events (for admin users)
    this.socket.on('analytics_update', (data: any) => {
      console.log('Analytics update received:', data);
      // Handle analytics updates
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private showBrowserNotification(notification: Notification) {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/tiktok-logo.png',
        badge: '/tiktok-logo.png',
        tag: notification.id || `notification-${Date.now()}`,
        requireInteraction: notification.priority === 'urgent'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          this.showBrowserNotification(notification);
        }
      });
    }
  }

  // Event listener management
  onNotification(callback: (notification: Notification) => void) {
    this.notificationListeners.push(callback);
    return () => {
      const index = this.notificationListeners.indexOf(callback);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
      }
    };
  }

  onOrderUpdate(callback: (update: OrderUpdate) => void) {
    this.orderUpdateListeners.push(callback);
    return () => {
      const index = this.orderUpdateListeners.indexOf(callback);
      if (index > -1) {
        this.orderUpdateListeners.splice(index, 1);
      }
    };
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.push(callback);
    return () => {
      const index = this.connectionListeners.indexOf(callback);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  onSystemAnnouncement(callback: (announcement: any) => void) {
    this.systemAnnouncementListeners.push(callback);
    return () => {
      const index = this.systemAnnouncementListeners.indexOf(callback);
      if (index > -1) {
        this.systemAnnouncementListeners.splice(index, 1);
      }
    };
  }

  // Notification methods
  private notifyNotificationListeners(notification: Notification) {
    this.notificationListeners.forEach(callback => callback(notification));
  }

  private notifyOrderUpdateListeners(update: OrderUpdate) {
    this.orderUpdateListeners.forEach(callback => callback(update));
  }

  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach(callback => callback(connected));
  }

  private notifySystemAnnouncementListeners(announcement: any) {
    this.systemAnnouncementListeners.forEach(callback => callback(announcement));
  }

  // Room management
  joinOrderRoom(orderId: string) {
    this.socket?.emit('join_order_room', orderId);
  }

  leaveOrderRoom(orderId: string) {
    this.socket?.emit('leave_order_room', orderId);
  }

  // Notification actions
  markNotificationAsRead(notificationId: string) {
    this.socket?.emit('mark_notification_read', notificationId);
  }

  requestNotifications() {
    this.socket?.emit('request_notifications');
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear all listeners
    this.notificationListeners = [];
    this.orderUpdateListeners = [];
    this.connectionListeners = [];
    this.systemAnnouncementListeners = [];
  }

  // Reconnect with new token (after login)
  reconnectWithToken() {
    this.disconnect();
    this.initialize();
  }

  // Get socket instance (for advanced usage)
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
