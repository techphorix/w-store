import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  faUsers,
  faBoxes,
  faShoppingCart,
  faDollarSign,
  faChartLine,
  faStore,
  faStar,
  faCheckCircle,
  faExclamationTriangle,
  faBan,
  faArrowUp,
  faArrowDown,
  faMinus,
  faUserShield,
  faCalendarAlt,
  faPercent,
  faHeart,
  faShare,
  faSpinner,
  faGlobe,
  faChevronDown,
  faBell,
  faUser,
  faCog,
  faSignOutAlt,
  faEye,
  faEdit,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Language data
const languages = [
  { code: 'EN', name: 'English' },
  { code: 'ES', name: 'Español' },
  { code: 'ZH', name: '中文' }
];

const translations = {
  EN: {
    title: 'TIKTOK SHOP ADMIN',
    subtitle: 'System Analytics Dashboard',
    overview: 'System Overview',
    totalUsers: 'Total Users',
    totalShops: 'Total Shops',
    totalSales: 'Total Sales',
    totalOrders: 'Total Orders',
    activeUsers: 'Active Users',
    activeShops: 'Active Shops',
    pendingApprovals: 'Pending Approvals',
    featuredShops: 'Featured Shops',
    recentActivity: 'Recent Activity',
    topPerformers: 'Top Performing Shops',
    userGrowth: 'User Growth',
    salesAnalytics: 'Sales Analytics',
    shopCategories: 'Shop Categories',
    systemHealth: 'System Health',
    quickActions: 'Quick Actions',
    manageUsers: 'Manage Users',
    manageShops: 'Manage Shops',
    viewAnalytics: 'View Analytics',
    systemSettings: 'System Settings',
    // Stats
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    growth: 'Growth',
    revenue: 'Revenue',
    orders: 'Orders',
    users: 'Users',
    shops: 'Shops',
    // Chart labels
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
    jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
    // Categories
    electronics: 'Electronics',
    fashion: 'Fashion',
    sports: 'Sports & Fitness',
    home: 'Home & Garden',
    beauty: 'Beauty',
    books: 'Books',
    lifestyle: 'Lifestyle',
    // Status
    online: 'Online',
    offline: 'Offline',
    maintenance: 'Maintenance',
    // Time periods
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year'
  },
  ES: {
    title: 'ADMIN TIENDA TIKTOK',
    subtitle: 'Panel de Análisis del Sistema',
    overview: 'Resumen del Sistema',
    totalUsers: 'Total de Usuarios',
    totalShops: 'Total de Tiendas',
    totalSales: 'Ventas Totales',
    totalOrders: 'Pedidos Totales',
    activeUsers: 'Usuarios Activos',
    activeShops: 'Tiendas Activas',
    pendingApprovals: 'Aprobaciones Pendientes',
    featuredShops: 'Tiendas Destacadas',
    recentActivity: 'Actividad Reciente',
    topPerformers: 'Mejores Tiendas',
    userGrowth: 'Crecimiento de Usuarios',
    salesAnalytics: 'Análisis de Ventas',
    shopCategories: 'Categorías de Tiendas',
    systemHealth: 'Estado del Sistema',
    quickActions: 'Acciones Rápidas',
    manageUsers: 'Gestionar Usuarios',
    manageShops: 'Gestionar Tiendas',
    viewAnalytics: 'Ver Análisis',
    systemSettings: 'Configuración del Sistema'
  }
};

interface SystemStats {
  totalUsers: number;
  totalShops: number;
  totalSales: number;
  totalOrders: number;
  activeUsers: number;
  activeShops: number;
  pendingApprovals: number;
  featuredShops: number;
  // Growth metrics
  userGrowth: number;
  shopGrowth: number;
  salesGrowth: number;
  orderGrowth: number;
}

interface TopShop {
  id: string;
  name: string;
  owner: string;
  sales: number;
  orders: number;
  rating: number;
  category: string;
  logo: string;
}

