import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import socketService from '../services/socketService';
import { notificationsApi } from '../services/api';
import CookieManager from '../utils/cookieManager';

interface Notification {
  _id?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read?: boolean;
  actionButton?: {
    text: string;
    url?: string;
    action?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Notification) => void;
  removeNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  fetchNotifications: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast = { id, message, type };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsApi.getNotifications({ limit: 50 });
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't show toast for auth errors - user is still logged in via cookies
      if (error?.response?.status !== 401 && error?.response?.status !== 500) {
        showToast('Failed to load notifications', 'error');
      }
    }
  }, [showToast]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Don't show toast for server errors during initial load
      if (error?.response?.status !== 401 && error?.response?.status !== 500) {
        showToast('Failed to load notification count', 'error');
      }
    }
  }, [showToast]);

  // Initialize socket connection on mount
  useEffect(() => {
    // Check for token from cookies first, fallback to localStorage
    const token = CookieManager.getAuthToken() || localStorage.getItem('token');
    if (!token) {
      console.log('No token found, skipping notification initialization');
      return;
    }

    console.log('Initializing notifications with token');
    socketService.initialize();
    
    // Fetch notifications with better error handling and rate limiting awareness
    const initializeNotifications = async () => {
      try {
        // Add delay to prevent overwhelming the API during app initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await fetchNotifications();
        await fetchUnreadCount();
      } catch (error: any) {
        console.error('Failed to initialize notifications:', error);
        
        // Handle rate limiting specifically
        if (error?.response?.status === 429) {
          console.log('Rate limited during notification initialization, will retry later');
          // Retry after a delay
          setTimeout(() => {
            initializeNotifications();
          }, 5000); // Retry after 5 seconds
        }
      }
    };
    
    initializeNotifications();

    // Socket event listeners
    const unsubscribeNotification = socketService.onNotification((notification) => {
      addNotification(notification);
      setUnreadCount(prev => prev + 1);
    });

    const unsubscribeConnection = socketService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    const unsubscribeSystemAnnouncement = socketService.onSystemAnnouncement((announcement) => {
      showToast(announcement.message, announcement.type || 'info');
    });

    // Cleanup on unmount
    return () => {
      unsubscribeNotification();
      unsubscribeConnection();
      unsubscribeSystemAnnouncement();
    };
  }, [fetchNotifications, fetchUnreadCount, showToast]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const removeNotification = async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      // Update unread count if notification was unread
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, read: true } 
            : n
        )
      );
      
      // Update unread count
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Notify socket service
      socketService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };



  // Auto-remove toasts
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const contextValue: NotificationContextType = useMemo(() => ({
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    fetchNotifications,
    showToast
  }), [notifications, unreadCount, isConnected, fetchNotifications]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none sm:right-4 sm:top-4 right-2 top-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full bg-white/95 backdrop-blur-sm shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 animate-slide-in-right hover:shadow-xl cursor-pointer ${
              toast.type === 'success' ? 'border-l-4 border-green-400' :
              toast.type === 'error' ? 'border-l-4 border-red-400' :
              toast.type === 'warning' ? 'border-l-4 border-yellow-400' :
              'border-l-4 border-blue-400'
            }`}
            onClick={() => removeToast(toast.id)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      toast.type === 'success' ? 'bg-green-100' :
                      toast.type === 'error' ? 'bg-red-100' :
                      toast.type === 'warning' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <span className={`text-xs ${
                        toast.type === 'success' ? 'text-green-600' :
                        toast.type === 'error' ? 'text-red-600' :
                        toast.type === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`}>
                        {toast.type === 'success' ? '✓' :
                         toast.type === 'error' ? '✕' :
                         toast.type === 'warning' ? '⚠' :
                         'ℹ'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => removeToast(toast.id)}
                  >
                    <span className="sr-only">Close</span>
                    <span className="h-5 w-5">✕</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
