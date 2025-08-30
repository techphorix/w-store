import api from '../services/api';
import CookieManager from './cookieManager';

export class AuthDebugger {
  /**
   * Test authentication by calling the debug endpoint
   */
  static async testAuth() {
    try {
      console.log('🔍 Testing authentication...');
      
      const token = CookieManager.getAuthToken();
      console.log('🍪 Current token:', {
        exists: !!token,
        length: token?.length || 0,
        preview: token ? token.substring(0, 10) + '...' : 'null'
      });
      
      const response = await api.get('/analytics/debug/auth');
      console.log('✅ Auth test successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Auth test failed:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      return null;
    }
  }
  
  /**
   * Test seller analytics endpoints
   */
  static async testSellerAnalytics() {
    try {
      console.log('🔍 Testing seller analytics endpoints...');
      
      // Test dashboard endpoint
      const dashboardResponse = await api.get('/analytics/seller/dashboard');
      console.log('✅ Dashboard endpoint successful:', dashboardResponse.data);
      
      // Test period endpoint
      const periodResponse = await api.get('/analytics/seller?period=30');
      console.log('✅ Period endpoint successful:', periodResponse.data);
      
      return {
        dashboard: dashboardResponse.data,
        period: periodResponse.data
      };
    } catch (error: any) {
      console.error('❌ Seller analytics test failed:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      return null;
    }
  }
  
  /**
   * Get current authentication state
   */
  static getAuthState() {
    const token = CookieManager.getAuthToken();
    const user = CookieManager.getUserData();
    
    return {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'null',
      hasUser: !!user,
      userRole: user?.role,
      userEmail: user?.email,
      isAuthenticated: CookieManager.isAuthenticated()
    };
  }
  
  /**
   * Clear all authentication data (for testing)
   */
  static clearAuth() {
    console.log('🧹 Clearing all authentication data...');
    CookieManager.forceCleanup();
  }
}

// Make it available globally for debugging in development
if (import.meta.env.DEV) {
  (window as any).AuthDebugger = AuthDebugger;
}

export default AuthDebugger;
