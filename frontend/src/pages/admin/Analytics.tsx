import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine,
  faUsers,
  faDollarSign,
  faShoppingBag,
  faCalendarAlt,
  faDownload,
  faFilter,
  faSpinner,
  faStore
} from '@fortawesome/free-solid-svg-icons';
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
import { Line, Bar, Pie } from 'react-chartjs-2';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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

const Analytics = () => {
  const { user, isAuthenticated } = useAuth();
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real data state
  const [analyticsData, setAnalyticsData] = useState({
    revenue: { labels: [], datasets: [] },
    sellerGrowth: { labels: [], datasets: [] },
    categoryPerformance: { labels: [], datasets: [] },
    topSellers: [],
    platformMetrics: {
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      activeSellers: 0
    }
  });

  // Fetch analytics data from backend
  const fetchAnalyticsData = async () => {
    if (!isAuthenticated || user?.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data for basic metrics
      const dashboardData = await adminApi.getDashboard();
      
      // Fetch analytics data
      const analyticsResponse = await adminApi.getAnalytics({ period: dateRange });
      
      // Transform backend data to chart format
      const transformedData = {
        revenue: {
          labels: analyticsResponse.revenue?.labels || [],
          datasets: [
            {
              label: 'Platform Revenue',
              data: analyticsResponse.revenue?.platform || [],
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
            },
            {
              label: 'Seller Commissions',
              data: analyticsResponse.revenue?.commissions || [],
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
            }
          ],
        },
        sellerGrowth: {
          labels: analyticsResponse.sellerGrowth?.labels || [],
          datasets: [
            {
              label: 'New Sellers',
              data: analyticsResponse.sellerGrowth?.new || [],
              backgroundColor: 'rgba(245, 158, 11, 0.8)',
            },
            {
              label: 'Active Sellers',
              data: analyticsResponse.sellerGrowth?.active || [],
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
            }
          ],
        },
        categoryPerformance: {
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
                '#6B7280'
              ],
            },
          ],
        },
        topSellers: analyticsResponse.topSellers || [],
        platformMetrics: {
          totalUsers: dashboardData.users?.total || 0,
          totalOrders: dashboardData.orders?.total || 0,
          totalRevenue: dashboardData.revenue?.total || 0,
          activeSellers: dashboardData.users?.sellers || 0
        }
      };

      setAnalyticsData(transformedData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, isAuthenticated, user]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">{error}</div>
            <button 
              onClick={fetchAnalyticsData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <div className="flex gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <FontAwesomeIcon icon={faDownload} />
              Export Report
            </button>
          </div>
        </div>

        {/* Platform Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FontAwesomeIcon icon={faUsers} className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.platformMetrics.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faShoppingBag} className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.platformMetrics.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FontAwesomeIcon icon={faDollarSign} className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${analyticsData.platformMetrics.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FontAwesomeIcon icon={faStore} className="text-purple-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sellers</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.platformMetrics.activeSellers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
            {analyticsData.revenue.labels.length > 0 ? (
              <Line data={analyticsData.revenue} options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false }
                }
              }} />
            ) : (
              <div className="text-center py-8 text-gray-500">No revenue data available</div>
            )}
          </div>

          {/* Seller Growth Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Growth</h3>
            {analyticsData.sellerGrowth.labels.length > 0 ? (
              <Bar data={analyticsData.sellerGrowth} options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false }
                }
              }} />
            ) : (
              <div className="text-center py-8 text-gray-500">No seller growth data available</div>
            )}
          </div>
        </div>

        {/* Category Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
            {analyticsData.categoryPerformance.labels.length > 0 ? (
              <Pie data={analyticsData.categoryPerformance} options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' },
                  title: { display: false }
                }
              }} />
            ) : (
              <div className="text-center py-8 text-gray-500">No category data available</div>
            )}
          </div>

          {/* Top Sellers */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Sellers</h3>
            {analyticsData.topSellers.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.topSellers.map((seller: any, index: number) => (
                  <div key={seller._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-gray-400 mr-3">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{seller.name || seller.businessInfo?.storeName || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{seller.orders || 0} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${seller.revenue?.toLocaleString() || 0}</p>
                      <p className="text-sm text-green-600">{seller.growth || '0%'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No seller performance data available</div>
            )}
          </div>
        </div>

        {/* No Data Message */}
        {!loading && 
         analyticsData.revenue.labels.length === 0 && 
         analyticsData.sellerGrowth.labels.length === 0 && 
         analyticsData.categoryPerformance.labels.length === 0 && 
         analyticsData.topSellers.length === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faChartLine} className="text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Analytics Data Available</h3>
            <p className="text-gray-600">Start using the platform to see analytics data here.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Analytics;
