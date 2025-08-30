// Mock API service for development and testing
// This provides fake data that sellers see in their dashboard

interface MockAnalytics {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  monthlyGrowth: number;
}

interface MockFinancialData {
  totalFinancing: number;
  yesterdayEarnings: number;
  accumulatedEarnings: number;
  pendingAmount: number;
  balance: {
    current: number;
    pending: number;
    total: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
}

interface MockOrder {
  _id: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    email: string;
  };
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface MockProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: Array<{ url: string; alt: string }>;
  status: 'active' | 'inactive';
}

// Generate realistic fake data based on admin-edited analytics
const generateMockData = (adminAnalytics?: MockAnalytics) => {
  const baseAnalytics = adminAnalytics || {
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    customerSatisfaction: 0,
    monthlyGrowth: 0
  };

  // Generate realistic financial data based on analytics
  const financialData: MockFinancialData = {
    totalFinancing: baseAnalytics.totalSales * 0.8, // 80% of total sales
    yesterdayEarnings: baseAnalytics.totalSales * 0.03, // 3% of total sales
    accumulatedEarnings: baseAnalytics.totalSales * 0.15, // 15% profit margin
    pendingAmount: baseAnalytics.totalSales * 0.05, // 5% pending
    balance: {
      current: baseAnalytics.totalSales * 0.1, // 10% current balance
      pending: baseAnalytics.totalSales * 0.05, // 5% pending
      total: baseAnalytics.totalSales * 0.15 // 15% total balance
    },
    revenue: {
      thisMonth: baseAnalytics.totalSales * 0.4, // 40% of total sales this month
      lastMonth: baseAnalytics.totalSales * 0.35, // 35% last month
      growth: baseAnalytics.monthlyGrowth || 15 // Use admin-edited growth or default 15%
    }
  };

  // Generate realistic orders based on analytics
  const generateOrders = (): MockOrder[] => {
    const orders: MockOrder[] = [];
    const orderCount = Math.min(baseAnalytics.totalOrders, 50); // Cap at 50 for display
    
    for (let i = 0; i < orderCount; i++) {
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 90)); // Random date within 90 days
      
      const orderValue = baseAnalytics.averageOrderValue * (0.5 + Math.random()); // Vary around average
      
      orders.push({
        _id: `order_${i + 1}`,
        orderNumber: `ORD${String(i + 1).padStart(6, '0')}`,
        customerInfo: {
          name: `Customer ${i + 1}`,
          email: `customer${i + 1}@example.com`
        },
        total: Math.round(orderValue * 100) / 100,
        status: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'][Math.floor(Math.random() * 5)] as any,
        orderDate: orderDate.toISOString(),
        items: [{
          productId: `product_${i + 1}`,
          name: `Product ${i + 1}`,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: Math.round(orderValue * 100) / 100
        }]
      });
    }
    
    return orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  };

  // Generate realistic products based on analytics
  const generateProducts = (): MockProduct[] => {
    const products: MockProduct[] = [];
    const productCount = Math.min(baseAnalytics.totalProducts, 20); // Cap at 20 for display
    
    for (let i = 0; i < productCount; i++) {
      const price = 10 + Math.random() * 200; // Random price between $10-$210
      
      products.push({
        _id: `product_${i + 1}`,
        name: `Product ${i + 1}`,
        description: `This is a description for product ${i + 1}`,
        price: Math.round(price * 100) / 100,
        stock: Math.floor(Math.random() * 100) + 1,
        category: ['Electronics', 'Clothing', 'Home', 'Books', 'Sports'][Math.floor(Math.random() * 5)],
        images: [{
          url: `https://via.placeholder.com/300x300?text=Product+${i + 1}`,
          alt: `Product ${i + 1}`
        }],
        status: Math.random() > 0.1 ? 'active' : 'inactive' // 90% active
      });
    }
    
    return products;
  };

  return {
    analytics: baseAnalytics,
    financial: financialData,
    orders: generateOrders(),
    products: generateProducts()
  };
};

