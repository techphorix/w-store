import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faServer,
  faDatabase,
  faMicrochip,
  faMemory,
  faHdd,
  faNetworkWired,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faChartLine,
  faDownload,
  faRefresh,
  faClock,
  faUsers,
  faGlobe
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SystemMetrics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [systemHealth, setSystemHealth] = useState({
    overall: 'healthy',
    api: 'healthy',
    database: 'healthy',
    cache: 'warning',
    storage: 'healthy'
  });

  const [metrics, setMetrics] = useState({
    cpuUsage: 45.2,
    memoryUsage: 67.8,
    diskUsage: 34.5,
    networkIn: 1250,
    networkOut: 890,
    activeUsers: 1247,
    requestsPerSecond: 156,
    uptime: 99.98
  });

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    if (!isLoading) setRefreshing(true);
    
    // Simulate API call
    setTimeout(() => {
      // Simulate real-time data changes
      setMetrics(prev => ({
        ...prev,
        cpuUsage: Math.max(20, Math.min(80, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(30, Math.min(90, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        requestsPerSecond: Math.max(50, Math.min(300, prev.requestsPerSecond + (Math.random() - 0.5) * 20)),
        activeUsers: Math.max(500, Math.min(2000, prev.activeUsers + Math.floor((Math.random() - 0.5) * 100)))
      }));
      
      setIsLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return faCheckCircle;
      case 'warning': return faExclamationTriangle;
      case 'critical': return faTimesCircle;
      default: return faCheckCircle;
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage > 80) return 'bg-red-500';
    if (usage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Chart data for performance trends
  const performanceData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    datasets: [
      {
        label: 'CPU Usage (%)',
        data: [30, 25, 45, 65, 55, 40, 35],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Memory Usage (%)',
        data: [50, 48, 60, 70, 68, 55, 52],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Requests/sec',
        data: [100, 80, 120, 180, 160, 140, 110],
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'System Performance - Last 24 Hours',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 200,
      },
    },
  };

  return (
    <AdminLayout
      title="TIKTOK SHOP ADMIN"
      subtitle="System Metrics & Monitoring"
    >
      {/* Page Title */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">System Metrics</h2>
          <p className="text-gray-600">Real-time system performance and health monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSystemMetrics}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon 
              icon={faRefresh} 
              className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} 
            />
            Refresh
          </button>
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <FontAwesomeIcon icon={faDownload} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading system metrics...</p>
        </div>
      ) : (
        <>
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Health</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getHealthIcon(systemHealth.overall)} 
                      className={`w-4 h-4 mr-2 ${getHealthColor(systemHealth.overall)}`} 
                    />
                    <span className="text-sm font-semibold capitalize">{systemHealth.overall}</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faServer} className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">API Status</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getHealthIcon(systemHealth.api)} 
                      className={`w-4 h-4 mr-2 ${getHealthColor(systemHealth.api)}`} 
                    />
                    <span className="text-sm font-semibold capitalize">{systemHealth.api}</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faNetworkWired} className="w-6 h-6 text-green-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Database</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getHealthIcon(systemHealth.database)} 
                      className={`w-4 h-4 mr-2 ${getHealthColor(systemHealth.database)}`} 
                    />
                    <span className="text-sm font-semibold capitalize">{systemHealth.database}</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faDatabase} className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cache</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getHealthIcon(systemHealth.cache)} 
                      className={`w-4 h-4 mr-2 ${getHealthColor(systemHealth.cache)}`} 
                    />
                    <span className="text-sm font-semibold capitalize">{systemHealth.cache}</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faMemory} className="w-6 h-6 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Storage</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getHealthIcon(systemHealth.storage)} 
                      className={`w-4 h-4 mr-2 ${getHealthColor(systemHealth.storage)}`} 
                    />
                    <span className="text-sm font-semibold capitalize">{systemHealth.storage}</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faHdd} className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Resource Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.cpuUsage.toFixed(1)}%</p>
                </div>
                <FontAwesomeIcon icon={faMicrochip} className="w-8 h-8 text-blue-600" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(metrics.cpuUsage)}`}
                  style={{ width: `${metrics.cpuUsage}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.memoryUsage.toFixed(1)}%</p>
                </div>
                <FontAwesomeIcon icon={faMemory} className="w-8 h-8 text-green-600" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(metrics.memoryUsage)}`}
                  style={{ width: `${metrics.memoryUsage}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Disk Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.diskUsage.toFixed(1)}%</p>
                </div>
                <FontAwesomeIcon icon={faHdd} className="w-8 h-8 text-purple-600" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(metrics.diskUsage)}`}
                  style={{ width: `${metrics.diskUsage}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Uptime</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.uptime}%</p>
                </div>
                <FontAwesomeIcon icon={faClock} className="w-8 h-8 text-orange-600" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${metrics.uptime}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Real-time Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics.activeUsers.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Currently online</p>
                </div>
                <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Requests/sec</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.requestsPerSecond}</p>
                  <p className="text-xs text-gray-500 mt-1">API requests</p>
                </div>
                <FontAwesomeIcon icon={faChartLine} className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Network In</p>
                  <p className="text-2xl font-bold text-purple-600">{metrics.networkIn} MB/s</p>
                  <p className="text-xs text-gray-500 mt-1">Incoming traffic</p>
                </div>
                <FontAwesomeIcon icon={faNetworkWired} className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Network Out</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.networkOut} MB/s</p>
                  <p className="text-xs text-gray-500 mt-1">Outgoing traffic</p>
                </div>
                <FontAwesomeIcon icon={faGlobe} className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <Line data={performanceData} options={chartOptions} />
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default SystemMetrics;
