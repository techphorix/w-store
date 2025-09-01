import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import NotificationsDropdown from '../../components/NotificationsDropdown';
import EditableMetricField from '../../components/EditableMetricField';

import OverrideErrorBanner from '../../components/OverrideErrorBanner';

import { useAuth } from '../../contexts/AuthContext';
import { useSellerData } from '../../contexts/SellerDataContext';
import { ordersApi, distributionsApi } from '../../services/api';


import {
  faGlobe,
  faChevronDown,
  faDollarSign,
  faShoppingBag,
  faChartLine,
  faUsers,
  faStore,
  faHome,
  faBoxes,
  faWallet,
  faClipboardList,
  faUserCircle,

  faUser,
  faCog,
  faSignOutAlt,
  faEye,
  faHeart,
  faStar,
  faCreditCard,

} from '@fortawesome/free-solid-svg-icons';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line } from 'react-chartjs-2';
import tiktokLogo from '../../assets/tiktok-logo.png';
import tiktokBackground from '../../assets/tiktok-background.jpg';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// Language data
const languages = [
  { code: 'EN', name: 'English' },
  { code: 'ES', name: 'Español' },
  { code: 'FR', name: 'Français' },
  { code: 'DE', name: 'Deutsch' },
  { code: 'IT', name: 'Italiano' },
  { code: 'PT', name: 'Português' },
  { code: 'RU', name: 'Русский' },
  { code: 'ZH', name: '中文' },
  { code: 'JA', name: '日本語' },
  { code: 'KO', name: '한국어' },
  { code: 'AR', name: 'العربية' },
  { code: 'HI', name: 'हिन्दी' }
];

const translations = {
  EN: {
    title: 'TIKTOK SHOP',
    subtitle: 'Dashboard',
    welcome: 'Welcome back',
    totalSales: 'Total Sales',
    totalOrders: 'Total Orders',
    totalProducts: 'Total Products',
    totalCustomers: 'Total Customers',
    todayOrdersSold: "Today's Orders Sold",
    todayTotalSales: "Today's Total Sales",
    todayProfitForecast: "Today's Profit Forecast",
    shopFollowers: 'Shop Followers',
    shopRating: 'Shop Rating',
    creditScore: 'Credit Score',
    visitorsToday: 'Visitors Today',
    visitorsLast7Days: 'Visitors Last 7 Days',
    visitors30Days: 'Visitors 30 Days',
    tabToday: 'Today',
    tabLast7Days: 'Last 7 Days',
    tabLast30Days: 'Last 30 Days',
    tabTotal: 'Total',
    ordersSold: 'Orders Sold',
    profitForecast: 'Profit Forecast',
    visitors: 'Visitors',
    salesChart: 'Sales Overview',
    recentOrders: 'Recent Orders',
    quickActions: 'Quick Actions',
    home: 'Home',
    products: 'Products',
    financialManagement: 'Financial Management',
    orders: 'Orders',
    profile: 'Profile',
    orderNumber: 'Order #',
    customer: 'Customer',
    amount: 'Amount',
    status: 'Status',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    notifications: 'Notifications',
    settings: 'Settings',
    logout: 'Logout'
  },
  ES: {
    title: 'TIENDA TIKTOK',
    subtitle: 'Panel de Control',
    welcome: 'Bienvenido de vuelta',
    totalSales: 'Ventas Totales',
    totalOrders: 'Pedidos Totales',
    totalProducts: 'Productos Totales',
    totalCustomers: 'Clientes Totales',
    todayOrdersSold: 'Pedidos Vendidos Hoy',
    todayTotalSales: 'Ventas Totales de Hoy',
    todayProfitForecast: 'Pronóstico de Ganancias de Hoy',
    shopFollowers: 'Seguidores de la Tienda',
    shopRating: 'Calificación de la Tienda',
    creditScore: 'Puntuación de Crédito',
    visitorsToday: 'Visitantes Hoy',
    visitorsLast7Days: 'Visitantes Últimos 7 Días',
    visitors30Days: 'Visitantes 30 Días',
    tabToday: 'Hoy',
    tabLast7Days: 'Últimos 7 Días',
    tabLast30Days: 'Últimos 30 Días',
    tabTotal: 'Total',
    ordersSold: 'Pedidos Vendidos',
    profitForecast: 'Pronóstico de Ganancias',
    visitors: 'Visitantes',
    salesChart: 'Resumen de Ventas',
    recentOrders: 'Pedidos Recientes',
    quickActions: 'Acciones Rápidas',
    home: 'Inicio',
    products: 'Productos',
    financialManagement: 'Gestión Financiera',
    orders: 'Pedidos',
    profile: 'Perfil',
    orderNumber: 'Pedido #',
    customer: 'Cliente',
    amount: 'Cantidad',
    status: 'Estado',
    pending: 'Pendiente',
    completed: 'Completado',
    cancelled: 'Cancelado',
    notifications: 'Notificaciones',
    settings: 'Configuración',
    logout: 'Cerrar Sesión'
  },
  ZH: {
    title: 'TIKTOK商店',
    subtitle: '仪表板',
    welcome: '欢迎回来',
    totalSales: '总销售额',
    totalOrders: '总订单数',
    totalProducts: '总产品数',
    totalCustomers: '总客户数',
    todayOrdersSold: '今日订单销售',
    todayTotalSales: '今日总销售额',
    todayProfitForecast: '今日利润预测',
    shopFollowers: '店铺粉丝',
    shopRating: '店铺评分',
    creditScore: '信用评分',
    visitorsToday: '今日访客',
    visitorsLast7Days: '最近7天访客',
    visitors30Days: '30天访客',
    tabToday: '今日',
    tabLast7Days: '最近7天',
    tabLast30Days: '最近30天',
    tabTotal: '总计',
    ordersSold: '订单销售',
    profitForecast: '利润预测',
    visitors: '访客',
    salesChart: '销售概览',
    recentOrders: '最近订单',
    quickActions: '快速操作',
    home: '首页',
    products: '产品',
    financialManagement: '财务管理',
    orders: '订单',
    profile: '个人资料',
    orderNumber: '订单 #',
    customer: '客户',
    amount: '金额',
    status: '状态',
    pending: '待处理',
    completed: '已完成',
    cancelled: '已取消',
    notifications: '通知',
    settings: '设置',
    logout: '退出登录'
  }
};

