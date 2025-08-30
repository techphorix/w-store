import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, 
  faShoppingBag, 
  faDollarSign,
  faChartLine,
  faPlus,
  faEdit,
  faTrash,
  faStore,
  faArrowUp,
  faArrowDown,
  faMinus,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faBell,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import EditableField from '../../components/EditableField';
import EditModal from '../../components/EditModal';
import EditableTable from '../../components/EditableTable';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import AdminLayout from '../../components/AdminLayout';

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

interface DashboardStats {
  totalsellers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activesellers: number;
  pendingOrders: number;
  growthRates: {
    sellers: number;
    products: number;
    orders: number;
    revenue: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'user' | 'order' | 'product' | 'shop';
  action: string;
  description: string;
  amount?: number;
  time: string;
  metadata?: any;
}

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalsellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activesellers: 0,
    pendingOrders: 0,
    growthRates: {
      sellers: 0,
      products: 0,
      orders: 0,
      revenue: 0
    }
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showUsersTable, setShowUsersTable] = useState(false);
  const [users, setUsers] = useState([]);

  // Real chart data from backend
  const [chartData, setChartData] = useState({
    sales: { labels: [], datasets: [] },
    sellerPerformance: { labels: [], datasets: [] },
    categoryDistribution: { labels: [], datasets: [] }
  });

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'admin') {
      return;
    }

    try {
      // Get analytics data for charts
      const analyticsResponse = await adminApi.getAnalytics({ period: '30' });
      
      // Transform analytics data to chart format
      const transformedChartData = {
        sales: {
          labels: analyticsResponse.revenue?.labels || [],
          datasets: [
            {
              label: 'Platform Revenue ($)',
              data: analyticsResponse.revenue?.platform || [],
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
            },
          ],
        },
        sellerPerformance: {
          labels: analyticsResponse.topSellers?.map((seller: any) => 
            seller.name || seller.businessInfo?.storeName || 'Unknown'
          ) || [],
          datasets: [
            {
              label: 'Sales ($)',
              data: analyticsResponse.topSellers?.map((seller: any) => seller.revenue || 0) || [],
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)',
              ],
            },
          ],
        },
        categoryDistribution: {
          labels: analyticsResponse.categories?.labels || [],
          datasets: [
            {
              data: analyticsResponse.categories?.data || [],
              backgroundColor: [
                '#3B82F6',
                '#10B981',
                '#F59E0B',
                '#EF4444',
                '#8B5CF6',
              ],
            },
          ],
        }
      };

      setChartData(transformedChartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Fetch admin dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getDashboard();
      
      // Map backend data to frontend structure
      setStats({
        totalsellers: response.users?.sellers || 0,
        totalProducts: response.products?.total || 0,
        totalOrders: response.orders?.total || 0,
        totalRevenue: response.revenue?.total || 0,
        activesellers: response.users?.active || 0,
        pendingOrders: response.orders?.pending || 0,
        growthRates: {
          sellers: response.users?.growth || 0,
          products: response.products?.growth || 0,
          orders: response.orders?.growth || 0,
          revenue: response.revenue?.growth || 0
        }
      });

      // Transform recent activity data from backend
      const activity: RecentActivity[] = [];
      
      if (response.recentActivity?.orders) {
        response.recentActivity.orders.slice(0, 3).forEach((order: any) => {
          activity.push({
            id: `order-${order._id}`,
            type: 'order',
            action: `Order ${order.status}`,
            description: `Order #${order.orderNumber} by ${order.customer?.fullName || 'Unknown customer'}`,
            amount: order.totalAmount,
            time: new Date(order.createdAt).toLocaleString(),
            metadata: order
          });
        });
      }
      
      if (response.recentActivity?.users) {
        response.recentActivity.users.slice(0, 2).forEach((user: any) => {
          activity.push({
            id: `user-${user._id}`,
            type: 'user',
            action: 'New user registered',
            description: `${user.fullName} (${user.role}) joined the platform`,
            time: new Date(user.createdAt).toLocaleString(),
            metadata: user
          });
        });
      }
      
      if (response.recentActivity?.products) {
        response.recentActivity.products.slice(0, 2).forEach((product: any) => {
          activity.push({
            id: `product-${product._id}`,
            type: 'product',
            action: 'New product added',
            description: `${product.name} by ${product.seller?.businessInfo?.storeName || 'Unknown seller'}`,
            amount: product.price,
            time: new Date(product.createdAt).toLocaleString(),
            metadata: product
          });
        });
      }
      
      if (response.recentActivity?.shops) {
        response.recentActivity.shops.slice(0, 1).forEach((shop: any) => {
          activity.push({
            id: `shop-${shop._id}`,
            type: 'shop',
            action: 'New shop created',
            description: `${shop.storeName} by ${shop.owner?.fullName || 'Unknown owner'}`,
            time: new Date(shop.createdAt).toLocaleString(),
            metadata: shop
          });
        });
      }
      
      setRecentActivity(activity);

    } catch (err) {
      console.error('Failed to fetch admin dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch users for table
  const fetchUsers = useCallback(async () => {
    try {
      const response = await adminApi.getUsers({ limit: 50 });
      setUsers(response.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  // Handle stat updates
  const handleStatUpdate = useCallback(async (statType: string, newValue: number) => {
    try {
      // In a real app, you'd update this via an API
      console.log(`Updating ${statType} to ${newValue}`);
      
      // Update local state
      setStats(prev => ({
        ...prev,
        [statType]: newValue
      }));
    } catch (err) {
      throw new Error('Failed to update statistic');
    }
  }, []);

  // Handle user management
  const handleUserSave = useCallback(async (userId: string, userData: any) => {
    try {
      await adminApi.updateUserStatus(userId, userData.isActive);
      fetchUsers(); // Refresh the table
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update user');
    }
  }, [fetchUsers]);

  const handleUserDelete = useCallback(async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      fetchUsers(); // Refresh the table
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete user');
    }
  }, [fetchUsers]);

  // Handle announcements
  const handleSendAnnouncement = useCallback(async (data: any) => {
    try {
      await adminApi.sendAnnouncement({
        title: data.title,
        message: data.message,
        priority: data.priority,
        targetRole: data.targetRole,
        expiresAt: data.expiresAt
      });
      setShowAnnouncementModal(false);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send announcement');
    }
  }, []);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
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
      case 'user': return faUsers;
      case 'order': return faShoppingBag;
      case 'product': return faStore;
      case 'shop': return faStore;
      default: return faPlus;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-600';
      case 'order': return 'bg-green-100 text-green-600';
      case 'product': return 'bg-purple-100 text-purple-600';
      case 'shop': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-600 mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchDashboardData}
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
    <AdminLayout>
      {/* Page Title */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
          <p className="text-gray-600">Monitor and manage the marketplace</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              editMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-2" />
            {editMode ? 'Exit Edit' : 'Edit Mode'}
          </button>
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faBell} className="w-4 h-4 mr-2" />
            Send Announcement
          </button>
          <button
            onClick={() => {
              setShowUsersTable(true);
              fetchUsers();
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FontAwesomeIcon icon={faUsers} className="w-4 h-4 mr-2" />
            Manage Users
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Sellers</p>
              {editMode ? (
                <EditableField
                  value={stats.totalsellers}
                  onSave={(value) => handleStatUpdate('totalsellers', Number(value))}
                  type="number"
                  className="text-2xl font-bold text-gray-900"
                />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats.totalsellers}</p>
              )}
              <div className="flex items-center mt-2">
                <FontAwesomeIcon 
                  icon={getGrowthIcon(stats.growthRates.sellers)} 
                  className={`w-3 h-3 mr-1 ${getGrowthColor(stats.growthRates.sellers)}`} 
                />
                <span className={`text-sm font-medium ${getGrowthColor(stats.growthRates.sellers)}`}>
                  {stats.growthRates.sellers > 0 ? '+' : ''}{stats.growthRates.sellers}% this period
                </span>
              </div>
            </div>
            <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Sellers</p>
              <p className="text-2xl font-bold text-green-600">{stats.activesellers}</p>
              <div className="flex items-center mt-2">
                <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Currently active</span>
              </div>
            </div>
            <FontAwesomeIcon icon={faStore} className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalProducts}</p>
              <div className="flex items-center mt-2">
                <FontAwesomeIcon 
                  icon={getGrowthIcon(stats.growthRates.products)} 
                  className={`w-3 h-3 mr-1 ${getGrowthColor(stats.growthRates.products)}`} 
                />
                <span className={`text-sm font-medium ${getGrowthColor(stats.growthRates.products)}`}>
                  {stats.growthRates.products > 0 ? '+' : ''}{stats.growthRates.products}% this period
                </span>
              </div>
            </div>
            <FontAwesomeIcon icon={faShoppingBag} className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-orange-600">{stats.totalOrders}</p>
              <div className="flex items-center mt-2">
                <FontAwesomeIcon 
                  icon={getGrowthIcon(stats.growthRates.orders)} 
                  className={`w-3 h-3 mr-1 ${getGrowthColor(stats.growthRates.orders)}`} 
                />
                <span className={`text-sm font-medium ${getGrowthColor(stats.growthRates.orders)}`}>
                  {stats.growthRates.orders > 0 ? '+' : ''}{stats.growthRates.orders}% this period
                </span>
              </div>
            </div>
            <FontAwesomeIcon icon={faChartLine} className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
              <div className="flex items-center mt-2">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 mr-1 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-600">Requires attention</span>
              </div>
            </div>
            <FontAwesomeIcon icon={faShoppingBag} className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.totalRevenue.toLocaleString()}
              </p>
              <div className="flex items-center mt-2">
                <FontAwesomeIcon 
                  icon={getGrowthIcon(stats.growthRates.revenue)} 
                  className={`w-3 h-3 mr-1 ${getGrowthColor(stats.growthRates.revenue)}`} 
                />
                <span className={`text-sm font-medium ${getGrowthColor(stats.growthRates.revenue)}`}>
                  {stats.growthRates.revenue > 0 ? '+' : ''}{stats.growthRates.revenue}% this period
                </span>
              </div>
            </div>
            <FontAwesomeIcon icon={faDollarSign} className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Revenue Trend</h3>
          {chartData.sales.labels.length > 0 ? (
            <Line data={chartData.sales} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <FontAwesomeIcon icon={faChartLine} className="text-4xl mb-2" />
                <p>No revenue data available</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Seller Performance</h3>
          {chartData.sellerPerformance.labels.length > 0 ? (
            <Bar data={chartData.sellerPerformance} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <FontAwesomeIcon icon={faUsers} className="text-4xl mb-2" />
                <p>No seller performance data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Categories</h3>
          {chartData.categoryDistribution.labels.length > 0 ? (
            <Doughnut data={chartData.categoryDistribution} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <FontAwesomeIcon icon={faShoppingBag} className="text-4xl mb-2" />
                <p>No category data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    <FontAwesomeIcon 
                      icon={getActivityIcon(activity.type)} 
                      className="text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">
                        {activity.description}
                        {activity.amount && ` - $${activity.amount.toFixed(2)}`}
                      </p>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
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
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <FontAwesomeIcon icon={faPlus} className="text-blue-600 mr-2" />
            <span className="font-medium text-gray-700">Add Product</span>
          </button>
          
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
            <FontAwesomeIcon icon={faUsers} className="text-green-600 mr-2" />
            <span className="font-medium text-gray-700">Manage Sellers</span>
          </button>
          
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <FontAwesomeIcon icon={faShoppingBag} className="text-purple-600 mr-2" />
            <span className="font-medium text-gray-700">View Orders</span>
          </button>
          
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
            <FontAwesomeIcon icon={faChartLine} className="text-orange-600 mr-2" />
            <span className="font-medium text-gray-700">Analytics</span>
          </button>
        </div>
      </div>

      {/* Announcement Modal */}
      <EditModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        title="Send System Announcement"
        fields={[
          {
            key: 'title',
            label: 'Title',
            type: 'text',
            required: true,
            placeholder: 'Enter announcement title...'
          },
          {
            key: 'message',
            label: 'Message',
            type: 'textarea',
            required: true,
            rows: 4,
            placeholder: 'Enter announcement message...'
          },
          {
            key: 'priority',
            label: 'Priority',
            type: 'select',
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ],
            required: true
          },
          {
            key: 'targetRole',
            label: 'Target Audience',
            type: 'select',
            options: [
              { value: 'all', label: 'All Users' },
              { value: 'user', label: 'Customers Only' },
              { value: 'seller', label: 'Sellers Only' },
              { value: 'admin', label: 'Admins Only' }
            ],
            required: true
          },
          {
            key: 'expiresAt',
            label: 'Expires At (Optional)',
            type: 'datetime-local',
            helperText: 'Leave blank for permanent announcement'
          }
        ]}
        onSave={handleSendAnnouncement}
        saveButtonText="Send Announcement"
        size="lg"
      />

      {/* Users Management Table */}
      {showUsersTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <button
                onClick={() => setShowUsersTable(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh]">
              <EditableTable
                data={users}
                columns={[
                  {
                    key: 'fullName',
                    label: 'Name',
                    sortable: true,
                    editable: true,
                    required: true
                  },
                  {
                    key: 'email',
                    label: 'Email',
                    type: 'email',
                    sortable: true,
                    editable: true,
                    required: true
                  },
                  {
                    key: 'role',
                    label: 'Role',
                    type: 'select',
                    options: [
                      { value: 'user', label: 'Customer' },
                      { value: 'seller', label: 'Seller' },
                      { value: 'admin', label: 'Admin' }
                    ],
                    sortable: true,
                    editable: true,
                    required: true
                  },
                  {
                    key: 'isActive',
                    label: 'Status',
                    type: 'select',
                    options: [
                      { value: true, label: 'Active' },
                      { value: false, label: 'Inactive' }
                    ],
                    sortable: true,
                    editable: true,
                    render: (value) => (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {value ? 'Active' : 'Inactive'}
                      </span>
                    )
                  },
                  {
                    key: 'createdAt',
                    label: 'Joined',
                    sortable: true,
                    render: (value) => new Date(value).toLocaleDateString()
                  }
                ]}
                onSave={handleUserSave}
                onDelete={handleUserDelete}
                idField="_id"
                searchable={true}
                selectable={true}
                pageSize={10}
              />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
