import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faServer,
  faShieldAlt,
  faTrash,
  faDownload,
  faUpload,
  faSync,
  faExclamationTriangle,
  faCheckCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  uptime: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

const SystemTools = () => {
  const { user } = useAuth();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    activeConnections: 0,
    uptime: 0
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tools = [
    {
      id: 'cache-clear',
      title: 'Clear Cache',
      description: 'Clear application cache to improve performance',
      icon: faSync,
      color: 'blue',
      action: 'Clear Cache'
    },
    {
      id: 'database-optimize',
      title: 'Database Optimization',
      description: 'Optimize database tables for better performance',
      icon: faDatabase,
      color: 'green',
      action: 'Optimize'
    },
    {
      id: 'backup-create',
      title: 'Create Backup',
      description: 'Create a full system backup',
      icon: faDownload,
      color: 'purple',
      action: 'Create Backup'
    },
    {
      id: 'logs-cleanup',
      title: 'Clean Log Files',
      description: 'Remove old log files to free up space',
      icon: faTrash,
      color: 'red',
      action: 'Clean Logs'
    },
    {
      id: 'security-scan',
      title: 'Security Scan',
      description: 'Run security vulnerability scan',
      icon: faShieldAlt,
      color: 'orange',
      action: 'Start Scan'
    },
    {
      id: 'system-update',
      title: 'System Update',
      description: 'Check for and install system updates',
      icon: faUpload,
      color: 'indigo',
      action: 'Check Updates'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
      green: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200',
      purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200',
      red: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200',
      orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200',
      indigo: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <AdminLayout title="TIKTOK SHOP ADMIN" subtitle="System Tools & Utilities">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">System Tools</h2>
        <p className="text-gray-600">Administrative tools for system maintenance and optimization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div key={tool.id} className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${getColorClasses(tool.color)}`}>
              <FontAwesomeIcon icon={tool.icon} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{tool.title}</h3>
            <p className="text-gray-600 mb-4">{tool.description}</p>
            <button className={`w-full px-4 py-2 rounded-lg font-medium transition-colors border ${getColorClasses(tool.color)}`}>
              {tool.action}
            </button>
          </div>
        ))}
      </div>

      {/* System Status */}
      <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-green-900">All Systems Operational</p>
              <p className="text-sm text-green-700">Last check: 2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-yellow-900">Cache Optimization Needed</p>
              <p className="text-sm text-yellow-700">Recommended: Clear cache</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            <FontAwesomeIcon icon={faDatabase} className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-blue-900">Database Healthy</p>
              <p className="text-sm text-blue-700">Last backup: 6 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemTools;
