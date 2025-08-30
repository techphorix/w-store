import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faBell,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faPaperPlane,
  faUsers,
  faUserShield,
  faStore,
  faSearch,
  faFilter,
  faSpinner,
  faTimes,
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target: 'all' | 'sellers' | 'admins' | 'users';
  status: 'draft' | 'sent' | 'scheduled';
  recipients: number;
  createdAt: string;
  scheduledAt?: string;
  sentAt?: string;
}

const Notifications = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const sampleNotifications: Notification[] = [
    {
      _id: '1',
      title: 'System Maintenance Scheduled',
      message: 'The platform will undergo scheduled maintenance on January 25th from 2:00 AM to 4:00 AM UTC.',
      type: 'warning',
      target: 'all',
      status: 'sent',
      recipients: 15420,
      createdAt: '2024-01-20T10:00:00Z',
      sentAt: '2024-01-20T10:05:00Z'
    },
    {
      _id: '2',
      title: 'New Feature: Advanced Analytics',
      message: 'We\'ve launched new advanced analytics features for sellers. Check out the enhanced dashboard!',
      type: 'success',
      target: 'sellers',
      status: 'sent',
      recipients: 1247,
      createdAt: '2024-01-19T14:30:00Z',
      sentAt: '2024-01-19T15:00:00Z'
    },
    {
      _id: '3',
      title: 'Policy Update Reminder',
      message: 'Please review the updated terms of service and privacy policy. Your acknowledgment is required.',
      type: 'info',
      target: 'all',
      status: 'scheduled',
      recipients: 15420,
      createdAt: '2024-01-18T09:00:00Z',
      scheduledAt: '2024-01-22T12:00:00Z'
    }
  ];

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, typeFilter]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setNotifications(sampleNotifications);
      setIsLoading(false);
    }, 1000);
  };

  const filterNotifications = () => {
    let filtered = notifications;
    
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === typeFilter);
    }
    
    setFilteredNotifications(filtered);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return faCheckCircle;
      case 'warning': return faExclamationTriangle;
      case 'error': return faTimesCircle;
      default: return faInfoCircle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTargetIcon = (target: string) => {
    switch (target) {
      case 'sellers': return faStore;
      case 'admins': return faUserShield;
      default: return faUsers;
    }
  };

  return (
    <AdminLayout
      title="TIKTOK SHOP ADMIN"
      subtitle="Notification Management System"
    >
      {/* Page Title */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h2>
          <p className="text-gray-600">Manage system notifications and announcements</p>
        </div>
        <button
          onClick={() => setShowNotificationModal(true)}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Create Notification
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading notifications...</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-8 text-sm font-medium text-gray-900 cursor-pointer outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                <FontAwesomeIcon icon={faFilter} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div key={notification._id} className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                        <FontAwesomeIcon icon={getTypeIcon(notification.type)} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{notification.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={getTargetIcon(notification.target)} className="w-3 h-3 mr-1" />
                            <span className="capitalize">{notification.target}</span>
                          </div>
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faUsers} className="w-3 h-3 mr-1" />
                            <span>{notification.recipients.toLocaleString()} recipients</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                            {notification.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4 leading-relaxed">{notification.message}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div>
                        Created: {new Date(notification.createdAt).toLocaleDateString()}
                        {notification.sentAt && (
                          <span className="ml-4">
                            Sent: {new Date(notification.sentAt).toLocaleDateString()}
                          </span>
                        )}
                        {notification.scheduledAt && (
                          <span className="ml-4">
                            Scheduled: {new Date(notification.scheduledAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedNotification(notification)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button
                      className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    {notification.status === 'draft' && (
                      <button
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                        title="Send Now"
                      >
                        <FontAwesomeIcon icon={faPaperPlane} />
                      </button>
                    )}
                    <button
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faBell} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Notifications Found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default Notifications;
