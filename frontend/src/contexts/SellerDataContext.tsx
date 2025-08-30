import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { ordersApi } from '../services/api';
import { financeApi } from '../services/api';
import { distributionsApi } from '../services/api';
import api from '../services/api';
import { mockApi } from '../services/mockApi';
import { adminApi } from '../services/api';
import { debounce } from '../utils/debounce';

interface SellerStats {
  // Core metrics that can be overridden by admin
  ordersSold: number;
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  profitForecast: number;
  visitors: number;
  shopFollowers: number;
  shopRating: number;
  creditScore: number;
  
  // Timeframe-specific fields
  todaySales: number;
  todayOrders: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  growthPercentage: number;
  totalProducts: number;
  totalCustomers: number;
  last7DaysOrders: number;
  last7DaysSales: number;
  last30DaysOrders: number;
  last30DaysSales: number;
}

interface FinancialData {
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

interface SellerDataContextType {
  stats: SellerStats;
  financialData: FinancialData;
  recentOrders: any[];
  isLoading: boolean;
  error: string | null;
  overrideError: string | null;
  adminEditedAnalytics: any;
  refreshData: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  updateStatsFromOrder: (order: any) => void;
  restoreFromLocalStorage: () => boolean;
  clearLocalStorageAfterSave: () => void;
  clearOverrideError: () => void;
  refreshOverrides: () => Promise<void>;
}

const SellerDataContext = createContext<SellerDataContextType | undefined>(undefined);

export const useSellerData = () => {
  const context = useContext(SellerDataContext);
  if (!context) {
    throw new Error('useSellerData must be used within a SellerDataProvider');
  }
  return context;
};

interface SellerDataProviderProps {
  children: ReactNode;
}

export const SellerDataProvider: React.FC<SellerDataProviderProps> = ({ children }) => {
  const { isAuthenticated, user, isImpersonating, originalUser } = useAuth();
  
  const [stats, setStats] = useState<SellerStats>({
    // Core metrics that can be overridden by admin
    ordersSold: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalOrders: 0,
    profitForecast: 0,
    visitors: 0,
    shopFollowers: 0,
    shopRating: 4.8,
    creditScore: 785,
    
    // Timeframe-specific fields
    todaySales: 0,
    todayOrders: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    growthPercentage: 0,
    totalProducts: 0,
    totalCustomers: 0,
    last7DaysOrders: 0,
    last7DaysSales: 0,
    last30DaysOrders: 0,
    last30DaysSales: 0
  });

  const [financialData, setFinancialData] = useState<FinancialData>({
    totalFinancing: 0,
    yesterdayEarnings: 0,
    accumulatedEarnings: 0,
    pendingAmount: 0,
    balance: { current: 0, pending: 0, total: 0 },
    revenue: {
      thisMonth: 0,
      lastMonth: 0,
      growth: 0
    }
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [adminEditedAnalytics, setAdminEditedAnalytics] = useState<any>(() => {
    // Try to restore admin-edited analytics from localStorage on mount
    try {
      const stored = localStorage.getItem('adminEditedAnalytics');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('Failed to restore admin-edited analytics from localStorage:', e);
      return null;
    }
  });
  const refreshingOverrides = useRef(false);

  // Centralized data fetching function - always use API, no localStorage/mockApi
  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Always fetch from the API - no more localStorage/mockApi fallbacks
      console.log('📊 Fetching seller data from API...');
      
      const dashboardResponse = await api.get('/analytics/seller/dashboard');
      console.log('📊 Dashboard API response:', dashboardResponse.data);
      console.log('📊 Data structure check:', {
        hasOverall: !!dashboardResponse.data.overall,
        hasTotal: !!dashboardResponse.data.total,
        overallKeys: dashboardResponse.data.overall ? Object.keys(dashboardResponse.data.overall) : [],
        totalKeys: dashboardResponse.data.total ? Object.keys(dashboardResponse.data.total) : [],
        todayKeys: dashboardResponse.data.today ? Object.keys(dashboardResponse.data.today) : [],
        '7daysKeys': dashboardResponse.data['7days'] ? Object.keys(dashboardResponse.data['7days']) : [],
        '30daysKeys': dashboardResponse.data['30days'] ? Object.keys(dashboardResponse.data['30days']) : []
      });
        
      if (dashboardResponse.data.error === false) {
        const data = dashboardResponse.data;
        
        // Check for admin overrides
        const hasOverrides = data.hasAdminOverrides || false;
        const overrides = data.adminOverrides || {};
        
        // Always fetch admin overrides for the current user (not just when impersonating)
        let adminOverrides = [];
        try {
          console.log('🔍 Fetching admin overrides for user:', user._id);
          setOverrideError(null); // Clear any previous errors
          const overridesResponse = await adminApi.getSellerOverrides(user._id);
          if (overridesResponse.error === false) {
            adminOverrides = overridesResponse.overrides || [];
            console.log('✅ Admin overrides fetched:', adminOverrides);
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch admin overrides:', error);
          setOverrideError(`Failed to fetch overrides: ${error.message || 'Unknown error'}`);
          
          // Try to restore from localStorage as fallback
          try {
            const stored = localStorage.getItem('adminEditedAnalytics');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.adminEdited) {
                console.log('🔄 Falling back to localStorage overrides after API failure');
                // Convert stored stats to override format for consistency
                const storedStats = parsed.stats || {};
                adminOverrides = Object.entries(storedStats).map(([key, value]) => ({
                  metric_name: key,
                  override_value: value,
                  original_value: 0
                }));
              }
            }
          } catch (localStorageError) {
            console.warn('⚠️ localStorage fallback also failed:', localStorageError);
          }
          
          // If all else fails, use system values
          if (adminOverrides.length === 0) {
            console.log('ℹ️ Using system values as final fallback');
          }
        }
        
        // Create base stats from API response
        const baseStats = {
          // Core metrics that can be overridden by admin
          ordersSold: data.total?.orders || data.overall?.totalOrders || 0,
          totalSales: data.total?.sales || data.overall?.totalSales || 0,
          totalRevenue: data.total?.revenue || data.overall?.totalSales || 0,
          totalOrders: data.total?.orders || data.overall?.totalOrders || 0,
          profitForecast: data.total?.profitForecast || data.overall?.profitForecast || 0,
          visitors: data.total?.visitors || 0,
          shopFollowers: data.total?.followers || 100,
          shopRating: data.total?.rating || 4.5,
          creditScore: data.total?.creditScore || 750,
          
          // Timeframe-specific fields
          todaySales: data.today?.sales || 0,
          todayOrders: data.today?.orders || 0,
          thisMonthRevenue: data['30days']?.sales || 0,
          lastMonthRevenue: 0, // Would need separate calculation
          growthPercentage: 0, // Would need separate calculation
          totalProducts: data.overall?.totalProducts || 0,
          totalCustomers: data.total?.customers || 0,
          last7DaysOrders: data['7days']?.orders || 0,
          last7DaysSales: data['7days']?.sales || 0,
          last30DaysOrders: data['30days']?.orders || 0,
          last30DaysSales: data['30days']?.sales || 0
        };

        // Apply admin overrides to stats
        const applyOverrides = (stats: any, overrides: any[]) => {
          const overriddenStats = { ...stats };
          
          console.log('🔍 Applying overrides:', {
            baseStats: stats,
            overrides: overrides,
            overridesType: Array.isArray(overrides) ? 'array' : typeof overrides,
            overridesLength: Array.isArray(overrides) ? overrides.length : 'N/A'
          });
          
          // Debug: Log each override attempt
          console.log('🔍 Debug: Available stats keys:', Object.keys(stats));
          
          // Map metric names from backend to frontend
          const metricMapping = {
            'orders_sold': 'ordersSold',
            'total_sales': 'totalSales',
            'profit_forecast': 'profitForecast',
            'visitors': 'visitors',
            'shop_followers': 'shopFollowers',
            'shop_rating': 'shopRating',
            'credit_score': 'creditScore'
          };
          
          if (Array.isArray(overrides)) {
            overrides.forEach(override => {
              const backendMetricName = override.metric_name;
              const frontendMetricName = metricMapping[backendMetricName];
              const overrideValue = parseFloat(override.override_value);
              
              if (frontendMetricName && !isNaN(overrideValue)) {
                const currentValue = overriddenStats[frontendMetricName] || 0;
                console.log(`🔄 Applying override: ${backendMetricName} -> ${frontendMetricName} = ${overrideValue} (was: ${currentValue})`);
                overriddenStats[frontendMetricName] = overrideValue;
              } else {
                console.log(`⚠️ Skipping override: ${backendMetricName} -> ${frontendMetricName}`);
                console.log(`  - frontendMetricName exists: ${!!frontendMetricName}`);
                console.log(`  - frontendMetricName in overriddenStats: ${frontendMetricName in overriddenStats}`);
                console.log(`  - !isNaN(overrideValue): ${!isNaN(overrideValue)}`);
                console.log(`  - overrideValue: ${overrideValue}`);
                console.log(`  - available keys: ${Object.keys(overriddenStats).join(', ')}`);
              }
            });
          } else {
            console.warn('⚠️ Overrides is not an array:', overrides);
          }
          
          return overriddenStats;
        };

        // Apply overrides and set stats
        const finalStats = applyOverrides(baseStats, adminOverrides);
        setStats(finalStats);
        
        // Create base financial data from API response
        const baseFinancialData = {
          totalFinancing: 0,
          yesterdayEarnings: data.today?.sales || 0,
          accumulatedEarnings: data.overall.totalSales || 0,
          pendingAmount: 0,
          balance: { current: 0, pending: 0, total: 0 },
          revenue: { 
            thisMonth: data['30days']?.sales || 0, 
            lastMonth: 0, 
            growth: 0 
          }
        };

        // Apply overrides to financial data (but only for financial-specific metrics)
        const financialOverrides = adminOverrides.filter(override => 
          ['total_sales', 'profit_forecast'].includes(override.metric_name)
        );
        
        const finalFinancialData = applyOverrides(baseFinancialData, financialOverrides);
        setFinancialData(finalFinancialData);
        
        console.log('📊 Final stats after applying overrides:', {
          baseStats,
          adminOverrides,
          finalStats,
          hasOverrides: adminOverrides.length > 0
        });
        
        console.log('🔍 Override summary:', {
          totalOverrides: adminOverrides.length,
          statsOverrides: adminOverrides.filter(o => ['orders_sold', 'total_sales', 'profit_forecast', 'visitors', 'shop_followers', 'shop_rating', 'credit_score'].includes(o.metric_name)).length,
          financialOverrides: financialOverrides.length
        });
        
        console.log('💰 Final financial data after applying overrides:', finalFinancialData);
        
        // Ensure overrides are properly applied by calling refreshOverrides
        if (adminOverrides.length > 0) {
          console.log('🔄 Additional override refresh to ensure consistency...');
          // Use a longer delay to avoid race conditions
          setTimeout(() => {
            refreshOverrides();
          }, 500);
        }
        
        // Set admin edited flag based on overrides
        if (adminOverrides.length > 0) {
          setAdminEditedAnalytics({
            adminEdited: true,
            stats: finalStats,
            overrides: adminOverrides,
            source: 'admin-overrides',
            timestamp: new Date().toISOString()
          });
          console.log('✅ Admin overrides applied, setting adminEditedAnalytics');
        } else {
          setAdminEditedAnalytics(null);
          console.log('ℹ️ No admin overrides found');
        }
        
        console.log('✅ Successfully loaded data from API:', {
          hasFakeData: data.hasFakeData,
          timeframes: Object.keys(data).filter(key => ['today', '7days', '30days', 'total'].includes(key))
        });
      } else {
        throw new Error('Invalid dashboard response format');
      }
    } catch (error) {
      console.error('Error fetching seller data:', error);
      setError(error.message || 'Failed to fetch data');
      
      // Set default values on error
      setStats({
        // Core metrics that can be overridden by admin
        ordersSold: 0,
        totalSales: 0,
        totalRevenue: 0,
        totalOrders: 0,
        profitForecast: 0,
        visitors: 0,
        shopFollowers: 0,
        shopRating: 4.5,
        creditScore: 750,
        
        // Timeframe-specific fields
        todaySales: 0,
        todayOrders: 0,
        thisMonthRevenue: 0,
        lastMonthRevenue: 0,
        growthPercentage: 0,
        totalProducts: 0,
        totalCustomers: 0,
        last7DaysOrders: 0,
        last7DaysSales: 0,
        last30DaysOrders: 0,
        last30DaysSales: 0
      });
      
      setFinancialData({
        totalFinancing: 0,
        yesterdayEarnings: 0,
        accumulatedEarnings: 0,
        pendingAmount: 0,
        balance: { current: 0, pending: 0, total: 0 },
        revenue: { thisMonth: 0, lastMonth: 0, growth: 0 }
      });
      
      setAdminEditedAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, isImpersonating, originalUser]);

