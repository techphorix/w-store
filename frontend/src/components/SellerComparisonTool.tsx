import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faShoppingCart,
  faDollarSign,
  faChartLine,
  faStore,
  faStar,
  faArrowUp,
  faArrowDown,
  faMinus,
  faEye,
  faExchangeAlt,
  faFilter,
  faDownload,
  faSpinner,
  faTrophy,
  faCalendarAlt,
  faMapMarkerAlt,
  faPercent,
  faGlobe,
  faMagic
} from '@fortawesome/free-solid-svg-icons';
import { Bar, Line } from 'react-chartjs-2';

interface SellerInsight {
  seller: {
    id: string;
    name: string;
    email: string;
    storeName: string;
    category: string;
    joinDate: string;
  };
  analytics: {
    orderBreakdown: any[];
    performanceTrends: any[];
    customerBehavior: any[];
  };
  insights: {
    dominantCategory: any;
    bestPerformingDay: any;
    totalRevenue: number;
  };
}

interface SellerComparisonToolProps {
  sellers: any[];
  onSellerSelect?: (sellerIds: string[]) => void;
}

const SellerComparisonTool: React.FC<SellerComparisonToolProps> = ({ 
  sellers, 
  onSellerSelect 
}) => {
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<SellerInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'chart'>('grid');
  const [sortBy, setSortBy] = useState<'revenue' | 'orders' | 'growth' | 'rating'>('revenue');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Mock data generator for seller insights
  const generateSellerInsights = (seller: any): SellerInsight => {
    const mockOrderBreakdown = [
      { month: 'Jan', orders: Math.floor(Math.random() * 100) + 20 },
      { month: 'Feb', orders: Math.floor(Math.random() * 100) + 25 },
      { month: 'Mar', orders: Math.floor(Math.random() * 100) + 30 },
      { month: 'Apr', orders: Math.floor(Math.random() * 100) + 35 },
      { month: 'May', orders: Math.floor(Math.random() * 100) + 40 },
      { month: 'Jun', orders: Math.floor(Math.random() * 100) + 45 }
    ];

    const mockPerformanceTrends = [
      { week: 'W1', revenue: Math.floor(Math.random() * 5000) + 1000 },
      { week: 'W2', revenue: Math.floor(Math.random() * 5000) + 1200 },
      { week: 'W3', revenue: Math.floor(Math.random() * 5000) + 1400 },
      { week: 'W4', revenue: Math.floor(Math.random() * 5000) + 1600 }
    ];

    return {
      seller: {
        id: seller.id,
        name: seller.name || seller.fullName,
        email: seller.email,
        storeName: seller.businessInfo?.storeName || seller.storeName,
        category: seller.businessInfo?.businessType || 'General',
        joinDate: seller.createdAt || new Date().toISOString()
      },
      analytics: {
        orderBreakdown: mockOrderBreakdown,
        performanceTrends: mockPerformanceTrends,
        customerBehavior: []
      },
      insights: {
        dominantCategory: { name: 'Electronics', percentage: 65 },
        bestPerformingDay: { day: 'Friday', orders: 45 },
        totalRevenue: Math.floor(Math.random() * 50000) + 10000
      }
    };
  };

  const handleSellerToggle = (sellerId: string) => {
    const newSelection = selectedSellers.includes(sellerId)
      ? selectedSellers.filter(id => id !== sellerId)
      : [...selectedSellers, sellerId];
    
    setSelectedSellers(newSelection);
    
    if (onSellerSelect) {
      onSellerSelect(newSelection);
    }
  };

  const generateComparison = async () => {
    if (selectedSellers.length === 0) return;
    
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const insights = selectedSellers.map(sellerId => {
      const seller = sellers.find(v => v.id === sellerId || v._id === sellerId);
      return generateSellerInsights(seller);
    });
    
    setComparisonData(insights);
    setLoading(false);
  };

  const exportComparison = () => {
    const csvContent = [
      ['Seller Name', 'Store Name', 'Category', 'Revenue', 'Best Day'],
      ...comparisonData.map(insight => [
        insight.seller.name,
        insight.seller.storeName,
        insight.seller.category,
        insight.insights.totalRevenue,
        insight.insights.bestPerformingDay.day
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seller-comparison.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const chartData = {
    labels: comparisonData.map(insight => insight.seller.storeName),
    datasets: [
      {
        label: 'Revenue',
        data: comparisonData.map(insight => insight.insights.totalRevenue),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Seller Revenue Comparison'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faExchangeAlt} className="mr-3 text-blue-600" />
            Seller Comparison Tool
          </h3>
          <p className="text-gray-600 mt-1">Compare performance metrics across multiple sellers</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'chart' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              Chart
            </button>
          </div>
          
          {comparisonData.length > 0 && (
            <button
              onClick={exportComparison}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Seller Selection */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Sellers to Compare</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sellers.slice(0, 12).map((seller) => (
            <div
              key={seller.id || seller._id}
              onClick={() => handleSellerToggle(seller.id || seller._id)}
              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                selectedSellers.includes(seller.id || seller._id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  selectedSellers.includes(seller.id || seller._id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedSellers.includes(seller.id || seller._id) && (
                    <FontAwesomeIcon icon={faUsers} className="w-2 h-2 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {seller.businessInfo?.storeName || seller.storeName || seller.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {seller.fullName || seller.name}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedSellers.length} seller{selectedSellers.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={generateComparison}
            disabled={selectedSellers.length === 0 || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
            <FontAwesomeIcon icon={faMagic} />
            <span>{loading ? 'Generating...' : 'Generate Comparison'}</span>
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Comparison Results</h4>
          
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comparisonData.map((insight, index) => (
                <div key={insight.seller.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h5 className="font-bold text-gray-900">{insight.seller.storeName}</h5>
                      <p className="text-sm text-gray-600">{insight.seller.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Rank</div>
                      <div className="text-lg font-bold text-blue-600">#{index + 1}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Revenue</span>
                      <span className="font-semibold text-green-600">
                        ${insight.insights.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Best Day</span>
                      <span className="font-semibold text-orange-600">
                        {insight.insights.bestPerformingDay.day}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Category</span>
                      <span className="font-semibold text-purple-600">
                        {insight.seller.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Performance Score</span>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <FontAwesomeIcon
                            key={i}
                            icon={faStar}
                            className={`w-3 h-3 ${
                              i < Math.floor(insight.insights.totalRevenue / 10000)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Best Day
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {comparisonData.map((insight) => (
                    <tr key={insight.seller.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {insight.seller.storeName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {insight.seller.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${insight.insights.totalRevenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {insight.insights.bestPerformingDay.day}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {insight.seller.category}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {viewMode === 'chart' && (
            <div className="bg-white p-6 rounded-lg border">
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerComparisonTool;
