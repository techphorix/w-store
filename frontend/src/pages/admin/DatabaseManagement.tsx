import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faDatabase,
  faDownload,
  faUpload,
  faSync,
  faTrash,
  faChartBar,
  faTable,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faClock
} from '@fortawesome/free-solid-svg-icons';

const DatabaseManagement = () => {
  const [isLoading, setIsLoading] = useState(false);

  const dbStats = [
    { label: 'Total Size', value: '2.4 GB', icon: faDatabase, color: 'blue' },
    { label: 'Tables', value: '47', icon: faTable, color: 'green' },
    { label: 'Records', value: '1.2M', icon: faChartBar, color: 'purple' },
    { label: 'Last Backup', value: '6h ago', icon: faClock, color: 'orange' }
  ];

  const operations = [
    {
      id: 'backup',
      title: 'Create Backup',
      description: 'Create a full database backup',
      icon: faDownload,
      color: 'green',
      danger: false
    },
    {
      id: 'restore',
      title: 'Restore Database',
      description: 'Restore from backup file',
      icon: faUpload,
      color: 'blue',
      danger: false
    },
    {
      id: 'optimize',
      title: 'Optimize Tables',
      description: 'Optimize database tables for performance',
      icon: faSync,
      color: 'purple',
      danger: false
    },
    {
      id: 'cleanup',
      title: 'Clean Old Data',
      description: 'Remove old logs and temporary data',
      icon: faTrash,
      color: 'red',
      danger: true
    }
  ];

  const getColorClasses = (color: string, danger = false) => {
    if (danger) {
      return 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200';
    }
    const colors = {
      blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
      green: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200',
      purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200',
      orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <AdminLayout title="TIKTOK SHOP ADMIN" subtitle="Database Management System">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Database Management</h2>
        <p className="text-gray-600">Monitor and manage database operations and backups</p>
      </div>

      {/* Database Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dbStats.map((stat, index) => (
          <div key={index} className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                <FontAwesomeIcon icon={stat.icon} className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Database Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {operations.map((operation) => (
          <div key={operation.id} className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${getColorClasses(operation.color, operation.danger)}`}>
                <FontAwesomeIcon icon={operation.icon} className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{operation.title}</h3>
                <p className="text-gray-600 mb-4">{operation.description}</p>
                <button 
                  className={`px-4 py-2 rounded-lg font-medium transition-colors border ${getColorClasses(operation.color, operation.danger)}`}
                >
                  {operation.danger ? 'Execute (Caution)' : 'Execute'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Backups */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Backups</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Backup Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { name: 'backup_2024_01_20_14_30.sql', size: '2.4 GB', created: '6 hours ago', status: 'completed' },
                { name: 'backup_2024_01_19_14_30.sql', size: '2.3 GB', created: '1 day ago', status: 'completed' },
                { name: 'backup_2024_01_18_14_30.sql', size: '2.2 GB', created: '2 days ago', status: 'completed' }
              ].map((backup, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {backup.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {backup.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {backup.created}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1" />
                      {backup.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-4">Download</button>
                    <button className="text-green-600 hover:text-green-900 mr-4">Restore</button>
                    <button className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DatabaseManagement;