  // Function to refresh analytics specifically
  const refreshAnalytics = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      console.log('🔄 Fetching analytics for seller:', user._id);
      
      // Try multiple sources for analytics
      let analyticsData = null;
      let isAdminEdited = false;
      
      // 1. Try localStorage first
      try {
        const stored = localStorage.getItem('adminEditedAnalytics');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.adminEdited) {
            analyticsData = parsed;
            isAdminEdited = true;
            console.log('📊 Found admin-edited analytics in localStorage');
          }
        }
      } catch (e) {
        console.warn('Failed to parse localStorage analytics:', e);
      }
      
      // 2. Try mock API if no localStorage data
      if (!analyticsData) {
        try {
          const mockResponse = await mockApi.getSellerAnalytics('30');
          if (mockResponse.analytics.adminEdited) {
            analyticsData = mockResponse;
            isAdminEdited = true;
            console.log('📊 Found admin-edited analytics in mock API');
          }
        } catch (e) {
          console.warn('Failed to get mock API analytics:', e);
        }
      }
      
      // 3. Try real API as fallback
      if (!analyticsData) {
        try {
          const analyticsResponse = await api.get('/analytics/seller?period=30');
          analyticsData = analyticsResponse.data;
          isAdminEdited = analyticsResponse.data.analytics?.adminEdited || false;
          console.log('📊 Got analytics from real API');
        } catch (e) {
          console.warn('Failed to get real API analytics:', e);
        }
      }
      
      if (analyticsData && analyticsData.analytics && analyticsData.analytics.stats) {
        const stats = analyticsData.analytics.stats;
        console.log('✅ Updating stats with analytics data:', stats);
        console.log('🔍 Analytics source:', isAdminEdited ? 'admin-edited' : 'calculated');
        
        // Force update stats immediately with admin-edited values
        setStats(prev => {
          const newStats = {
            ...prev,
            // Core metrics that can be overridden by admin
            ordersSold: stats.ordersSold || stats.totalOrders || prev.ordersSold,
            totalSales: stats.totalSales || prev.totalSales,
            totalRevenue: stats.totalSales || prev.totalRevenue, // totalSales becomes totalRevenue
            totalOrders: stats.totalOrders || prev.totalOrders,
            profitForecast: stats.profitForecast || prev.profitForecast,
            visitors: stats.totalVisitors || stats.visitors || prev.visitors,
            shopFollowers: stats.shopFollowers || prev.shopFollowers,
            shopRating: stats.shopRating || prev.shopRating,
            creditScore: stats.creditScore || prev.creditScore,
            
            // Timeframe-specific stats
            last7DaysOrders: stats['7days']?.orders || prev.last7DaysOrders,
            last7DaysSales: stats['7days']?.sales || prev.last7DaysSales,
            last30DaysOrders: stats['30days']?.orders || prev.last30DaysOrders,
            last30DaysSales: stats['30days']?.sales || prev.last30DaysSales
          };
          
          console.log('📊 Stats updated from analytics:', { 
            previous: prev, 
            new: newStats,
            source: isAdminEdited ? 'admin-edited' : 'calculated',
            adminEdited: isAdminEdited
          });
          
          return newStats;
        });
        
        // Save to localStorage for persistence
        if (isAdminEdited) {
          const analyticsToStore = {
            adminEdited: true,
            stats: stats,
            source: 'admin-panel',
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('adminEditedAnalytics', JSON.stringify(analyticsToStore));
          console.log('💾 Saved admin-edited analytics to localStorage');
          
          // Also force a re-render by updating the context
          setTimeout(() => {
            console.log('🔄 Forcing stats refresh after admin-edited analytics update');
            setStats(currentStats => ({ ...currentStats }));
          }, 100);
        }
      } else {
        console.log('ℹ️ No analytics stats found in any source');
      }
    } catch (err: any) {
      console.error('Failed to refresh analytics:', err);
      
      // If all sources fail, try to restore from localStorage
      try {
        const stored = localStorage.getItem('adminEditedAnalytics');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.adminEdited) {
            console.log('🔄 All sources failed, restoring admin-edited analytics from localStorage');
            setAdminEditedAnalytics(parsed);
            
            // Also update stats with stored data
            const storedStats = parsed.stats;
            setStats(prev => ({
              ...prev,
              // Core metrics that can be overridden by admin
              ordersSold: storedStats.ordersSold || storedStats.totalOrders || prev.ordersSold,
              totalSales: storedStats.totalSales || prev.totalSales,
              totalRevenue: storedStats.totalSales || prev.totalRevenue,
              totalOrders: storedStats.totalOrders || prev.totalOrders,
              profitForecast: storedStats.profitForecast || prev.profitForecast,
              visitors: storedStats.totalVisitors || storedStats.visitors || prev.visitors,
              shopFollowers: storedStats.shopFollowers || prev.shopFollowers,
              shopRating: storedStats.shopRating || prev.shopRating,
              creditScore: storedStats.creditScore || prev.creditScore,
              
              // Update timeframe-specific stats
              last7DaysOrders: storedStats['7days']?.orders || prev.last7DaysOrders,
              last7DaysSales: storedStats['7days']?.sales || prev.last7DaysSales,
              last30DaysOrders: storedStats['30days']?.orders || prev.last30DaysOrders,
              last30DaysSales: storedStats['30days']?.sales || prev.last30DaysSales
            }));
          }
        }
      } catch (e) {
        console.warn('Failed to restore from localStorage after all sources failed:', e);
      }
    }
  }, [isAuthenticated, user]);

  // Update stats when a new order is created
  const updateStatsFromOrder = useCallback((order: any) => {
    setStats(prev => ({
      ...prev,
      totalSales: prev.totalSales + (order.total || 0),
      totalRevenue: prev.totalRevenue + (order.total || 0),
      totalOrders: prev.totalOrders + 1,
      todaySales: prev.todaySales + (order.total || 0),
      todayOrders: prev.todayOrders + 1,
      thisMonthRevenue: prev.thisMonthRevenue + (order.total || 0),
      customers: prev.customers + 1,
      visitors: prev.visitors + 8
    }));

    setFinancialData(prev => ({
      ...prev,
      totalFinancing: prev.totalFinancing + (order.total || 0),
      accumulatedEarnings: prev.accumulatedEarnings + (order.total || 0)
    }));
  }, []);

  // Debounced data fetching to prevent API spam
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const debouncedFetchData = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const timer = setTimeout(() => {
      fetchAllData();
    }, 300); // 300ms debounce
    
    setDebounceTimer(timer);
  }, [debounceTimer, fetchAllData]);

  // Manual refresh function
  const refreshData = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    fetchAllData();
  }, [debounceTimer, fetchAllData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Debounced refresh function to prevent rapid successive calls
  const debouncedRefresh = useCallback(
    debounce(async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        console.log('🔄 Debounced refresh triggered');
        await refreshAnalytics();
      } catch (error) {
        console.warn('⚠️ Debounced refresh failed:', error);
        // Don't retry immediately on failure
      }
    }, 2000), // 2 second debounce
    [isAuthenticated, user, refreshAnalytics]
  );

  // Optimized refresh function with rate limiting protection
  const safeRefreshAnalytics = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      console.log('🔄 Safe refresh analytics triggered');
      await refreshAnalytics();
    } catch (error) {
      console.warn('⚠️ Safe refresh analytics failed:', error);
      
      // If it's a rate limit error, wait before retrying
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 30;
        console.log(`Rate limited. Will retry after ${retryAfter} seconds`);
        
        // Schedule a retry
        setTimeout(() => {
          debouncedRefresh();
        }, retryAfter * 1000);
      }
    }
  }, [isAuthenticated, user, refreshAnalytics, debouncedRefresh]);

  // CRITICAL FIX: Load admin-edited analytics FIRST, then fetch other data
  useEffect(() => {
    if (isAuthenticated && user) {
      // First, try to load admin-edited analytics immediately
      refreshAnalytics();
      
      // Then fetch other data after a longer delay to prevent rate limiting
      const timer = setTimeout(() => {
        fetchAllData();
      }, 1000); // Increased from 100ms to 1000ms
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]); // Remove dependencies to prevent infinite loops

  // Save admin-edited analytics to localStorage whenever they change
  useEffect(() => {
    if (adminEditedAnalytics?.adminEdited) {
      try {
        localStorage.setItem('adminEditedAnalytics', JSON.stringify(adminEditedAnalytics));
        console.log('💾 Saved admin-edited analytics to localStorage');
      } catch (e) {
        console.warn('Failed to save admin-edited analytics to localStorage:', e);
      }
    }
    // Don't clear localStorage here - only clear after successful server save
  }, [adminEditedAnalytics]);

  // Debug: Monitor stats changes
  useEffect(() => {
    console.log('🔄 Stats state changed:', {
      // Core metrics that can be overridden by admin
      ordersSold: stats.ordersSold,
      totalSales: stats.totalSales,
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      profitForecast: stats.profitForecast,
      visitors: stats.visitors,
      shopFollowers: stats.shopFollowers,
      shopRating: stats.shopRating,
      creditScore: stats.creditScore,
      
      // Other fields
      totalProducts: stats.totalProducts,
      totalCustomers: stats.totalCustomers,
      hasAdminEdited: adminEditedAnalytics?.adminEdited
    });
  }, [stats, adminEditedAnalytics]);

  // Set up real-time updates (every 2 minutes instead of 1 to reduce API calls)
  // But only if there are no admin-edited analytics to preserve them
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(async () => {
      // Check if we have admin-edited analytics before fetching
      if (adminEditedAnalytics?.adminEdited) {
        console.log('🔄 Skipping real-time update to preserve admin-edited analytics');
        // Only refresh analytics, not full data fetch
        await safeRefreshAnalytics();
      } else {
        console.log('🔄 Running full real-time update');
        try {
          await fetchAllData();
        } catch (error) {
          console.warn('⚠️ Failed to fetch data during real-time update:', error);
          
          // If it's a rate limit error, extend the interval
          if (error.response?.status === 429) {
            console.log('⚠️ Rate limited during real-time update, extending interval');
            // Clear current interval and set a longer one
            clearInterval(interval);
            setTimeout(() => {
              // Restart the interval after rate limit expires
              const newInterval = setInterval(async () => {
                try {
                  await fetchAllData();
                } catch (retryError) {
                  console.warn('⚠️ Retry also failed:', retryError);
                }
              }, 300000); // 5 minutes
              
              // Clean up after 10 minutes
              setTimeout(() => clearInterval(newInterval), 600000);
            }, 60000); // Wait 1 minute before restarting
          }
        }
      }
    }, 120000); // Changed from 60000 to 120000 (2 minutes)
    
    return () => clearInterval(interval);
  }, [fetchAllData, safeRefreshAnalytics, adminEditedAnalytics, isAuthenticated, user]);

  // Function to manually restore admin-edited analytics from localStorage
  const restoreFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('adminEditedAnalytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.adminEdited) {
          console.log('🔄 Manually restoring admin-edited analytics from localStorage');
          setAdminEditedAnalytics(parsed);
          // Update stats with stored analytics
          const adminStats = parsed.stats;
          setStats(prev => ({
            ...prev,
            totalSales: adminStats.totalSales || prev.totalSales,
            totalRevenue: adminStats.totalSales || prev.totalRevenue,
            totalOrders: adminStats.totalOrders || prev.totalOrders,
            products: adminStats.totalProducts || prev.totalProducts,
            customers: adminStats.totalCustomers || prev.totalCustomers,
            visitors: adminStats.totalVisitors || prev.totalVisitors,
            shopFollowers: adminStats.shopFollowers || prev.shopFollowers,
            shopRating: adminStats.shopRating || prev.shopRating,
            creditScore: adminStats.creditScore || prev.creditScore,
            // Update timeframe-specific stats
            last7DaysOrders: adminStats['7days']?.orders || prev.last7DaysOrders,
            last7DaysSales: adminStats['7days']?.sales || prev.last7DaysSales,
            last30DaysOrders: adminStats['30days']?.orders || prev.last30DaysOrders,
            last30DaysSales: adminStats['30days']?.sales || prev.last30DaysSales
          }));
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to manually restore from localStorage:', e);
    }
    return false;
  }, []);

  // Function to clear localStorage only after successful server save
  const clearLocalStorageAfterSave = useCallback(() => {
    try {
      localStorage.removeItem('adminEditedAnalytics');
      console.log('🗑️ Cleared admin-edited analytics from localStorage after successful server save');
    } catch (e) {
      console.warn('Failed to clear admin-edited analytics from localStorage:', e);
    }
  }, []);

  // Function to clear override error
  const clearOverrideError = useCallback(() => {
    setOverrideError(null);
  }, []);

  // Function to refresh overrides data after saving
  const refreshOverrides = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    // Prevent multiple simultaneous refresh calls
    if (refreshingOverrides.current) {
      console.log('⏳ Override refresh already in progress, skipping...');
      return;
    }
    
    try {
      refreshingOverrides.current = true;
      console.log('🔄 Refreshing admin overrides after save...');
      const overridesResponse = await adminApi.getSellerOverrides(user._id);
      if (overridesResponse.error === false) {
        const overrides = overridesResponse.overrides || [];
        console.log('✅ Refreshed overrides:', overrides);
        
        // Apply the refreshed overrides to stats
        setStats(prev => {
          const newStats = { ...prev };
          
          // Map metric names from backend to frontend
          const metricMapping = {
            'orders_sold': 'ordersSold',
            'total_sales': 'totalSales',
            'profit_forecast': 'profitForecast',
            'visitors': 'visitors',
            'shop_followers': 'shopFollowers',
            'shop_rating': 'shopRating',
            'credit_score': 'creditScore'
          };
          
          overrides.forEach(override => {
            const backendMetricName = override.metric_name;
            const frontendMetricName = metricMapping[backendMetricName];
            const overrideValue = parseFloat(override.override_value);
            
            if (frontendMetricName && !isNaN(overrideValue)) {
              const currentValue = newStats[frontendMetricName] || 0;
              // Always apply the override value from the database
              console.log(`🔄 Applying refreshed override: ${backendMetricName} -> ${frontendMetricName} = ${overrideValue} (was: ${currentValue})`);
              newStats[frontendMetricName] = overrideValue;
            } else {
              console.log(`⚠️ Skipping override: ${backendMetricName} -> ${frontendMetricName}`, {
                frontendMetricName: !!frontendMetricName,
                frontendMetricNameExists: frontendMetricName in newStats,
                isNaN: isNaN(overrideValue),
                overrideValue
              });
            }
          });
          
          return newStats;
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to refresh overrides:', error);
    } finally {
      refreshingOverrides.current = false;
    }
  }, [isAuthenticated, user]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAllData();
    }
  }, [isAuthenticated, user, fetchAllData]);

  // Additional effect to fetch data when impersonation state changes
  useEffect(() => {
    if (isAuthenticated && user && isImpersonating && originalUser?.role === 'admin') {
      console.log('🎭 Impersonation state changed - refreshing data with admin overrides...');
      fetchAllData();
    }
  }, [isImpersonating, originalUser?.role, isAuthenticated, user, fetchAllData]);

  const value: SellerDataContextType = {
    stats,
    financialData,
    recentOrders,
    isLoading,
    error,
    overrideError,
    adminEditedAnalytics,
    refreshData,
    refreshAnalytics,
    updateStatsFromOrder,
    restoreFromLocalStorage,
    clearLocalStorageAfterSave,
    clearOverrideError,
    refreshOverrides
  };

  return (
    <SellerDataContext.Provider value={value}>
      {children}
    </SellerDataContext.Provider>
  );
};