interface TimeBasedStats {
  ordersSold: number;
  totalSales: number;
  profitForecast: number;
  visitors: number;
}

interface DashboardStats {
  today: TimeBasedStats;
  last7Days: TimeBasedStats;
  last30Days: TimeBasedStats;
  total: {
    sales: number;
    orders: number;
    products: number;
    customers: number;
    visitors: number;
  };
  // Static metrics that don't change by time period
  shopFollowers: number;
  shopRating: number;
  creditScore: number;
}

interface Order {
  id: string;
  customer: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
  date: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isImpersonating, originalUser, hasAdminPrivileges } = useAuth();
  const { shopname } = useParams<{ shopname: string }>();
  
  // Helper function to clean shopname (remove extra @ symbols)
  const cleanShopname = (name: string) => {
    return name ? name.replace(/^@+/, '') : name;
  };
  
  // Fallback shopname if not provided in URL
  const rawShopname = shopname || user?.businessInfo?.storeName || user?.fullName || 'default';
  const effectiveShopname = cleanShopname(rawShopname);

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations] || translations.EN;
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'today' | 'last7Days' | 'last30Days' | 'total'>('today');
  
  // Loading and error state - use centralized data from SellerDataContext
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Use centralized seller data
  const { 
    stats, 
    isLoading: sellerDataLoading, 
    error: sellerDataError,
    overrideError,
    refreshData,
    clearOverrideError
  } = useSellerData();
  

  
  // Dashboard state - derived from centralized data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    today: {
      ordersSold: 0,
      totalSales: 0,
      profitForecast: 0,
      visitors: 0
    },
    last7Days: {
      ordersSold: 0,
      totalSales: 0,
      profitForecast: 0,
      visitors: 0
    },
    last30Days: {
      ordersSold: 0,
      totalSales: 0,
      profitForecast: 0,
      visitors: 0
    },
    total: {
      sales: 0,
      orders: 0,
      products: 0,
      customers: 0,
      visitors: 0
    },
    shopFollowers: 100,
    shopRating: 4.5,
    creditScore: 750
  });

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Update dashboard stats when centralized stats change
  useEffect(() => {
    if (!stats) return; // Safety check - don't update if stats is undefined
    
    console.log('📊 Dashboard: centralized stats updated:', stats);
    setDashboardStats(prev => {
      const newStats = {
        ...prev,
        today: {
          ordersSold: stats.ordersSold || 0,
          totalSales: stats.totalSales || 0,
          profitForecast: stats.profitForecast || 0,
          visitors: stats.visitors || 0
        },
        last7Days: {
          ordersSold: stats.last7DaysOrders || 0,
          totalSales: stats.last7DaysSales || 0,
          profitForecast: stats.last7DaysSales ? stats.last7DaysSales * 0.2 : 0,
          visitors: stats.last7DaysOrders ? stats.last7DaysOrders * 8 : 0
        },
        last30Days: {
          ordersSold: stats.last30DaysOrders || 0,
          totalSales: stats.last30DaysSales || 0,
          profitForecast: stats.last30DaysSales ? stats.last30DaysSales * 0.2 : 0,
          visitors: stats.last30DaysOrders ? stats.last30DaysOrders * 8 : 0
        },
        total: {
          sales: stats.totalSales || 0,
          orders: stats.ordersSold || 0,
          products: stats.totalProducts || 0,
          customers: stats.totalCustomers || 0,
          visitors: stats.visitors || 0
        },
        shopFollowers: stats.shopFollowers || 100,
        shopRating: stats.shopRating || 4.5,
        creditScore: stats.creditScore || 750
      };
      console.log('📊 Dashboard: dashboardStats updated:', { prev, new: newStats });
      return newStats;
    });
  }, [stats]);





  // Simple data loading - data is already loaded by SellerDataContext
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Data is already loaded by SellerDataContext, just mark as complete
    setInitialLoadComplete(true);
  }, [isAuthenticated, user, navigate]);

  // Check if fake data is active
  const [fakeDataActive, setFakeDataActive] = useState(false);
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('adminEditedAnalytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        setFakeDataActive(parsed.adminEdited && parsed.stats?.totalSales > 0);
        console.log('🎭 Dashboard: Fake data status:', { 
          adminEdited: parsed.adminEdited, 
          totalSales: parsed.stats?.totalSales,
          isActive: parsed.adminEdited && parsed.stats?.totalSales > 0 
        });
      }
    } catch (e) {
      console.warn('Failed to check fake data status:', e);
    }
  }, []);

  // Debug: Log centralized stats changes
  useEffect(() => {
    if (!stats) return; // Safety check - don't log if stats is undefined
    
    console.log('🎭 Dashboard: centralized stats updated:', {
      totalSales: stats.totalSales,
      totalOrders: stats.ordersSold,
      products: stats.totalProducts,
      customers: stats.totalCustomers,
      todaySales: stats.totalSales,
      todayOrders: stats.ordersSold
    });
  }, [stats]);


  // Chart data
  const salesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Sales',
        data: [12000, 19000, 15000, 25000, 22000, 30000],
        borderColor: 'rgb(0, 0, 0)',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

      // Add authentication check useEffect
    useEffect(() => {
      if (!sellerDataLoading && !isAuthenticated) {
        console.log('🚪 Not authenticated, redirecting to login...');
        navigate('/login');
      }
    }, [isAuthenticated, sellerDataLoading, navigate]);
  
      // Don't render anything if not authenticated
  if (!isAuthenticated && !sellerDataLoading) {
    return null;
  }

  // Don't render if stats is not loaded yet
  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Loading state - show loading spinner like Products page
  if (sellerDataLoading || !initialLoadComplete) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* TikTok Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${tiktokBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
        
        {/* Optional overlay for better content readability */}
        <div className="absolute inset-0 bg-black bg-opacity-5"></div>

        {/* Loading spinner in center */}
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (sellerDataError || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{sellerDataError || error || 'Failed to load dashboard data. Please try again.'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get the current timeframe data based on activeTab
  const getCurrentTimeframeData = () => {
    switch (activeTab) {
      case 'today':
        return {
          ordersSold: dashboardStats.today.ordersSold,
          totalSales: dashboardStats.today.totalSales,
          profitForecast: dashboardStats.today.profitForecast,
          visitors: dashboardStats.today.visitors
        };
      case 'last7Days':
        return {
          ordersSold: dashboardStats.last7Days.ordersSold,
          totalSales: dashboardStats.last7Days.totalSales,
          profitForecast: dashboardStats.last7Days.profitForecast,
          visitors: dashboardStats.last7Days.visitors
        };
      case 'last30Days':
        return {
          ordersSold: dashboardStats.last30Days.ordersSold,
          totalSales: dashboardStats.last30Days.totalSales,
          profitForecast: dashboardStats.last30Days.profitForecast,
          visitors: dashboardStats.last30Days.visitors
        };
      case 'total':
        return {
          ordersSold: dashboardStats.total.orders,
          totalSales: dashboardStats.total.sales,
          profitForecast: dashboardStats.total.sales * 0.2, // 20% margin estimate
          visitors: dashboardStats.total.visitors
        };
              default:
          return dashboardStats.today;
    }
  };

  const currentTimeframeData = getCurrentTimeframeData();

  // Helper function to get the current value for a specific metric
  const getCurrentMetricValue = (metricName: string) => {
    // If we have the new metrics structure from the backend, use it
    if (stats?.metrics) {
      const periodKey = activeTab === 'today' ? 'today' : 
                       activeTab === 'last7Days' ? 'last7days' : 
                       activeTab === 'last30Days' ? 'last30days' : 'total';
      
      return stats.metrics[metricName]?.[periodKey] || 0;
    }
    
    // Fallback to dashboard stats
    switch (metricName) {
      case 'orders_sold':
        return currentTimeframeData.ordersSold;
      case 'total_sales':
        return currentTimeframeData.totalSales;
      case 'profit_forecast':
        return currentTimeframeData.profitForecast;
      case 'visitors':
        return currentTimeframeData.visitors;
      case 'shop_followers':
        return stats?.shopFollowers || 100;
      case 'shop_rating':
        return stats?.shopRating || 4.5;
      case 'credit_score':
        return stats?.creditScore || 750;
      case 'total_customers':
        return stats?.totalCustomers || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fake Data Banner */}
      {fakeDataActive && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <span className="text-yellow-800 text-sm font-medium">
                🎭 Demo Mode Active: You are viewing demo data set by an admin
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('adminEditedAnalytics');
                  localStorage.removeItem('sellerMockData');
                  setFakeDataActive(false);
                  window.location.reload();
                }}
                className="ml-3 px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
              >
                Exit Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TikTok Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${tiktokBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>
      
      {/* Optional overlay for better content readability */}
      <div className="absolute inset-0 bg-black bg-opacity-5"></div>

      {/* Header */}
      <div className="relative z-10">
        <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Title */}
              <div className="flex items-center">
                <img src={tiktokLogo} alt="TikTok Logo" className="w-10 h-10 mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{currentLang.title}</h1>
                  <p className="text-sm text-gray-600">{currentLang.subtitle}</p>
                </div>
              </div>

              {/* Right side - Language, Notifications, Profile */}
              <div className="flex items-center space-x-4">
                {/* Language Converter */}
                <div className="relative">
                  <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1">
                    <FontAwesomeIcon icon={faGlobe} className="w-4 h-4 text-black mr-2" />
                    <select
                      value={currentLanguage}
                      onChange={(e) => setCurrentLanguage(e.target.value)}
                      className="appearance-none bg-transparent text-sm font-medium text-gray-900 cursor-pointer outline-none pr-4"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-black" />
                  </div>
                </div>

                {/* Notifications */}
                <NotificationsDropdown />

                {/* Profile Menu */}
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => navigate('/profile')}
                    className="flex items-center space-x-2 p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FontAwesomeIcon icon={faUser} className="w-5 h-5" />
                    <span className="text-sm font-medium">{currentLang.profile}</span>
                  </button>
                  
                  <button 
                    onClick={() => navigate('/settings')}
                    className="p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FontAwesomeIcon icon={faCog} className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentLang.welcome}!</h2>
            <p className="text-gray-600">Here's what's happening with your TikTok Shop today.</p>
          </div>

          {/* Override Error Banner */}
          {overrideError && (
            <OverrideErrorBanner
              error={overrideError}
              sellerId={user?._id}
              onRetry={() => {
                // Refresh the data to retry
                refreshData();
              }}
              onDismiss={() => {
                // Clear the error
                clearOverrideError();
              }}
            />
          )}



          {/* Tab Navigation */}
          <div className="mb-8 flex justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-gray-200 inline-flex">
              <button
                onClick={() => setActiveTab('today')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'today'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {currentLang.tabToday}
              </button>
              <button
                onClick={() => setActiveTab('last7Days')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'last7Days'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {currentLang.tabLast7Days}
              </button>
              <button
                onClick={() => setActiveTab('last30Days')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'last30Days'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {currentLang.tabLast30Days}
              </button>
              <button
                onClick={() => setActiveTab('total')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'total'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {currentLang.tabTotal}
              </button>
                      </div>
        </div>



        {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {/* Core metrics that can be overridden by admin - always shown */}
            {/* Orders Sold */}
            <EditableMetricField
              sellerId={user?._id || ''}
              metricName="orders_sold"
              currentValue={getCurrentMetricValue('orders_sold')}
              originalValue={getCurrentMetricValue('orders_sold')}
              label={currentLang.ordersSold}
              format="number"
              isAdmin={hasAdminPrivileges}
              period={activeTab === 'today' ? 'today' : activeTab === 'last7Days' ? 'last7days' : activeTab === 'last30Days' ? 'last30days' : 'total'}
              onValueChange={(newValue) => {
                // Update both local and centralized stats
                setDashboardStats(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], ordersSold: newValue } }));
              }}
            />

            {/* Total Sales */}
            <EditableMetricField
              sellerId={user?._id || ''}
              metricName="total_sales"
              currentValue={getCurrentMetricValue('total_sales')}
              originalValue={getCurrentMetricValue('total_sales')}
              label={currentLang.totalSales}
              format="currency"
              isAdmin={hasAdminPrivileges}
              period={activeTab === 'today' ? 'today' : activeTab === 'last7Days' ? 'last7days' : activeTab === 'last30Days' ? 'last30days' : 'total'}
              onValueChange={(newValue) => {
                // Update both local and centralized stats
                setDashboardStats(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], totalSales: newValue } }));
              }}
            />

            {/* Profit Forecast */}
            <EditableMetricField
              sellerId={user?._id || ''}
              metricName="profit_forecast"
              currentValue={getCurrentMetricValue('profit_forecast')}
              originalValue={getCurrentMetricValue('profit_forecast')}
              label={currentLang.profitForecast}
              format="currency"
              isAdmin={hasAdminPrivileges}
              period={activeTab === 'today' ? 'today' : activeTab === 'last7Days' ? 'last7days' : activeTab === 'last30Days' ? 'last30days' : 'total'}
              onValueChange={(newValue) => {
                // Update both local and centralized stats
                setDashboardStats(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], profitForecast: newValue } }));
              }}
            />

            {/* Visitors */}
            <EditableMetricField
              sellerId={user?._id || ''}
              metricName="visitors"
              currentValue={getCurrentMetricValue('visitors')}
              originalValue={getCurrentMetricValue('visitors')}
              label={currentLang.visitors}
              format="number"
              isAdmin={hasAdminPrivileges}
              period={activeTab === 'today' ? 'today' : activeTab === 'last7Days' ? 'last7days' : activeTab === 'last30Days' ? 'last30days' : 'total'}
              onValueChange={(newValue) => {
                // Update both local and centralized stats
                setDashboardStats(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], visitors: newValue } }));
              }}
            />

            {/* Total metrics */}
            {activeTab === 'total' && (
              <>
                {/* Total Customers - editable for admin to trigger generation */}
                <EditableMetricField
                  sellerId={user?._id || ''}
                  metricName="total_customers"
                  currentValue={getCurrentMetricValue('total_customers')}
                  originalValue={getCurrentMetricValue('total_customers')}
                  label={currentLang.totalCustomers}
                  format="number"
                  isAdmin={hasAdminPrivileges}
                  period="total"
                  onValueChange={(newValue) => {
                    setDashboardStats(prev => ({
                      ...prev,
                      total: { ...prev.total, customers: newValue }
                    }));
                  }}
                />
              </>
            )}

            {/* Static metrics - always shown */}
            <EditableMetricField
              sellerId={user?._id || ''}
              metricName="shop_followers"
              currentValue={getCurrentMetricValue('shop_followers')}
              originalValue={getCurrentMetricValue('shop_followers')}
              label={currentLang.shopFollowers}
              format="number"
              isAdmin={hasAdminPrivileges}
              period={activeTab === 'today' ? 'today' : activeTab === 'last7Days' ? 'last7days' : activeTab === 'last30Days' ? 'last30days' : 'total'}
              onValueChange={(newValue) => {
                // Update both local and centralized stats
                setDashboardStats(prev => ({ ...prev, shopFollowers: newValue }));
              }}
            />

            <EditableMetricField
              sellerId={user?._id || ''}
              metricName="shop_rating"
              currentValue={getCurrentMetricValue('shop_rating')}
              originalValue={getCurrentMetricValue('shop_rating')}
              label={currentLang.shopRating}
              format="rating"
              isAdmin={hasAdminPrivileges}
              period={activeTab === 'today' ? 'today' : activeTab === 'last7Days' ? 'last7days' : activeTab === 'last30Days' ? 'last30days' : 'total'}
              onValueChange={(newValue) => {
                // Update both local and centralized stats
                setDashboardStats(prev => ({ ...prev, shopRating: newValue }));
              }}
            />

            <EditableMetricField
              sellerId={user?._id || ''}
              metricName="credit_score"
              currentValue={getCurrentMetricValue('credit_score')}
              originalValue={getCurrentMetricValue('credit_score')}
              label={currentLang.creditScore}
              format="number"
              isAdmin={hasAdminPrivileges}
              period={activeTab === 'today' ? 'today' : activeTab === 'last7Days' ? 'last7days' : activeTab === 'last30Days' ? 'last30days' : 'total'}
              onValueChange={(newValue) => {
                // Update both local and centralized stats
                setDashboardStats(prev => ({ ...prev, creditScore: newValue }));
              }}
            />
          </div>

          {/* Charts and Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Sales Chart */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{currentLang.salesChart}</h3>
              <Line data={salesData} options={chartOptions} />
            </div>

            {/* Recent Orders */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{currentLang.recentOrders}</h3>
                <Link
                  to={`/orders/${effectiveShopname}`}
                  className="text-sm text-gray-600 hover:text-black transition-colors font-medium"
                >
                  View All →
                </Link>
              </div>
              <div className="space-y-4">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{currentLang.orderNumber}{order.id}</p>
                        <p className="text-sm text-gray-600">{order.customer}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${order.amount}</p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {currentLang[order.status as keyof typeof currentLang] || order.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FontAwesomeIcon icon={faShoppingBag} className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">No recent orders found</p>
                    <p className="text-sm text-gray-400">Orders will appear here once you make sales</p>
                  </div>
                )}
              </div>
            </div>
          </div>




                
                
                


          {/* Quick Actions */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">{currentLang.quickActions}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Link
                to={`/shop/${effectiveShopname}`}
                className="flex items-center justify-center p-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <FontAwesomeIcon icon={faHome} className="mr-2" />
                {currentLang.home}
              </Link>
              
              <Link
                to={`/products/${effectiveShopname}`}
                className="flex items-center justify-center p-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FontAwesomeIcon icon={faBoxes} className="mr-2" />
                {currentLang.products}
              </Link>
              
              <Link
                to={`/shop-management/${effectiveShopname}`}
                className="flex items-center justify-center p-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FontAwesomeIcon icon={faStore} className="mr-2" />
                Shop
              </Link>
              
              <Link
                to={`/financial/${effectiveShopname}`}
                className="flex items-center justify-center p-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FontAwesomeIcon icon={faWallet} className="mr-2" />
                Financial
              </Link>
              
              <Link
                to={`/orders/${effectiveShopname}`}
                className="flex items-center justify-center p-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FontAwesomeIcon icon={faClipboardList} className="mr-2" />
                {currentLang.orders}
              </Link>
              
              <Link
                to={`/my/${effectiveShopname}`}
                className="flex items-center justify-center p-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FontAwesomeIcon icon={faUserCircle} className="mr-2" />
                {currentLang.profile}
              </Link>
            </div>
          </div>
        </main>
      </div>
      

    </div>
  );
};

export default Dashboard;
