import api from './api';

const API_BASE_URL = '/admin/sellers';

export interface SellerAnalytics {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  monthlyGrowth: number;
}

export interface SellerFinancial {
  balance: number;
  pendingPayouts: number;
  totalEarnings: number;
  monthlyRevenue: number;
  profitMargin: number;
  refundRate: number;
}

export interface SellerPerformance {
  rating: number;
  responseTime: number;
  fulfillmentRate: number;
  returnRate: number;
  customerReviews: number;
}

export interface SellerData {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  businessInfo?: {
    storeName: string;
    storeDescription?: string;
    businessType: string;
    logo?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
  };
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  analytics: SellerAnalytics;
  financial: SellerFinancial;
  performance: SellerPerformance;
}

export const sellerManagementApi = {
  // Get all sellers with analytics
  getAllSellers: async (): Promise<SellerData[]> => {
    try {
      const response = await api.get(API_BASE_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching sellers:', error);
      throw error;
    }
  },

  // Get specific seller by ID
  getSellerById: async (sellerId: string): Promise<SellerData> => {
    try {
      const response = await api.get(`${API_BASE_URL}/${sellerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching seller:', error);
      throw error;
    }
  },

  // Update seller analytics (generic payload)
  updateSellerAnalytics: async (sellerId: string, payload: any): Promise<void> => {
    try {
      await api.put(`${API_BASE_URL}/${sellerId}/analytics`, payload);
    } catch (error) {
      console.error('Error updating seller analytics:', error);
      throw error;
    }
  },

  // Update period-based analytics (today, last7Days, last30Days, total)
  updateSellerPeriodAnalytics: async (
    sellerId: string,
    period: 'today' | 'last7Days' | 'last30Days' | 'total',
    metrics: Partial<SellerAnalytics> & Record<string, number>
  ): Promise<void> => {
    try {
      console.log('🚀 API Request:', {
        url: `${API_BASE_URL}/${sellerId}/analytics`,
        method: 'PUT',
        data: { period, metrics },
        sellerId,
        period
      });
      
      const response = await api.put(`${API_BASE_URL}/${sellerId}/analytics`, {
        period,
        metrics
      });
      
      console.log('✅ API Response:', response.data);
    } catch (error) {
      console.error('❌ API Error:', error);
      console.error('📊 Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      throw error;
    }
  },

  // Update seller financial data
  updateSellerFinancial: async (sellerId: string, financial: Partial<SellerFinancial>): Promise<void> => {
    try {
      await api.put(`${API_BASE_URL}/${sellerId}/financial`, financial);
    } catch (error) {
      console.error('Error updating seller financial:', error);
      throw error;
    }
  },

  // Update seller performance metrics
  updateSellerPerformance: async (sellerId: string, performance: Partial<SellerPerformance>): Promise<void> => {
    try {
      await api.put(`${API_BASE_URL}/${sellerId}/performance`, performance);
    } catch (error) {
      console.error('Error updating seller performance:', error);
      throw error;
    }
  },

  // Bulk update seller status
  bulkUpdateSellerStatus: async (sellerIds: string[], updates: { isActive?: boolean; isVerified?: boolean }): Promise<void> => {
    try {
      await api.put(`${API_BASE_URL}/bulk-status`, {
        sellerIds,
        updates
      });
    } catch (error) {
      console.error('Error bulk updating seller status:', error);
      throw error;
    }
  },

  // Delete seller
  deleteSeller: async (sellerId: string): Promise<void> => {
    try {
      await api.delete(`${API_BASE_URL}/${sellerId}`);
    } catch (error) {
      console.error('Error deleting seller:', error);
      throw error;
    }
  },

  // Get seller statistics
  getSellerStats: async (): Promise<{
    totalSellers: number;
    activeSellers: number;
    verifiedSellers: number;
    totalSales: number;
    averageRating: number;
  }> => {
    try {
      const response = await api.get(`${API_BASE_URL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching seller stats:', error);
      throw error;
    }
  },

  // Export sellers data
  exportSellersData: async (filters?: any): Promise<Blob> => {
    try {
      const response = await api.get(`${API_BASE_URL}/export`, {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting sellers data:', error);
      throw error;
    }
  }
};

export default sellerManagementApi;
