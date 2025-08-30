import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi, ordersApi, distributionsApi } from '../../services/api';
import { sellerManagementApi } from '../../services/sellerManagementApi';
import SellerAnalyticsEditor from '../../components/SellerAnalyticsEditor';
import { CookieManager } from '../../utils/cookieManager';
import {
  faArrowLeft,
  faEdit,
  faSave,
  faTimes,
  faUser,
  faStore,
  faChartLine,
  faShoppingBag,
  faDollarSign,
  faUsers,
  faEye,
  faStar,
  faCreditCard,
  faCalendar,
  faMapMarkerAlt,
  faEnvelope,
  faPhone,
  faGlobe,
  faCog,
  faTrash,
  faPlus,
  faMinus,
  faRefresh,
  faDownload,
  faPrint,
  faBell,
  faExclamationTriangle,
  faCheckCircle,
  faClock,
  faTruck,
  faBoxes,
  faWallet,
  faPiggyBank,
  faArrowUp,
  faArrowDown,
  faHeart,
  faDatabase,
  faRotateLeft,
  faFloppyDisk,
  faList,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

interface SellerData {
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
  analytics: {
    totalSales: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    averageOrderValue: number;
    conversionRate: number;
    customerSatisfaction: number;
    monthlyGrowth: number;
    topCategories: Array<{ name: string; sales: number; percentage: number }>;
    recentPerformance: Array<{ date: string; sales: number; orders: number }>;
    // New fields for fake data control
    todayOrders?: number;
    last7DaysOrders?: number;
    last30DaysOrders?: number;
    todaySales?: number;
    last7DaysSales?: number;
    last30DaysSales?: number;
    todayProfit?: number;
    last7DaysProfit?: number;
    last30DaysProfit?: number;
    todayVisitors?: number;
    last7DaysVisitors?: number;
    last30DaysVisitors?: number;
    totalSales?: number;
    totalOrders?: number;
    totalProducts?: number;
    totalCustomers?: number;
    totalVisitors?: number;
    shopFollowers?: number;
    shopRating?: number;
    creditScore?: number;
    adminEdited?: boolean;
    stats?: any; // For storing the last saved state
  };
  financial: {
    balance: number;
    pendingPayouts: number;
    totalEarnings: number;
    monthlyRevenue: number;
    profitMargin: number;
    refundRate: number;
  };
  performance: {
    rating: number;
    responseTime: number;
    fulfillmentRate: number;
    returnRate: number;
    customerReviews: number;
  };
}

interface TimeframeStatsData {
  orders: number;
  sales: number;
  revenue: number;
  products: number;
  customers: number;
  visitors: number;
  followers: number;
  rating: number;
  creditScore: number;
  hasFakeData?: boolean;
  source?: string;
  error?: string;
}

interface TimeframeStats {
  today: TimeframeStatsData;
  '7days': TimeframeStatsData;
  '30days': TimeframeStatsData;
  total: TimeframeStatsData;
}

const SellerDetails: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { user, isImpersonating, originalUser } = useAuth();
  const location = useLocation() as any;
  
  // Determine the effective user for admin checks (admin user when impersonating, current user otherwise)
  const effectiveUser = isImpersonating ? originalUser : user;
  
  const [sellerData, setSellerData] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'financial' | 'performance' | 'products' | 'orders'>('overview');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // New analytics state variables
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'today' | 'last7Days' | 'last30Days' | 'total'>('today');
  const [isFakeDataActive, setIsFakeDataActive] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState('Never');
  const [fakeDataConfig, setFakeDataConfig] = useState<any>({
    sellerId: null,
    fakeStats: [],
    adminEdited: false,
    lastUpdated: null
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Timeframe statistics state
  const [timeframeStats, setTimeframeStats] = useState<TimeframeStats | null>(null);
  const [timeframeStatsLoading, setTimeframeStatsLoading] = useState(false);

  // Helper functions for analytics display and database management
  const getDisplayValue = (todayKey: string, weekKey?: string, monthKey?: string, isRating = false) => {
    // Check fake stats from database first
    if (fakeDataConfig && fakeDataConfig.fakeStats) {
      const timeframe = analyticsPeriod === 'today' ? 'today' : 
                       analyticsPeriod === 'last7Days' ? '7days' : 
                       analyticsPeriod === 'last30Days' ? '30days' : 'total';
      
      const fakeStats = fakeDataConfig.fakeStats.find((stat: any) => stat.timeframe === timeframe);
      if (fakeStats) {
        // Map the key to the fake stats field
        const keyMap: { [key: string]: string } = {
          'todayOrders': 'fake_orders',
          'last7DaysOrders': 'fake_orders',
          'last30DaysOrders': 'fake_orders',
          'todaySales': 'fake_sales',
          'last7DaysSales': 'fake_sales',
          'last30DaysSales': 'fake_sales',
          'todayProfit': 'fake_revenue',
          'last7DaysProfit': 'fake_revenue',
          'last30DaysProfit': 'fake_revenue',
          'todayVisitors': 'fake_visitors',
          'last7DaysVisitors': 'fake_visitors',
          'last30DaysVisitors': 'fake_visitors',
          'totalSales': 'fake_sales',
          'totalOrders': 'fake_orders',
          'totalProducts': 'fake_products',
          'totalCustomers': 'fake_customers',
          'totalVisitors': 'fake_visitors',
          'shopFollowers': 'fake_followers',
          'shopRating': 'fake_rating',
          'creditScore': 'fake_credit_score'
        };
        
        const fakeField = keyMap[todayKey];
        if (fakeField && fakeStats[fakeField] !== undefined) {
          const value = fakeStats[fakeField];
          return isRating ? parseFloat(value).toFixed(1) : value;
        }
      }
    }
    
    // Fallback to real data
    if (analyticsPeriod === 'today' && sellerData?.analytics?.[todayKey] !== undefined) {
      return isRating ? sellerData.analytics[todayKey].toFixed(1) : sellerData.analytics[todayKey];
    }
    if (analyticsPeriod === 'last7Days' && weekKey && sellerData?.analytics?.[weekKey] !== undefined) {
      return isRating ? sellerData.analytics[weekKey].toFixed(1) : sellerData.analytics[weekKey];
    }
    if (analyticsPeriod === 'last30Days' && monthKey && sellerData?.analytics?.[monthKey] !== undefined) {
      return isRating ? sellerData.analytics[monthKey].toFixed(1) : sellerData.analytics[monthKey];
    }
    if (analyticsPeriod === 'total' && sellerData?.analytics?.[todayKey] !== undefined) {
      return isRating ? sellerData.analytics[todayKey].toFixed(1) : sellerData.analytics[todayKey];
    }
    
    return isRating ? '0.0' : '0';
  };

  const getPeriodKey = (metricType: string) => {
    switch (analyticsPeriod) {
      case 'today':
        return `today${metricType}`;
      case 'last7Days':
        return `last7Days${metricType}`;
      case 'last30Days':
        return `last30Days${metricType}`;
      default:
        return `total${metricType}`;
    }
  };

  const handleAnalyticsChange = (key: string, value: string | number) => {
    if (!sellerData?._id) return;
    
    // Update local state for immediate UI feedback
    setFakeDataConfig(prev => {
      const timeframe = analyticsPeriod === 'today' ? 'today' : 
                       analyticsPeriod === 'last7Days' ? '7days' : 
                       analyticsPeriod === 'last30Days' ? '30days' : 'total';
      
      const updatedFakeStats = [...(prev.fakeStats || [])];
      let existingStatIndex = updatedFakeStats.findIndex((stat: any) => stat.timeframe === timeframe);
      
      if (existingStatIndex === -1) {
        // Create new stat entry for this timeframe
        const newStat = {
          timeframe,
          fake_orders: 0,
          fake_sales: 0,
          fake_revenue: 0,
          fake_products: 0,
          fake_customers: 0,
          fake_visitors: 0,
          fake_followers: 0,
          fake_rating: 0,
          fake_credit_score: 0
        };
        updatedFakeStats.push(newStat);
        existingStatIndex = updatedFakeStats.length - 1;
      }
      
      // Map the key to the fake stats field
      const keyMap: { [key: string]: string } = {
        'todayOrders': 'fake_orders',
        'last7DaysOrders': 'fake_orders',
        'last30DaysOrders': 'fake_orders',
        'todaySales': 'fake_sales',
        'last7DaysSales': 'fake_sales',
        'last30DaysSales': 'fake_sales',
        'todayProfit': 'fake_revenue',
        'last7DaysProfit': 'fake_revenue',
        'last30DaysProfit': 'fake_revenue',
        'todayVisitors': 'fake_visitors',
        'last7DaysVisitors': 'fake_visitors',
        'last30DaysVisitors': 'fake_visitors',
        'totalSales': 'fake_sales',
        'totalOrders': 'fake_orders',
        'totalProducts': 'fake_products',
        'totalCustomers': 'fake_customers',
        'totalVisitors': 'fake_visitors',
        'shopFollowers': 'fake_followers',
        'shopRating': 'fake_rating',
        'creditScore': 'fake_credit_score'
      };
      
      const fakeField = keyMap[key];
      if (fakeField) {
        updatedFakeStats[existingStatIndex][fakeField] = typeof value === 'string' ? parseFloat(value) || 0 : value;
      }
      
      return {
        ...prev,
        sellerId: sellerData._id,
        fakeStats: updatedFakeStats,
        adminEdited: true
      };
    });
  };

  // Check for existing fake data when seller data loads
  useEffect(() => {
    const loadFakeStats = async () => {
      if (sellerData?._id) {
        try {
          const response = await fetch(`/api/admin/sellers/${sellerData._id}/fake-stats`, {
            headers: {
              'Authorization': `Bearer ${CookieManager.getAuthToken()}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const fakeStats = await response.json();
            if (fakeStats && fakeStats.length > 0) {
              setFakeDataConfig({
                sellerId: sellerData._id,
                fakeStats: fakeStats,
                adminEdited: true,
                lastUpdated: new Date().toISOString()
              });
              setIsFakeDataActive(true);
              setLastDataUpdate(new Date().toLocaleString());
              console.log('📊 Found existing fake stats for seller:', fakeStats);
            } else {
              // Initialize with empty stats for this seller
              setFakeDataConfig({
                sellerId: sellerData._id,
                fakeStats: [],
                adminEdited: false,
                lastUpdated: null
              });
            }
          }
        } catch (error) {
          console.warn('Failed to load fake stats:', error);
          // Initialize with empty stats on error
          setFakeDataConfig({
            sellerId: sellerData._id,
            fakeStats: [],
            adminEdited: false,
            lastUpdated: null
          });
        }
      }
    };
    
    loadFakeStats();
  }, [sellerData?._id]);

  // Fetch seller data function
  const fetchSellerData = useCallback(async () => {
    if (!sellerId) return;
    
    try {
      setLoading(true);
      setError(null);

      let resolvedUser: any | null = location?.state?.seller || null;

      // If not provided via Link state, try to resolve via admin listing search
      if (!resolvedUser) {
        try {
          const result = await adminApi.getUsers({ role: 'seller', search: sellerId, limit: 1 });
          const first = result?.users?.[0];
          if (first) resolvedUser = first;
        } catch {}
      }

      // If still not found, try public sellers search (matches storeName/fullName)
      if (!resolvedUser) {
        try {
          const resp = await fetch(`http://localhost:5000/api/search/sellers?q=${encodeURIComponent(sellerId)}&limit=1`);
          if (resp.ok) {
            const data = await resp.json();
            const first = data?.sellers?.[0];
            if (first) {
              resolvedUser = first;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!resolvedUser) {
        throw new Error('Seller not found');
      }

      const resolvedId = resolvedUser._id || resolvedUser.id || sellerId;

      const mapped = {
        _id: resolvedId,
        fullName: resolvedUser.fullName || resolvedUser.name || 'Unnamed',
        email: resolvedUser.email || 'no-email',
        phone: resolvedUser.phoneNumber || resolvedUser.phone || '',
        businessInfo: {
          storeName: resolvedUser.businessInfo?.storeName || 'Store',
          storeDescription: resolvedUser.businessInfo?.storeDescription || '',
          businessType: resolvedUser.businessInfo?.businessType || 'individual',
          website: resolvedUser.businessInfo?.website || ''
        },
        role: resolvedUser.role,
        isVerified: Boolean(resolvedUser.isEmailVerified || resolvedUser.isVerified),
        isActive: Boolean(resolvedUser.isActive !== false),
        createdAt: resolvedUser.createdAt || new Date().toISOString(),
        lastLogin: resolvedUser.lastLogin || '',
        analytics: {
          totalSales: resolvedUser.analytics?.totalSales || resolvedUser.totalSales || 0,
          totalOrders: resolvedUser.analytics?.totalOrders || resolvedUser.totalOrders || 0,
          totalProducts: resolvedUser.analytics?.totalProducts || resolvedUser.totalProducts || 0,
          totalCustomers: resolvedUser.analytics?.totalCustomers || resolvedUser.totalCustomers || 0,
          averageOrderValue: resolvedUser.analytics?.averageOrderValue || resolvedUser.averageOrderValue || 0,
          conversionRate: resolvedUser.analytics?.conversionRate || resolvedUser.conversionRate || 0,
          customerSatisfaction: resolvedUser.analytics?.customerSatisfaction || resolvedUser.customerSatisfaction || 0,
          monthlyGrowth: resolvedUser.analytics?.monthlyGrowth || resolvedUser.monthlyGrowth || 0,
          topCategories: resolvedUser.analytics?.topCategories || [],
          recentPerformance: resolvedUser.analytics?.recentPerformance || [],
          // New dashboard fields
          todayOrders: resolvedUser.analytics?.todayOrders || 0,
          last7DaysOrders: resolvedUser.analytics?.last7DaysOrders || 0,
          last30DaysOrders: resolvedUser.analytics?.last30DaysOrders || 0,
          todaySales: resolvedUser.analytics?.todaySales || 0,
          last7DaysSales: resolvedUser.analytics?.last7DaysSales || 0,
          last30DaysSales: resolvedUser.analytics?.last30DaysSales || 0,
          todayProfit: resolvedUser.analytics?.todayProfit || 0,
          last7DaysProfit: resolvedUser.analytics?.last7DaysProfit || 0,
          last30DaysProfit: resolvedUser.analytics?.last30DaysProfit || 0,
          todayVisitors: resolvedUser.analytics?.todayVisitors || 0,
          last7DaysVisitors: resolvedUser.analytics?.last7DaysVisitors || 0,
          last30DaysVisitors: resolvedUser.analytics?.last30DaysVisitors || 0,
          totalVisitors: resolvedUser.analytics?.totalVisitors || 0,
          shopFollowers: resolvedUser.analytics?.shopFollowers || 0,
          shopRating: resolvedUser.analytics?.shopRating || 4.5,
          creditScore: resolvedUser.analytics?.creditScore || 750
        },
        financial: {
          balance: resolvedUser.financial?.balance || resolvedUser.balance || 0,
          pendingPayouts: resolvedUser.financial?.pendingPayouts || resolvedUser.pendingPayouts || 0,
          totalEarnings: resolvedUser.financial?.totalEarnings || resolvedUser.totalEarnings || 0,
          monthlyRevenue: resolvedUser.financial?.monthlyRevenue || resolvedUser.monthlyRevenue || 0,
          profitMargin: resolvedUser.financial?.profitMargin || resolvedUser.profitMargin || 0,
          refundRate: resolvedUser.financial?.refundRate || resolvedUser.refundRate || 0
        },
        performance: {
          rating: resolvedUser.performance?.rating || resolvedUser.rating || 4,
          responseTime: resolvedUser.performance?.responseTime || resolvedUser.responseTime || 0,
          fulfillmentRate: resolvedUser.performance?.fulfillmentRate || resolvedUser.fulfillmentRate || 0,
          returnRate: resolvedUser.performance?.returnRate || resolvedUser.returnRate || 0,
          customerReviews: resolvedUser.performance?.customerReviews || resolvedUser.customerReviews || 0
        }
      } as SellerData;

      // Set the seller data with the mapped analytics
      setSellerData(mapped);

      // Fetch recent orders for this seller (only if we have a valid token)
      try {
        const ordersResponse = await ordersApi.getOrders({ limit: 20 });
        const orders = (ordersResponse.orders || []).filter((o: any) => {
          const sellerRef = o.seller?._id || o.seller;
          return sellerRef?.toString() === resolvedId.toString();
        });
        setRecentOrders(orders);
      } catch (err) {
        console.log('Could not fetch orders:', err);
        setRecentOrders([]);
      }

      // Fetch products via distributions for this seller (only if we have a valid token)
      try {
        const productsResponse = await distributionsApi.getDistributions({ limit: 100 });
        const sellerProducts = (productsResponse.distributions || []).filter((d: any) => {
          const sellerRef = d.seller?._id || d.seller;
          return sellerRef?.toString() === resolvedId.toString();
        });
        setProducts(sellerProducts);
      } catch (err) {
        console.log('Could not fetch products:', err);
        setProducts([]);
      }

    } catch (err: any) {
      console.error('Error fetching seller data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load seller data');
    } finally {
      setLoading(false);
    }
  }, [sellerId, location?.state?.seller]);

  // Fetch timeframe stats function
  const fetchTimeframeStats = useCallback(async () => {
    if (!sellerId) return;
    try {
      setTimeframeStatsLoading(true);
      const response = await adminApi.getSellerTimeframeStats(sellerId);
      setTimeframeStats(response.stats);
      console.log('📊 Fetched timeframe stats:', response.stats);
    } catch (error) {
      console.error('Error fetching timeframe stats:', error);
      setTimeframeStats(null);
    } finally {
      setTimeframeStatsLoading(false);
    }
  }, [sellerId]);


  // Fetch seller data on component mount
  useEffect(() => {
    if (!sellerId) return;
    fetchSellerData();
    fetchTimeframeStats();
  }, [sellerId, fetchSellerData, fetchTimeframeStats]);







  // Save fake data to database
  const saveFakeData = async () => {
    if (!sellerData?._id || !fakeDataConfig?.fakeStats) return;
    
    try {
      // Save each timeframe's fake stats to the database
      for (const fakeStat of fakeDataConfig.fakeStats) {
        const response = await fetch(`/api/admin/sellers/${sellerData._id}/fake-stats`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CookieManager.getAuthToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timeframe: fakeStat.timeframe,
            stats: {
              orders: fakeStat.fake_orders,
              sales: fakeStat.fake_sales,
              revenue: fakeStat.fake_revenue,
              products: fakeStat.fake_products,
              customers: fakeStat.fake_customers,
              visitors: fakeStat.fake_visitors,
              followers: fakeStat.fake_followers,
              rating: fakeStat.fake_rating,
              creditScore: fakeStat.fake_credit_score
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save ${fakeStat.timeframe} stats: ${response.statusText}`);
        }
      }
      
      setIsFakeDataActive(true);
      setLastDataUpdate(new Date().toLocaleString());
      
      alert('✅ Fake data saved to database! Data will persist across sessions and be visible to the seller.');
      console.log('💾 Fake data saved to database:', fakeDataConfig.fakeStats);
      
    } catch (error) {
      console.error('❌ Failed to save fake data to database:', error);
      alert('❌ Failed to save fake data to database. Please try again.');
    }
  };

  const resetToRealData = async () => {
    if (!sellerData?._id) return;
    
    if (window.confirm('Are you sure you want to reset to real data? This will clear all fake data from the database.')) {
      try {
        // Delete all fake stats from database
        const response = await fetch(`/api/admin/sellers/${sellerData._id}/fake-stats`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${CookieManager.getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete fake stats: ${response.statusText}`);
        }
        
        // Reset state
        setFakeDataConfig({
          sellerId: sellerData._id,
          fakeStats: [],
          adminEdited: false,
          lastUpdated: new Date().toISOString()
        });
        setIsFakeDataActive(false);
        setLastDataUpdate(new Date().toLocaleString());
        
        // Refresh seller data to show real values
        await fetchSellerData();
        
        alert('✅ Reset to real data successfully! All fake data cleared from database.');
        console.log('🔄 Reset to real data completed');
      } catch (error) {
        console.error('Failed to reset to real data:', error);
        alert('❌ Failed to reset to real data. Please try again.');
      }
    }
  };

  const previewSellerView = () => {
    if (!sellerData?._id || !fakeDataConfig?.fakeStats) {
      alert('❌ No fake data configured. Please configure and save fake data first.');
      return;
    }
    
    // Open seller dashboard in new tab
    // The seller dashboard will automatically fetch fake stats from the database
    const sellerDashboardUrl = `/dashboard/${sellerData.businessInfo?.storeName || sellerData.fullName}`;
    window.open(sellerDashboardUrl, '_blank');
    
    alert('🔍 Seller view preview opened! The seller will see the fake data you configured from the database.');
    console.log('🔍 Preview opened with fake data:', fakeDataConfig.fakeStats);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading seller details...</p>
        </div>
      </div>
    );
  }

  if (error || !sellerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Seller</h2>
          <p className="text-gray-600 mb-4">{error || 'Seller not found'}</p>
          <button
            onClick={() => navigate('/admin/sellers')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Sellers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/sellers')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Seller Details</h1>
                <p className="text-sm text-gray-600">Manage seller analytics and performance</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <FontAwesomeIcon icon={faDownload} className="w-4 h-4 mr-2" />
                Export Data
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <FontAwesomeIcon icon={faPrint} className="w-4 h-4 mr-2" />
                Print Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seller Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faUser} className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{sellerData.fullName}</h2>
                <p className="text-gray-600">{sellerData.businessInfo?.storeName}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center">
                    <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 mr-1" />
                    {sellerData.email}
                  </span>
                  {sellerData.phone && (
                    <span className="flex items-center">
                      <FontAwesomeIcon icon={faPhone} className="w-4 h-4 mr-1" />
                      {sellerData.phone}
                    </span>
                  )}
                  {sellerData.businessInfo?.website && (
                    <span className="flex items-center">
                      <FontAwesomeIcon icon={faGlobe} className="w-4 h-4 mr-1" />
                      {sellerData.businessInfo.website}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                sellerData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {sellerData.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                sellerData.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {sellerData.isVerified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-8">
          <nav className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: faChartLine },
              { id: 'analytics', label: 'Analytics', icon: faChartLine },
              { id: 'financial', label: 'Financial', icon: faWallet },
              { id: 'performance', label: 'Performance', icon: faStar },
              { id: 'products', label: 'Products', icon: faBoxes },
              { id: 'orders', label: 'Orders', icon: faShoppingBag }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Key Metrics */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold text-gray-900">${sellerData.analytics.totalSales.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <FontAwesomeIcon icon={faDollarSign} className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <FontAwesomeIcon 
                        icon={sellerData.analytics.monthlyGrowth >= 0 ? faArrowUp : faArrowDown} 
                        className={`w-4 h-4 mr-1 ${sellerData.analytics.monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} 
                      />
                      <span className={sellerData.analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {Math.abs(sellerData.analytics.monthlyGrowth).toFixed(1)}%
                      </span>
                      <span className="text-gray-500 ml-1">from last month</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900">{sellerData.analytics.totalOrders.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FontAwesomeIcon icon={faShoppingBag} className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      <span className="font-medium">${sellerData.analytics.averageOrderValue.toFixed(2)}</span> average order value
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
                        <p className="text-2xl font-bold text-gray-900">{sellerData.performance.rating.toFixed(1)}/5</p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <FontAwesomeIcon icon={faStar} className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      <span className="font-medium">{sellerData.performance.customerReviews}</span> customer reviews
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                        <p className="text-2xl font-bold text-gray-900">{sellerData.financial.profitMargin.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <FontAwesomeIcon icon={faPiggyBank} className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      <span className="font-medium">${sellerData.financial.totalEarnings.toLocaleString()}</span> total earnings
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-2" />
                      Edit Analytics
                    </button>
                    <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                      <FontAwesomeIcon icon={faBell} className="w-4 h-4 mr-2" />
                      Send Notification
                    </button>
                    <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm">
                      <FontAwesomeIcon icon={faCog} className="w-4 h-4 mr-2" />
                      Adjust Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

                    {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Admin Control Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      <FontAwesomeIcon icon={faDatabase} className="w-4 h-4 mr-2" />
                      Admin Analytics Control
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>Fake Data Mode:</strong> Edit any statistic below to override what the seller sees in their dashboard. 
                      Changes are saved to the database and persist across sessions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Period Tabs */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-center mb-6">
                  <div className="bg-gray-100 rounded-xl p-2 inline-flex">
                    <button
                      onClick={() => setAnalyticsPeriod('today')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        analyticsPeriod === 'today'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setAnalyticsPeriod('last7Days')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        analyticsPeriod === 'last7Days'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      onClick={() => setAnalyticsPeriod('last30Days')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        analyticsPeriod === 'last30Days'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      Last 30 Days
                    </button>
                    <button
                      onClick={() => setAnalyticsPeriod('total')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        analyticsPeriod === 'total'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                </div>

                {/* Stats Grid - Mirroring Seller Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Time-based metrics */}
                  {analyticsPeriod !== 'total' && (
                    <>
                      {/* Orders Sold */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Orders Sold</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {getDisplayValue('todayOrders', 'last7DaysOrders', 'last30DaysOrders')}
                            </p>
                          </div>
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <FontAwesomeIcon icon={faShoppingBag} className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value:</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake orders count"
                            onChange={(e) => handleAnalyticsChange(getPeriodKey('Orders'), parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Total Sales */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Sales</p>
                            <p className="text-2xl font-bold text-gray-900">
                              ${getDisplayValue('todaySales', 'last7DaysSales', 'last30DaysSales')}
                            </p>
                          </div>
                          <div className="p-3 bg-green-100 rounded-lg">
                            <FontAwesomeIcon icon={faDollarSign} className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value ($):</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake sales amount"
                            onChange={(e) => handleAnalyticsChange(getPeriodKey('Sales'), parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Profit Forecast */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Profit Forecast</p>
                            <p className="text-2xl font-bold text-gray-900">
                              ${getDisplayValue('todayProfit', 'last7DaysProfit', 'last30DaysProfit')}
                            </p>
                          </div>
                          <div className="p-3 bg-purple-100 rounded-lg">
                            <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value ($):</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake profit amount"
                            onChange={(e) => handleAnalyticsChange(getPeriodKey('Profit'), parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Visitors */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Visitors</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {getDisplayValue('todayVisitors', 'last7DaysVisitors', 'last30DaysVisitors')}
                            </p>
                          </div>
                          <div className="p-3 bg-orange-100 rounded-lg">
                            <FontAwesomeIcon icon={faEye} className="w-6 h-6 text-orange-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value:</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake visitor count"
                            onChange={(e) => handleAnalyticsChange(getPeriodKey('Visitors'), parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Total metrics */}
                  {analyticsPeriod === 'total' && (
                    <>
                      {/* Total Sales */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Sales</p>
                            <p className="text-2xl font-bold text-gray-900">${getDisplayValue('totalSales')}</p>
                          </div>
                          <div className="p-3 bg-green-100 rounded-lg">
                            <FontAwesomeIcon icon={faDollarSign} className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value ($):</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake total sales"
                            onChange={(e) => handleAnalyticsChange('totalSales', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Total Orders */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900">{getDisplayValue('totalOrders')}</p>
                          </div>
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <FontAwesomeIcon icon={faShoppingBag} className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value:</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake total orders"
                            onChange={(e) => handleAnalyticsChange('totalOrders', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Total Products */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Products</p>
                            <p className="text-2xl font-bold text-gray-900">{getDisplayValue('totalProducts')}</p>
                          </div>
                          <div className="p-3 bg-purple-100 rounded-lg">
                            <FontAwesomeIcon icon={faStore} className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value:</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake product count"
                            onChange={(e) => handleAnalyticsChange('totalProducts', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Total Customers */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Customers</p>
                            <p className="text-2xl font-bold text-gray-900">{getDisplayValue('totalCustomers')}</p>
                          </div>
                          <div className="p-3 bg-orange-100 rounded-lg">
                            <FontAwesomeIcon icon={faUsers} className="w-6 h-6 text-orange-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value:</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake customer count"
                            onChange={(e) => handleAnalyticsChange('totalCustomers', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Total Visitors */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Visitors</p>
                            <p className="text-2xl font-bold text-gray-900">{getDisplayValue('totalVisitors')}</p>
                          </div>
                          <div className="p-3 bg-teal-100 rounded-lg">
                            <FontAwesomeIcon icon={faEye} className="w-6 h-6 text-teal-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Override Value:</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter fake visitor count"
                            onChange={(e) => handleAnalyticsChange('totalVisitors', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Static metrics - always shown */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Shop Followers</p>
                        <p className="text-2xl font-bold text-gray-900">{getDisplayValue('shopFollowers')}</p>
                      </div>
                      <div className="p-3 bg-pink-100 rounded-lg">
                        <FontAwesomeIcon icon={faHeart} className="w-6 h-6 text-pink-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Override Value:</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter fake follower count"
                        onChange={(e) => handleAnalyticsChange('shopFollowers', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Shop Rating</p>
                        <p className="text-2xl font-bold text-gray-900">{getDisplayValue('shopRating', null, null, true)}</p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <FontAwesomeIcon icon={faStar} className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Override Value (1-5):</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter fake rating (1-5)"
                        onChange={(e) => handleAnalyticsChange('shopRating', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Credit Score</p>
                        <p className="text-2xl font-bold text-gray-900">{getDisplayValue('creditScore')}</p>
                      </div>
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <FontAwesomeIcon icon={faCreditCard} className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Override Value (300-850):</label>
                      <input
                        type="number"
                        min="300"
                        max="850"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter fake credit score"
                        onChange={(e) => handleAnalyticsChange('creditScore', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4 mt-8">
                  <button
                    onClick={saveFakeData}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4 mr-2" />
                                          Save Fake Data to Database
                  </button>
                  <button
                    onClick={resetToRealData}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4 mr-2" />
                    Reset to Real Data
                  </button>
                  <button
                    onClick={previewSellerView}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <FontAwesomeIcon icon={faEye} className="w-4 h-4 mr-2" />
                    Preview Seller View
                  </button>
                </div>
              </div>

              {/* Data Source Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 mr-2" />
                  Data Source Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Current Data Source:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${isFakeDataActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <span className="text-sm text-gray-600">
                          {isFakeDataActive ? 'Fake Data (Admin Override)' : 'Real Data (Database)'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last updated: {lastDataUpdate}
                      </div>
                      <div className="text-xs text-blue-600">
                        💾 Database (Persistent Across Sessions)
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Data Priority:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>1. Fake Stats (Database)</div>
                      <div>2. Real Database Data</div>
                      <div>3. Calculated/Default Values</div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <strong>Note:</strong> Fake data is stored in the database and persists across all sessions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeframe Statistics Tab */}
          {activeTab === 'timeframeStats' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  <FontAwesomeIcon icon={faDatabase} className="w-4 h-4 mr-2" />
                  Live Statistics from Database
                </h3>
                <button 
                  onClick={fetchTimeframeStats}
                  disabled={timeframeStatsLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faRefresh} className="w-4 h-4 mr-2" />
                  {timeframeStatsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {timeframeStatsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading timeframe statistics...</p>
                </div>
              ) : timeframeStats ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Today Stats */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="font-medium text-gray-700 mb-3 text-center">Today</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Orders:</span>
                        <span className="font-medium">{timeframeStats.today?.orders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sales:</span>
                        <span className="font-medium">${timeframeStats.today?.sales || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Visitors:</span>
                        <span className="font-medium">{timeframeStats.today?.visitors || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source:</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          timeframeStats.today?.hasFakeData 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {timeframeStats.today?.source || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 7 Days Stats */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                    <h4 className="font-medium text-gray-700 mb-3 text-center">Last 7 Days</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Orders:</span>
                        <span className="font-medium">{timeframeStats['7days']?.orders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sales:</span>
                        <span className="font-medium">${timeframeStats['7days']?.sales || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Visitors:</span>
                        <span className="font-medium">{timeframeStats['7days']?.visitors || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source:</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          timeframeStats['7days']?.hasFakeData 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {timeframeStats['7days']?.source || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 30 Days Stats */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-purple-50">
                    <h4 className="font-medium text-gray-700 mb-3 text-center">Last 30 Days</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Orders:</span>
                        <span className="font-medium">{timeframeStats['30days']?.orders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sales:</span>
                        <span className="font-medium">${timeframeStats['30days']?.sales || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Visitors:</span>
                        <span className="font-medium">{timeframeStats['30days']?.visitors || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source:</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          timeframeStats['30days']?.hasFakeData 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {timeframeStats['30days']?.source || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Stats */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-orange-50">
                    <h4 className="font-medium text-gray-700 mb-3 text-center">All Time</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Orders:</span>
                        <span className="font-medium">{timeframeStats.total?.orders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sales:</span>
                        <span className="font-medium">${timeframeStats.total?.sales || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Products:</span>
                        <span className="font-medium">{timeframeStats.total?.products || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source:</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          timeframeStats.total?.hasFakeData 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {timeframeStats.total?.source || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Info */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <strong>Data Source Summary:</strong> 
                      {(timeframeStats.today?.hasFakeData || timeframeStats['7days']?.hasFakeData || 
                       timeframeStats['30days']?.hasFakeData || timeframeStats.total?.hasFakeData)
                        ? ' Some timeframes have fake data applied'
                        : ' All timeframes using real data'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last fetched: {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FontAwesomeIcon icon={faInfoCircle} className="w-8 h-8 mx-auto mb-2" />
                  <p>No timeframe statistics available. Click "Refresh" to fetch data.</p>
                </div>
              )}
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Financial Management</h3>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <FontAwesomeIcon icon={faDownload} className="w-4 h-4 mr-2" />
                  Download Report
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-lg p-4 bg-purple-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Balance</label>
                  <div className="text-2xl font-bold text-gray-900">${sellerData.financial.balance.toLocaleString()}</div>
                  <div className="mt-2 text-xs text-gray-500">Available funds</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pending Payouts</label>
                  <div className="text-2xl font-bold text-gray-900">${sellerData.financial.pendingPayouts.toLocaleString()}</div>
                  <div className="mt-2 text-xs text-gray-500">Awaiting processing</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Earnings</label>
                  <div className="text-2xl font-bold text-gray-900">${sellerData.financial.totalEarnings.toLocaleString()}</div>
                  <div className="mt-2 text-xs text-gray-500">All time earnings</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Revenue</label>
                  <div className="text-2xl font-bold text-gray-900">${sellerData.financial.monthlyRevenue.toLocaleString()}</div>
                  <div className="mt-2 text-xs text-gray-500">Current month</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-indigo-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profit Margin</label>
                  <div className="text-2xl font-bold text-gray-900">{sellerData.financial.profitMargin.toFixed(1)}%</div>
                  <div className="mt-2 text-xs text-gray-500">Average margin</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-red-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Refund Rate</label>
                  <div className="text-2xl font-bold text-gray-900">{sellerData.financial.refundRate.toFixed(1)}%</div>
                  <div className="mt-2 text-xs text-gray-500">Return rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Performance Metrics</h3>
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                  <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 mr-2" />
                  View Trends
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl font-bold text-gray-900">{sellerData.performance.rating.toFixed(1)}</div>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesomeIcon
                          key={star}
                          icon={faStar}
                          className={`w-4 h-4 ${
                            star <= sellerData.performance.rating
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Customer satisfaction</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Response Time</label>
                  <div className="text-2xl font-bold text-gray-900">{sellerData.performance.responseTime}h</div>
                  <div className="mt-2 text-xs text-gray-500">Average response</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fulfillment Rate</label>
                  <div className="text-2xl font-bold text-gray-900">{sellerData.performance.fulfillmentRate.toFixed(1)}%</div>
                  <div className="mt-2 text-xs text-gray-500">Orders fulfilled</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-red-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Return Rate</label>
                  <div className="text-2xl font-bold text-gray-900">{sellerData.performance.returnRate.toFixed(1)}%</div>
                  <div className="mt-2 text-xs text-gray-500">Products returned</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-purple-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Reviews</label>
                  <div className="text-2xl font-bold text-gray-900">{sellerData.performance.customerReviews}</div>
                  <div className="mt-2 text-xs text-gray-500">Total reviews</div>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Products ({products.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <FontAwesomeIcon icon={faBoxes} className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.product?.name || 'Unknown Product'}</div>
                              <div className="text-sm text-gray-500">{product.product?.description || 'No description'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.product?.category || 'Uncategorized'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.product?.price || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.allocatedStock || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.status || 'inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Orders ({recentOrders.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.orderNumber || order._id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.customerInfo?.name || 'Unknown Customer'}</div>
                          <div className="text-sm text-gray-500">{order.customerInfo?.email || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.total || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerDetails;