// Mock API endpoints
export const mockApi = {
  // Get seller analytics (with admin-edited data if available)
  async getSellerAnalytics(period: string = '30'): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to get admin-edited analytics from localStorage
    let adminAnalytics = null;
    try {
      const stored = localStorage.getItem('adminEditedAnalytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.adminEdited && parsed.stats) {
          adminAnalytics = parsed.stats;
          console.log('📊 Mock API: Found admin-edited analytics:', adminAnalytics);
        }
      }
    } catch (e) {
      console.warn('Mock API: Failed to parse stored analytics:', e);
    }
    
    const mockData = generateMockData(adminAnalytics);
    
    // Always mark as admin-edited if we have admin analytics
    const isAdminEdited = !!adminAnalytics;
    
    console.log('📊 Mock API: Returning analytics:', {
      adminEdited: isAdminEdited,
      stats: mockData.analytics,
      source: isAdminEdited ? 'admin-edited' : 'generated'
    });
    
    return {
      error: false,
      analytics: {
        period,
        days: parseInt(period),
        stats: mockData.analytics,
        adminEdited: isAdminEdited,
        source: isAdminEdited ? 'admin-edited' : 'generated'
      }
    };
  },

  // Get seller financial data
  async getSellerFinancial(): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let adminAnalytics = null;
    try {
      const stored = localStorage.getItem('adminEditedAnalytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.adminEdited && parsed.stats) {
          adminAnalytics = parsed.stats;
        }
      }
    } catch (e) {
      console.warn('Mock API: Failed to parse stored analytics:', e);
    }
    
    const mockData = generateMockData(adminAnalytics);
    
    return {
      error: false,
      financial: mockData.financial
    };
  },

  // Get seller orders
  async getSellerOrders(limit: number = 20): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let adminAnalytics = null;
    try {
      const stored = localStorage.getItem('adminEditedAnalytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.adminEdited && parsed.stats) {
          adminAnalytics = parsed.stats;
        }
      }
    } catch (e) {
      console.warn('Mock API: Failed to parse stored analytics:', e);
    }
    
    const mockData = generateMockData(adminAnalytics);
    const limitedOrders = mockData.orders.slice(0, limit);
    
    return {
      error: false,
      orders: limitedOrders,
      total: mockData.orders.length
    };
  },

  // Get seller products
  async getSellerProducts(limit: number = 20): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 350));
    
    let adminAnalytics = null;
    try {
      const stored = localStorage.getItem('adminEditedAnalytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.adminEdited && parsed.stats) {
          adminAnalytics = parsed.stats;
        }
      }
    } catch (e) {
      console.warn('Mock API: Failed to parse stored analytics:', e);
    }
    
    const mockData = generateMockData(adminAnalytics);
    const limitedProducts = mockData.products.slice(0, limit);
    
    return {
      error: false,
      products: limitedProducts,
      total: mockData.products.length
    };
  },

  // Get comprehensive seller dashboard data
  async getSellerDashboard(): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    let adminAnalytics = null;
    try {
      const stored = localStorage.getItem('adminEditedAnalytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.adminEdited && parsed.stats) {
          adminAnalytics = parsed.stats;
          console.log('📊 Mock API: Using admin-edited analytics for dashboard:', adminAnalytics);
        }
      }
    } catch (e) {
      console.warn('Mock API: Failed to parse stored analytics:', e);
    }
    
    const mockData = generateMockData(adminAnalytics);
    
    // Calculate today's data
    const today = new Date();
    const todayOrders = mockData.orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate.toDateString() === today.toDateString();
    });
    
    const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
    
    const dashboardData = {
      error: false,
      dashboard: {
        analytics: mockData.analytics,
        financial: mockData.financial,
        today: {
          orders: todayOrders.length,
          sales: todaySales,
          visitors: Math.floor(todayOrders.length * 8), // Estimate based on conversion rate
          profitForecast: todaySales * 0.2 // 20% margin estimate
        },
        recent: {
          orders: mockData.orders.slice(0, 5),
          products: mockData.products.slice(0, 5)
        }
      }
    };
    
    console.log('📊 Mock API: Returning dashboard data:', dashboardData);
    
    return dashboardData;
  }
};

export default mockApi;
