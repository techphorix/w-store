import axios from 'axios';
import CookieManager from '../utils/cookieManager';

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: '/api', // Use relative path since Vite proxy is configured
  timeout: 10000,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Utility function to check if user is authenticated
const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  
  const token = CookieManager.getAuthToken() || localStorage.getItem('token');
  const impersonationToken = localStorage.getItem('impersonationToken');
  
  return !!(token || impersonationToken);
};

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Skip requests if not authenticated (except for auth endpoints)
  if (!isAuthenticated() && !config.url?.startsWith('/auth/')) {
    console.log('⚠️ Skipping request - user not authenticated:', config.url);
    return Promise.reject(new Error('User not authenticated'));
  }
  
  // Check for impersonation token first (for admin impersonation)
  const impersonationToken = localStorage.getItem('impersonationToken');
  let token = null;
  
  if (impersonationToken && impersonationToken !== 'undefined' && impersonationToken.trim() !== '') {
    token = impersonationToken;
    console.log('🎭 Using impersonation token for request');
  } else {
    // Clean up invalid impersonation token
    if (impersonationToken === 'undefined' || impersonationToken === 'null') {
      localStorage.removeItem('impersonationToken');
      console.log('🧹 Cleaned up invalid impersonation token');
    }
    
    // Try to get token from cookies first, fallback to localStorage
    token = CookieManager.getAuthToken() || localStorage.getItem('token');
  }
  
  // Debug logging for authentication
  console.log('🔐 Request interceptor:', {
    url: config.url,
    method: config.method,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 10) + '...' : 'null',
    tokenLength: token ? token.length : 0,
    isImpersonation: !!impersonationToken,
    headers: config.headers
  });
  
  if (token) {
    // Ensure token is properly formatted
    const cleanToken = token.trim();
    if (cleanToken) {
      config.headers.Authorization = `Bearer ${cleanToken}`;
      console.log('✅ Token added to request headers:', {
        headerValue: `Bearer ${cleanToken.substring(0, 10)}...`,
        tokenLength: cleanToken.length,
        isImpersonation: !!impersonationToken
      });
    } else {
      console.warn('⚠️ Token is empty or whitespace only');
    }
  } else {
    console.log('⚠️ No token found for request');
  }
  
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle rate limiting (429 errors)
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const retryAfter = error.response.headers['retry-after'] || 5;
      console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
      
      // Wait for the specified retry time
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      
      // Retry the request
      return api(originalRequest);
    }
    
    // Handle authentication errors - but prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._isRefreshRequest) {
      console.log('🔒 Authentication error, attempting token refresh...');
      
      try {
        // Mark this as a refresh request to prevent loops
        originalRequest._isRefreshRequest = true;
        
        // Try to refresh the token
        const refreshResponse = await api.post('/auth/refresh');
        const newToken = refreshResponse.data.token;
        
        if (newToken) {
          console.log('✅ Token refreshed successfully');
          
          // Update the token in cookies
          const CookieManager = await import('../utils/cookieManager');
          const user = CookieManager.default.getUserData();
          if (user) {
            CookieManager.default.setAuthCookies(newToken, user, CookieManager.default.isRememberMe());
          }
          
          // Update the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          originalRequest._retry = true;
          originalRequest._isRefreshRequest = false; // Reset flag
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.log('❌ Token refresh failed:', refreshError.response?.status || refreshError.message);
        
        // If refresh fails with 429, wait and retry once
        if (refreshError.response?.status === 429 && !originalRequest._refreshRetry) {
          originalRequest._refreshRetry = true;
          const retryAfter = refreshError.response.headers['retry-after'] || 10;
          console.log(`Refresh rate limited. Waiting ${retryAfter} seconds before retry...`);
          
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          
          try {
            const retryRefreshResponse = await api.post('/auth/refresh');
            const retryNewToken = retryRefreshResponse.data.token;
            
            if (retryNewToken) {
              console.log('✅ Token refresh succeeded on retry');
              
              // Update the token in cookies
              const CookieManager = await import('../utils/cookieManager');
              const user = CookieManager.default.getUserData();
              if (user) {
                CookieManager.default.setAuthCookies(retryNewToken, user, CookieManager.default.isRememberMe());
              }
              
              // Update the original request with new token
              originalRequest.headers.Authorization = `Bearer ${retryNewToken}`;
              originalRequest._retry = true;
              originalRequest._isRefreshRequest = false;
              
              // Retry the original request
              return api(originalRequest);
            }
          } catch (retryError) {
            console.log('❌ Token refresh retry also failed:', retryError.message);
          }
        }
        
        // Clear cookies and redirect to login if refresh fails completely
        console.log('❌ Token refresh failed completely, clearing auth data');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('impersonationToken');
          // Note: Cookie clearing should be handled by the auth context
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (formData: FormData) => {
    const response = await api.post('/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  login: async (emailOrPhone: string, password: string, rememberMe = false) => {
    const response = await api.post('/auth/login', {
      emailOrPhone,
      password,
      rememberMe,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    // The backend returns { error: false, user: userData }
    // We need to extract the user data from the response
    return response.data.user;
  },

  updateProfile: async (formData: FormData) => {
    const response = await api.put('/auth/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string, confirmPassword: string) => {
    const response = await api.post('/auth/reset-password', {
      token,
      password,
      confirmPassword,
    });
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Products API
export const productsApi = {
  getProducts: async (params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    status?: string;
  } = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProduct: async (id: string) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (formData: FormData) => {
    const response = await api.post('/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateProduct: async (id: string, formData: FormData) => {
    const response = await api.put(`/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  createDistribution: async (id: string, data: {
    allocatedStock?: number;
    markup?: number;
    sellerNotes?: string;
  }) => {
    const response = await api.post(`/products/${id}/distribute`, data);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/products/meta/categories');
    return response.data;
  },

  getProductStats: async () => {
    const response = await api.get('/products/meta/stats');
    return response.data;
  },
};

// Orders API
export const ordersApi = {
  getOrders: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: {
    sellerId: string;
    items: Array<{ productId: string; quantity: number }>;
    shippingAddress: any;
    paymentMethod: string;
    customerNotes?: string;
  }) => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  updateOrderStatus: async (id: string, data: {
    status: string;
    note?: string;
    trackingNumber?: string;
  }) => {
    const response = await api.put(`/orders/${id}/status`, data);
    return response.data;
  },

  cancelOrder: async (id: string) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },

  getOrderStats: async () => {
    const response = await api.get('/orders/stats');
    return response.data;
  },

  getOrderAnalytics: async (days = 7) => {
    const response = await api.get('/orders/analytics', { params: { days } });
    return response.data;
  },
};

// Distributions API
export const distributionsApi = {
  getDistributions: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/distributions', { params });
    return response.data;
  },

  getDistribution: async (id: string) => {
    const response = await api.get(`/distributions/${id}`);
    return response.data;
  },

  createDistribution: async (data: {
    productId: string;
    allocatedStock?: number;
    markup?: number;
    sellerNotes?: string;
  }) => {
    const response = await api.post('/distributions', data);
    return response.data;
  },

  updateDistribution: async (id: string, data: {
    allocatedStock?: number;
    markup?: number;
    sellerNotes?: string;
    status?: string;
    adminNotes?: string;
  }) => {
    const response = await api.put(`/distributions/${id}`, data);
    return response.data;
  },

  deleteDistribution: async (id: string) => {
    const response = await api.delete(`/distributions/${id}`);
    return response.data;
  },

  // Bulk operations
  createBulkDistributions: async (data: {
    productIds: string[];
    allocatedStock?: number;
    markup?: number;
  }) => {
    const { productIds, ...distributionData } = data;
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const productId of productIds) {
      try {
        await api.post('/distributions', { ...distributionData, productId });
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          productId,
          error: error.response?.data?.message || 'Unknown error'
        });
      }
    }

    return results;
  },

  deleteBulkDistributions: async (distributionIds: string[]) => {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const distributionId of distributionIds) {
      try {
        await api.delete(`/distributions/${distributionId}`);
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          distributionId,
          error: error.response?.data?.message || 'Unknown error'
        });
      }
    }

    return results;
  },

  getDistributionStats: async () => {
    const response = await api.get('/distributions/stats');
    return response.data;
  },

  recordView: async (id: string) => {
    const response = await api.post(`/distributions/${id}/record-view`);
    return response.data;
  },

  recordClick: async (id: string) => {
    const response = await api.post(`/distributions/${id}/record-click`);
    return response.data;
  },

  getPerformanceAnalytics: async (days = 30) => {
    const response = await api.get('/distributions/analytics/performance', { params: { days } });
    return response.data;
  },
};

// Analytics API
export const analyticsApi = {
  getDashboardAnalytics: async (period = '7') => {
    const response = await api.get('/analytics/dashboard', { params: { period } });
    return response.data;
  },

  getFinancialAnalytics: async (period = '30') => {
    const response = await api.get('/analytics/financial', { params: { period } });
    return response.data;
  },

  getProductAnalytics: async (period = '30') => {
    const response = await api.get('/analytics/products', { params: { period } });
    return response.data;
  },

  getCustomerAnalytics: async (period = '30') => {
    const response = await api.get('/analytics/customers', { params: { period } });
    return response.data;
  },

  recordAnalytics: async (data: {
    entityType: string;
    entityId?: string;
    metricPath: string;
    value?: number;
    increment?: number;
  }) => {
    const response = await api.post('/analytics/record', data);
    return response.data;
  },

  exportAnalytics: async (type: string, period = '30', format = 'json') => {
    const response = await api.get('/analytics/export', {
      params: { type, period, format },
    });
    return response.data;
  },
};

// Notifications API
export const notificationsApi = {
  getNotifications: async (params: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  } = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  createNotification: async (data: {
    recipient?: string;
    recipients?: string[];
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: string;
    actionButton?: any;
    expiresAt?: string;
    channel?: string;
  }) => {
    const response = await api.post('/notifications', data);
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  broadcastNotification: async (data: {
    role: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: string;
    actionButton?: any;
    expiresAt?: string;
  }) => {
    const response = await api.post('/notifications/broadcast', data);
    return response.data;
  },

  getNotificationStats: async (days = 7) => {
    const response = await api.get('/notifications/stats', { params: { days } });
    return response.data;
    
  },
};

// Registration API (legacy compatibility)
export const registrationApi = {
  registerSeller: async (formData: FormData) => {
    return authApi.register(formData);
  },

  verifyEmail: async (token: string) => {
    return authApi.verifyEmail(token);
  },

  checkStatus: async (sellerId: string) => {
    const response = await api.get(`/registration/status/${sellerId}`);
    return response.data;
  },

  resendVerification: async (email: string) => {
    const response = await api.post('/registration/resend-verification', { email });
    return response.data;
  },
};

// Legacy API compatibility
export const sellerApi = {
  getSellerByShopname: (shopname: string) => 
    api.get(`/seller/shop/${shopname}`),
  
  getSellerProducts: (sellerId: string, params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => 
    api.get(`/seller/${sellerId}/products`, { params }),
  
  addProductToShop: (sellerId: string, catalogProductId: string) => 
    api.post(`/seller/${sellerId}/products`, { catalogProductId }),
  
  removeProductFromShop: (sellerId: string, catalogProductId: string) => 
    api.delete(`/seller/${sellerId}/products/${catalogProductId}`),
};

// Legacy compatibility - keep sellerApi as the main export

export const catalogApi = {
  getAllProducts: () => 
    api.get('/catalog'),
  
  getProductById: (id: string) => 
    api.get(`/catalog/${id}`),
  
  getProductsByCategory: (category: string) => 
    api.get(`/catalog/category/${category}`),
};

export const financeApi = {
  getDashboard: async () => {
    const response = await api.get('/finance/dashboard');
    return response.data;
  },
  
  getTransactions: async (params: {
    page?: number;
    limit?: number;
    type?: string;
  } = {}) => {
    const response = await api.get('/finance/transactions', { params });
    return response.data;
  },
  
  updatePayoutInfo: async (payoutInfo: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
    paymentMethod: string;
  }) => {
    const response = await api.post('/finance/payout-info', payoutInfo);
    return response.data;
  },
  
  updatePayoutSettings: async (settings: {
    minimumPayout?: number;
    autoPayoutEnabled?: boolean;
    payoutFrequency?: string;
  }) => {
    const response = await api.post('/finance/payout-settings', settings);
    return response.data;
  },
  
  requestPayout: async (amount: number) => {
    const response = await api.post('/finance/request-payout', { amount });
    return response.data;
  },
  
  getAnalytics: async (period = 'monthly') => {
    const response = await api.get('/finance/analytics', { params: { period } });
    return response.data;
  },
  
  // Legacy compatibility methods - redirect to new endpoints
  getSellerFinance: async (sellerId: string) => {
    return financeApi.getDashboard();
  },
  
  updateSellerFinance: async (sellerId: string, financeData: any) => {
    return financeApi.updatePayoutInfo(financeData);
  },
  
  addInvestment: async (sellerId: string, investment: any) => {
    // This would need to be handled differently in the new system
    // For now, return a placeholder response
    return { message: 'Investment functionality moved to new system' };
  },
  

};

export const statsApi = {
  getSellerStats: (sellerId: string) => 
    api.get(`/stats/seller/${sellerId}`),
  
  updateSellerStats: (sellerId: string, statsData: any) => 
    api.put(`/stats/seller/${sellerId}`, statsData),
};



// Admin API
export const adminApi = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // Get seller timeframe statistics (Today, 7 Days, 30 Days, Total)
  getSellerTimeframeStats: async (sellerId: string) => {
    const response = await api.get(`/admin/sellers/${sellerId}/timeframe-stats`);
    return response.data;
  },

  // User Management
  getUsers: async (params: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  createSeller: async (sellerData: FormData) => {
    const response = await api.post('/admin/users/create-seller', sellerData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAllUsers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/admin/users', { params: { ...params, role: 'all' } });
    return response.data;
  },

  getSellers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/admin/users', { params: { ...params, role: 'seller' } });
    return response.data;
  },

  getAdmins: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/admin/users', { params: { ...params, role: 'admin' } });
    return response.data;
  },

  getCustomers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/admin/users', { params: { ...params, role: 'user' } });
    return response.data;
  },

  getUser: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, data: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    role?: string;
    status?: string;
    profileImage?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    businessInfo?: any;
    address?: any;
  }) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
  },

  updateUserProfileImage: async (userId: string, profileImage: File) => {
    const formData = new FormData();
    formData.append('profileImage', profileImage);
    
    const response = await api.put(`/admin/users/${userId}/profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    const response = await api.put(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  suspendUser: async (userId: string, reason?: string, duration?: number) => {
    const response = await api.put(`/admin/users/${userId}/suspend`, { reason, duration });
    return response.data;
  },

  unsuspendUser: async (userId: string) => {
    const response = await api.put(`/admin/users/${userId}/unsuspend`);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // User Statistics
  getUserStats: async () => {
    const response = await api.get('/admin/users/stats');
    // The backend returns { error: false, stats: statsData }
    // We need to extract the stats and transform them to match the frontend interface
    const stats = response.data.stats;
    
    // Transform the backend stats to match the frontend UserStats interface
    return {
      totalUsers: stats.total_users || 0,
      activeUsers: stats.active_users || 0,
      inactiveUsers: stats.inactive_users || 0,
      pendingUsers: stats.pending_users || 0,
      suspendedUsers: 0, // Not provided by backend, default to 0
      totalSellers: stats.total_sellers || 0,
      totalCustomers: 0, // Not provided by backend, default to 0
      totalAdmins: stats.total_admins || 0,
      newUsersToday: 0, // Not provided by backend, default to 0
      newUsersThisWeek: 0, // Not provided by backend, default to 0
      newUsersThisMonth: 0, // Not provided by backend, default to 0
    };
  },

  getUserAnalytics: async (period = '30') => {
    const response = await api.get('/admin/users/analytics', { params: { period } });
    return response.data;
  },

  // Bulk Operations
  bulkUpdateUsers: async (userIds: string[], updates: {
    status?: string;
    role?: string;
    isActive?: boolean;
  }) => {
    const response = await api.put('/admin/users/bulk', { userIds, updates });
    return response.data;
  },

  bulkDeleteUsers: async (userIds: string[]) => {
    const response = await api.delete('/admin/users/bulk', { data: { userIds } });
    return response.data;
  },

  // Export
  exportUsers: async (params: {
    role?: string;
    status?: string;
    format?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const response = await api.get('/admin/users/export', { params });
    return response.data;
  },

  // System Analytics
  getAnalytics: async (period = '30') => {
    const response = await api.get('/admin/analytics', { params: { period } });
    return response.data;
  },

  // Announcements
  sendAnnouncement: async (data: {
    title: string;
    message: string;
    priority?: string;
    targetRole?: string;
    expiresAt?: string;
  }) => {
    const response = await api.post('/admin/announcements', data);
    return response.data;
  },

  // Impersonation
  impersonateUser: async (userId: string) => {
    const response = await api.post(`/admin/impersonate/${userId}`);
    return response.data;
  },

  // Seller Metrics Management
  updateSellerMetrics: async (sellerId: string, metrics: {
    creditScore?: number;
    followers?: number;
    rating?: number;
  }) => {
    const response = await api.put(`/admin/seller/${sellerId}/metrics`, metrics);
    return response.data;
  },

  // Admin Overrides Management
  getSellerOverrides: async (sellerId: string) => {
    const response = await api.get(`/admin/seller/${sellerId}/overrides`);
    return response.data;
  },

  saveSellerOverride: async (sellerId: string, metricName: string, overrideValue: number, originalValue?: number) => {
    const response = await api.post(`/admin/seller/${sellerId}/overrides`, {
      metricName,
      overrideValue,
      originalValue
    });
    return response.data;
  },

  resetSellerOverride: async (sellerId: string, metricName: string) => {
    const response = await api.delete(`/admin/seller/${sellerId}/overrides/${metricName}`);
    return response.data;
  },

  clearSellerOverride: async (sellerId: string, metricName: string) => {
    const response = await api.put(`/admin/seller/${sellerId}/overrides/${metricName}/clear`);
    return response.data;
  },

  // Get seller dashboard data by seller ID (for admin impersonation)
  getSellerDashboard: async (sellerId: string) => {
    const response = await api.get(`/seller/dashboard/${sellerId}`);
    return response.data;
  },

  // Activate current user account (for development/testing)
  activateCurrentUser: async () => {
    const response = await api.post('/admin/activate-current-user');
    return response.data;
  },

  // Orders Management
  getOrders: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/admin/orders', { params });
    return response.data;
  },

  updateOrderStatus: async (orderId: string, status: string, note?: string) => {
    const response = await api.put(`/admin/orders/${orderId}/status`, { status, note });
    return response.data;
  },

  getOrderDetails: async (orderId: string) => {
    const response = await api.get(`/admin/orders/${orderId}`);
    return response.data;
  },

  // Products Management
  getProducts: async (params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: string;
    sellerId?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/admin/products', { params });
    return response.data;
  },

  createProduct: async (formData: FormData) => {
    const response = await api.post('/admin/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateProduct: async (id: string, formData: FormData) => {
    const response = await api.put(`/admin/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateProductStatus: async (productId: string, isActive: boolean) => {
    const response = await api.put(`/admin/products/${productId}/status`, { isActive });
    return response.data;
  },

  deleteProduct: async (productId: string) => {
    const response = await api.delete(`/admin/products/${productId}`);
    return response.data;
  },

  getCategories: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    parentId?: string;
  } = {}) => {
    const response = await api.get('/categories', { params });
    return response.data;
  },

  createCategory: async (formData: FormData) => {
    const response = await api.post('/categories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateCategory: async (categoryId: string, formData: FormData) => {
    const response = await api.put(`/categories/${categoryId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateCategoryStatus: async (categoryId: string, isActive: boolean) => {
    const response = await api.put(`/categories/${categoryId}`, { isActive });
    return response.data;
  },

  deleteCategory: async (categoryId: string) => {
    const response = await api.delete(`/categories/${categoryId}`);
    return response.data;
  },

  // Financial Reports
  getFinancialReports: async (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    sellerId?: string;
  } = {}) => {
    const response = await api.get('/admin/finance/reports', { params });
    return response.data;
  },

  // Shops Management
  getShops: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    businessType?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const response = await api.get('/admin/shops', { params });
    return response.data;
  },

  getShop: async (shopId: string) => {
    const response = await api.get(`/admin/shops/${shopId}`);
    return response.data;
  },

  updateShopStatus: async (shopId: string, status: string) => {
    const response = await api.put(`/admin/shops/${shopId}/status`, { status });
    return response.data;
  },

  updateShop: async (shopId: string, shopData: any) => {
    // If shopData is FormData, don't set Content-Type header (let browser set it with boundary)
    const config = shopData instanceof FormData ? {} : {};
    const response = await api.put(`/admin/shops/${shopId}`, shopData, config);
    return response.data;
  },

  // System Settings
  getSystemSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSystemSettings: async (settings: any) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },
};

// Search API
export const searchApi = {
  getProducts: async (query: string, filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  } = {}) => {
    const response = await api.get('/catalog', {
      params: { search: query, ...filters }
    });
    return response.data;
  },

  getSuggestions: async (query: string) => {
    const response = await api.get('/catalog/search/suggestions', {
      params: { q: query }
    });
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/catalog/meta/categories');
    return response.data;
  },
};

// Enhanced Orders API
export const ordersApiEnhanced = {
  ...ordersApi,
  
  getOrderAnalytics: async (days = 7) => {
    const response = await api.get('/orders/analytics', { params: { days } });
    return response.data;
  },

  bulkUpdateStatus: async (orderIds: string[], status: string, note?: string) => {
    const response = await api.put('/orders/bulk-status', {
      orderIds,
      status,
      note
    });
    return response.data;
  },

  exportOrders: async (params: {
    startDate?: string;
    endDate?: string;
    status?: string;
    format?: string;
  } = {}) => {
    const response = await api.get('/orders/export', { params });
    return response.data;
  },
};

// Enhanced Products API
export const productsApiEnhanced = {
  ...productsApi,

  getMyProducts: async (params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: string;
  } = {}) => {
    const response = await api.get('/products/my-products', { params });
    return response.data;
  },

  bulkUpdateStatus: async (productIds: string[], isActive: boolean) => {
    const response = await api.put('/products/bulk-status', {
      productIds,
      isActive
    });
    return response.data;
  },

  getProductAnalytics: async (productId: string, days = 30) => {
    const response = await api.get(`/products/${productId}/analytics`, {
      params: { days }
    });
    return response.data;
  },
};

// Shopping Cart API for client-side cart management
export const cartApi = {
  addItem: (productId: string, quantity: number, sellerId: string) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}');
    
    // Group items by seller
    if (!cart[sellerId]) {
      cart[sellerId] = { items: [], seller: sellerId };
    }
    
    const existingItem = cart[sellerId].items.find((item: any) => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart[sellerId].items.push({ productId, quantity });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },

  removeItem: (productId: string, sellerId: string) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}');
    if (cart[sellerId]) {
      cart[sellerId].items = cart[sellerId].items.filter((item: any) => item.productId !== productId);
      if (cart[sellerId].items.length === 0) {
        delete cart[sellerId];
      }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },

  updateQuantity: (productId: string, quantity: number, sellerId: string) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}');
    if (cart[sellerId]) {
      const item = cart[sellerId].items.find((item: any) => item.productId === productId);
      if (item) {
        item.quantity = quantity;
        if (quantity <= 0) {
          cart[sellerId].items = cart[sellerId].items.filter((item: any) => item.productId !== productId);
          if (cart[sellerId].items.length === 0) {
            delete cart[sellerId];
          }
        }
      }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },

  getCart: () => {
    return JSON.parse(localStorage.getItem('cart') || '{}');
  },

  clearCart: (sellerId?: string) => {
    if (sellerId) {
      const cart = JSON.parse(localStorage.getItem('cart') || '{}');
      delete cart[sellerId];
      localStorage.setItem('cart', JSON.stringify(cart));
      return cart;
    } else {
      localStorage.removeItem('cart');
      return {};
    }
  },

  getCartItemCount: (sellerId?: string) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}');
    if (sellerId) {
      return cart[sellerId]?.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;
    }
    return Object.values(cart).reduce((total: number, seller: any) => 
      total + seller.items.reduce((sellerTotal: number, item: any) => sellerTotal + item.quantity, 0), 0
    );
  }
};

// Real-time API for Socket connections
export const realtimeApi = {
  subscribeToNotifications: (callback: (notification: any) => void) => {
    // This would integrate with the socket service
    import('./socketService').then(({ default: socketService }) => {
      socketService.onNotification(callback);
    });
  },

  subscribeToOrderUpdates: (callback: (order: any) => void) => {
    import('./socketService').then(({ default: socketService }) => {
      socketService.onOrderUpdate(callback);
    });
  },


};

export default api;