interface RecentActivity {
  id: string;
  type: 'user_registered' | 'shop_created' | 'order_placed' | 'shop_approved';
  description: string;
  timestamp: string;
  user?: string;
  shop?: string;
}

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations] || translations.EN;

  // State
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    totalShops: 0,
    totalSales: 0,
    totalOrders: 0,
    activeUsers: 0,
    activeShops: 0,
    pendingApprovals: 0,
    featuredShops: 0,
    userGrowth: 0,
    shopGrowth: 0,
    salesGrowth: 0,
    orderGrowth: 0
  });
  
  const [topShops, setTopShops] = useState<TopShop[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Chart data state
  const [salesChartData, setSalesChartData] = useState({
    labels: [],
    datasets: []
  });

  const [userGrowthData, setUserGrowthData] = useState({
    labels: [],
    datasets: []
  });

  const [categoryData, setCategoryData] = useState({
    labels: [],
    datasets: []
  });

  // Fetch system data from backend APIs
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchSystemData();
    }
  }, [selectedPeriod, isAuthenticated, user]);

  const fetchSystemData = async () => {
    // Declare response variables outside try block to avoid ReferenceError
    let analyticsResponse: any = null;
    let usersResponse: any = null;
    let shopsResponse: any = null;
    let ordersResponse: any = null;
    let financialResponse: any = null;

    try {
      setLoading(true);
      setError(null);

      // Fetch analytics data
      analyticsResponse = await adminApi.getAnalytics({ period: selectedPeriod });
      
      // Fetch users data
      usersResponse = await adminApi.getUsers({ limit: 1000 });
      
      // Fetch shops data
      shopsResponse = await adminApi.getShops({ limit: 1000 });
      
      // Fetch orders data
      ordersResponse = await adminApi.getOrders({ limit: 1000 });
      
      // Fetch financial data
      financialResponse = await adminApi.getFinancialReports({ period: selectedPeriod });

      // Calculate real system stats with fallbacks
      const totalUsers = usersResponse.users?.length || 0;
      const totalShops = shopsResponse.shops?.length || 0;
      const totalOrders = ordersResponse.orders?.length || 0;
      const totalSales = financialResponse.totalRevenue || 0;
      
      // Calculate active users (users with recent activity) - handle missing fields gracefully
      const activeUsers = usersResponse.users?.filter((user: any) => 
        user.isActive && (user.lastLoginAt || user.lastLogin) && 
        new Date(user.lastLoginAt || user.lastLogin) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length || 0;
      
      // Calculate active shops - handle missing fields gracefully
      const activeShops = shopsResponse.shops?.filter((shop: any) => 
        (shop.status === 'active' || shop.isActive) && shop.isActive !== false
      ).length || 0;
      
      // Calculate pending approvals - handle missing fields gracefully
      const pendingApprovals = shopsResponse.shops?.filter((shop: any) => 
        shop.status === 'pending' || shop.approvalStatus === 'pending'
      ).length || 0;
      
      // Calculate featured shops - handle missing fields gracefully
      const featuredShops = shopsResponse.shops?.filter((shop: any) => 
        shop.isFeatured || shop.featured === true
      ).length || 0;

      // Set system stats
      const stats = {
        totalUsers,
        totalShops,
        totalSales,
        totalOrders,
        activeUsers,
        activeShops,
        pendingApprovals,
        featuredShops,
        userGrowth: analyticsResponse.sellerGrowth?.growth || 0,
        shopGrowth: analyticsResponse.sellerGrowth?.shopGrowth || 0,
        salesGrowth: analyticsResponse.revenue?.growth || 0,
        orderGrowth: analyticsResponse.orders?.growth || 0
      };
      
      console.log('Setting system stats:', stats);
      setSystemStats(stats);

      // Transform top shops data from analytics
      if (analyticsResponse.topSellers) {
        const transformedTopShops = analyticsResponse.topSellers.slice(0, 3).map((seller: any, index: number) => ({
          id: seller._id || `shop-${index}`,
          name: seller.seller?.businessInfo?.storeName || 'Unknown Shop',
          owner: seller.seller?.fullName || 'Unknown Owner',
          sales: seller.totalSales || 0,
          orders: seller.productsSold || 0,
          rating: seller.rating || 4.0,
          category: seller.category || 'General',
          logo: seller.logo || 'https://via.placeholder.com/50'
        }));
        setTopShops(transformedTopShops);
      }

      // Transform recent activity from multiple sources
      const activity: RecentActivity[] = [];
      
      // Add recent orders
      if (ordersResponse.orders) {
        ordersResponse.orders.slice(0, 2).forEach((order: any) => {
          activity.push({
            id: `order-${order._id}`,
            type: 'order_placed',
            description: `Order #${order.orderNumber || order._id} placed in ${order.shop?.storeName || 'Unknown Shop'}`,
            timestamp: order.createdAt,
            shop: order.shop?.storeName
          });
        });
      }
      
      // Add recent user registrations
      if (usersResponse.users) {
        usersResponse.users.slice(0, 1).forEach((user: any) => {
          activity.push({
            id: `user-${user._id}`,
            type: 'user_registered',
            description: `New user ${user.fullName} registered`,
            timestamp: user.createdAt,
            user: user.fullName
          });
        });
      }
      
      // Add recent shop activities
      if (shopsResponse.shops) {
        shopsResponse.shops.slice(0, 1).forEach((shop: any) => {
          if (shop.status === 'active') {
            activity.push({
              id: `shop-${shop._id}`,
              type: 'shop_approved',
              description: `Shop "${shop.storeName}" approved`,
              timestamp: shop.updatedAt,
              shop: shop.storeName
            });
          }
        });
      }
      
      setRecentActivity(activity);

      // Transform chart data from analytics
      if (analyticsResponse.revenue) {
        setSalesChartData({
          labels: analyticsResponse.revenue.labels || [],
          datasets: [{
            label: 'Sales ($)',
            data: analyticsResponse.revenue.platform || [],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1
          }]
        });
      }

      if (analyticsResponse.sellerGrowth) {
        setUserGrowthData({
          labels: analyticsResponse.sellerGrowth.labels || [],
          datasets: [
            {
              label: 'New Users',
              data: analyticsResponse.sellerGrowth.new || [],
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
            },
            {
              label: 'New Shops',
              data: analyticsResponse.sellerGrowth.active || [],
              backgroundColor: 'rgba(168, 85, 247, 0.8)',
            }
          ]
        });
      }

      if (analyticsResponse.categories) {
        setCategoryData({
          labels: analyticsResponse.categories.labels || [],
          datasets: [{
            data: analyticsResponse.categories.data || [],
            backgroundColor: [
              '#3B82F6',
              '#EF4444',
              '#10B981',
              '#F59E0B',
              '#8B5CF6',
              '#06B6D4',
              '#84CC16'
            ]
          }]
        });
      }

    } catch (error) {
      console.error('Error fetching system data:', error);
      console.log('API Responses:', {
        analytics: analyticsResponse,
        users: usersResponse,
        shops: shopsResponse,
        orders: ordersResponse,
        financial: financialResponse
      });
      setError('Failed to load system data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return faArrowUp;
    if (growth < 0) return faArrowDown;
    return faMinus;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registered': return faUsers;
      case 'shop_created': return faStore;
      case 'order_placed': return faShoppingCart;
      case 'shop_approved': return faCheckCircle;
      default: return faBell;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_registered': return 'text-blue-600';
      case 'shop_created': return 'text-purple-600';
      case 'order_placed': return 'text-green-600';
      case 'shop_approved': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-600 mb-4" />
            <p className="text-gray-600">Access denied. Admin privileges required.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout 
        title={currentLang.title}
        subtitle={currentLang.subtitle}
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-600 mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchSystemData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title={currentLang.title}
      subtitle={currentLang.subtitle}
    >
      {/* Period Selector - moved to top of content */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentLang.overview}</h2>
          <p className="text-gray-600">Complete system analytics and performance metrics</p>
        </div>
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-900 cursor-pointer outline-none"
          >
            <option value="today">{currentLang.today}</option>
            <option value="week">{currentLang.week}</option>
            <option value="month">{currentLang.month}</option>
            <option value="year">{currentLang.year}</option>
          </select>
          <FontAwesomeIcon icon={faChevronDown} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading system data...</p>
        </div>
      ) : (
        <>
          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.totalUsers}</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getGrowthIcon(systemStats.userGrowth)} 
                      className={`w-3 h-3 mr-1 ${getGrowthColor(systemStats.userGrowth)}`} 
                    />
                    <span className={`text-sm font-medium ${getGrowthColor(systemStats.userGrowth)}`}>
                      {Math.abs(systemStats.userGrowth)}%
                    </span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.totalShops}</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalShops.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getGrowthIcon(systemStats.shopGrowth)} 
                      className={`w-3 h-3 mr-1 ${getGrowthColor(systemStats.shopGrowth)}`} 
                    />
                    <span className={`text-sm font-medium ${getGrowthColor(systemStats.shopGrowth)}`}>
                      {Math.abs(systemStats.shopGrowth)}%
                    </span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faStore} className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.totalSales}</p>
                  <p className="text-2xl font-bold text-gray-900">${systemStats.totalSales.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getGrowthIcon(systemStats.salesGrowth)} 
                      className={`w-3 h-3 mr-1 ${getGrowthColor(systemStats.salesGrowth)}`} 
                    />
                    <span className={`text-sm font-medium ${getGrowthColor(systemStats.salesGrowth)}`}>
                      {Math.abs(systemStats.salesGrowth)}%
                    </span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faDollarSign} className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.totalOrders}</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalOrders.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getGrowthIcon(systemStats.orderGrowth)} 
                      className={`w-3 h-3 mr-1 ${getGrowthColor(systemStats.orderGrowth)}`} 
                    />
                    <span className={`text-sm font-medium ${getGrowthColor(systemStats.orderGrowth)}`}>
                      {Math.abs(systemStats.orderGrowth)}%
                    </span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faShoppingCart} className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Secondary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.activeUsers}</p>
                  <p className="text-2xl font-bold text-green-600">{systemStats.activeUsers.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Currently active</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.activeShops}</p>
                  <p className="text-2xl font-bold text-purple-600">{systemStats.activeShops.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Currently active</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faStore} className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.pendingApprovals}</p>
                  <p className="text-2xl font-bold text-yellow-600">{systemStats.pendingApprovals.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 mr-1 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-600">Requires attention</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.featuredShops}</p>
                  <p className="text-2xl font-bold text-blue-600">{systemStats.featuredShops.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon icon={faStar} className="w-3 h-3 mr-1 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Featured</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faStar} className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentLang.salesAnalytics}</h3>
              {salesChartData.labels.length > 0 ? (
                <Line data={salesChartData} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <FontAwesomeIcon icon={faChartLine} className="text-4xl mb-2" />
                    <p>No sales data available</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentLang.userGrowth}</h3>
              {userGrowthData.labels.length > 0 ? (
                <Bar data={userGrowthData} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <FontAwesomeIcon icon={faUsers} className="text-4xl mb-2" />
                    <p>No user growth data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Category Distribution */}
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentLang.shopCategories}</h3>
              {categoryData.labels.length > 0 ? (
                <Doughnut data={categoryData} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <FontAwesomeIcon icon={faStore} className="text-4xl mb-2" />
                    <p>No category data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Top Performing Shops */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{currentLang.topPerformers}</h3>
                <Link to="/admin/shops" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                {topShops.length > 0 ? (
                  topShops.map((shop) => (
                    <div key={shop.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <FontAwesomeIcon icon={faStore} className="text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{shop.name}</h4>
                        <p className="text-sm text-gray-600">{shop.category} • {shop.owner}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${shop.sales.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{shop.orders} orders • {shop.rating}★</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faStore} className="text-2xl mb-2" />
                    <p>No shop performance data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{currentLang.recentActivity}</h3>
              <Link to="/admin/analytics" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-100`}>
                      <FontAwesomeIcon 
                        icon={getActivityIcon(activity.type)} 
                        className={`text-sm ${getActivityColor(activity.type)}`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl mb-2" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentLang.quickActions}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/admin/users" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <FontAwesomeIcon icon={faUsers} className="text-blue-600 mr-2" />
                <span className="font-medium text-gray-700">{currentLang.manageUsers}</span>
              </Link>
              
              <Link to="/admin/shops" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                <FontAwesomeIcon icon={faStore} className="text-green-600 mr-2" />
                <span className="font-medium text-gray-700">{currentLang.manageShops}</span>
              </Link>
              
              <Link to="/admin/analytics" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
                <FontAwesomeIcon icon={faChartLine} className="text-purple-600 mr-2" />
                <span className="font-medium text-gray-700">{currentLang.viewAnalytics}</span>
              </Link>
              
              <Link to="/admin/settings" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
                <FontAwesomeIcon icon={faCog} className="text-orange-600 mr-2" />
                <span className="text-gray-700 font-medium">{currentLang.systemSettings}</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;