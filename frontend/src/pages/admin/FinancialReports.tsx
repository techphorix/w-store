import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, 
  faDollarSign, 
  faDownload, 
  faFilter,
  faSpinner,
  faExclamationTriangle,
  faCalendarAlt,
  faChartLine,
  faChartBar,
  faMinus
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
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
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
  Legend
);

interface FinancialData {
  revenue: {
    labels: string[];
    platform: number[];
    commissions: number[];
  };
  expenses: {
    labels: string[];
    data: number[];
  };
  transactions: Array<{
    id: string;
    date: string;
    type: string;
    description: string;
    amount: number;
    status: string;
  }>;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    growthRate: number;
  };
}

const FinancialReports = () => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [selectedChart, setSelectedChart] = useState<'revenue' | 'expenses'>('revenue');

  // Fetch financial data from backend
  const fetchFinancialData = async () => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the admin API to get financial data
      const response = await adminApi.getFinancialReports({ period });
      setFinancialData(response);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [period, isAuthenticated, currentUser]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  const exportReport = () => {
    // Implementation for exporting financial reports
    console.log('Exporting financial report...');
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return faTrendingUp;
    if (growth < 0) return faTrendingDown;
    return faMinus;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

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
              onClick={fetchFinancialData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!financialData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Financial Data Available</h3>
          <p className="text-gray-600">Financial data will appear here once transactions are recorded.</p>
        </div>
      </AdminLayout>
    );
  }

  const revenueChartData = {
    labels: financialData.revenue.labels,
    datasets: [
      {
        label: 'Platform Revenue ($)',
        data: financialData.revenue.platform,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Commission Revenue ($)',
        data: financialData.revenue.commissions,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const expensesChartData = {
    labels: financialData.expenses.labels,
    datasets: [
      {
        label: 'Expenses ($)',
        data: financialData.expenses.data,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faDownload} />
            Export Report
          </button>
        </div>

        {/* Period Filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <div className="flex gap-2">
              {[
                { value: '7', label: '7 Days' },
                { value: '30', label: '30 Days' },
                { value: '90', label: '90 Days' },
                { value: '365', label: '1 Year' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePeriodChange(option.value)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    period === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${financialData.summary.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <FontAwesomeIcon 
                    icon={getGrowthIcon(financialData.summary.growthRate)} 
                    className={`w-3 h-3 mr-1 ${getGrowthColor(financialData.summary.growthRate)}`} 
                  />
                  <span className={`text-sm font-medium ${getGrowthColor(financialData.summary.growthRate)}`}>
                    {Math.abs(financialData.summary.growthRate)}%
                  </span>
                </div>
              </div>
              <FontAwesomeIcon icon={faDollarSign} className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  ${financialData.summary.totalExpenses.toLocaleString()}
                </p>
              </div>
              <FontAwesomeIcon icon={faChartLine} className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${financialData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${financialData.summary.netProfit.toLocaleString()}
                </p>
              </div>
              <FontAwesomeIcon icon={faChartLine} className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                <p className={`text-2xl font-bold ${getGrowthColor(financialData.summary.growthRate)}`}>
                  {financialData.summary.growthRate}%
                </p>
              </div>
              <FontAwesomeIcon 
                icon={getGrowthIcon(financialData.summary.growthRate)} 
                className={`w-8 h-8 ${getGrowthColor(financialData.summary.growthRate)}`} 
              />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
              <button
                onClick={() => setSelectedChart('revenue')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedChart === 'revenue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Revenue
              </button>
            </div>
            <Line data={revenueChartData} options={{
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
            }} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Expense Analysis</h3>
              <button
                onClick={() => setSelectedChart('expenses')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedChart === 'expenses'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Expenses
              </button>
            </div>
            <Bar data={expensesChartData} options={{
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
            }} />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          
          {financialData.transactions.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Transactions Found</h3>
              <p className="text-gray-600">Transactions will appear here once they are recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {financialData.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'Revenue' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default FinancialReports;
