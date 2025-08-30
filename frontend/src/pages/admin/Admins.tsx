import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faUserShield,
  faEdit,
  faEye,
  faTrash,
  faSearch,
  faFilter,
  faStar,
  faStore,
  faChartLine,
  faDollarSign,
  faToggleOn,
  faToggleOff,
  faUserTie,
  faShoppingBag,
  faWallet,
  faClipboardList,
  faUserCircle,
  faCog,
  faPlus,
  faBan,
  faCheckCircle,
  faExclamationTriangle,
  faCalendarAlt,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faGlobe,
  faChevronDown,
  faBell,
  faUser,
  faSignOutAlt,
  faTimes,
  faSave,
  faSpinner,
  faDownload,
  faSort,
  faSortUp,
  faSortDown,
  faUsers,
  faKey,
  faShield,
  faLock,
  faUnlock,
  faCrown
} from '@fortawesome/free-solid-svg-icons';
import { adminApi } from '../../services/api';

// Types
interface Admin {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  isActive: boolean;
  isEmailVerified: boolean;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
  lastLogin?: string;
  // Admin specific fields
  adminLevel?: 'super' | 'senior' | 'junior';
  permissions?: {
    userManagement: boolean;
    productManagement: boolean;
    orderManagement: boolean;
    financeAccess: boolean;
    systemSettings: boolean;
    analyticsAccess: boolean;
    contentManagement: boolean;
    supportAccess: boolean;
  };
  createdBy?: string;
  lastActivity?: string;
}

interface AdminStats {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  seniorAdmins: number;
  juniorAdmins: number;
  newAdminsToday: number;
  newAdminsThisWeek: number;
  newAdminsThisMonth: number;
  onlineAdmins: number;
}

interface Filters {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'pending' | 'suspended';
  adminLevel: 'all' | 'senior' | 'junior';
  sortBy: 'createdAt' | 'lastLogin' | 'fullName' | 'email';
  sortOrder: 'asc' | 'desc';
}

const Admins = () => {
  // State
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalAdmins: 0,
    activeAdmins: 0,
    inactiveAdmins: 0,
    seniorAdmins: 0,
    juniorAdmins: 0,
    newAdminsToday: 0,
    newAdminsThisWeek: 0,
    newAdminsThisMonth: 0,
    onlineAdmins: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const itemsPerPage = 20;
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    adminLevel: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Modal states
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  
  // Selected admins for bulk operations
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);

  // New admin form
  const [newAdmin, setNewAdmin] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    adminLevel: 'junior' as 'senior' | 'junior',
    permissions: {
      userManagement: false,
      productManagement: false,
      orderManagement: false,
      financeAccess: false,
      systemSettings: false,
      analyticsAccess: false,
      contentManagement: false,
      supportAccess: false,
    }
  });

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchAdmins();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      const response = await adminApi.getAdmins(params);
      
      setAdmins(response.users || []);
      setTotalPages(response.totalPages || 1);
      setTotalAdmins(response.total || 0);
      
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      setError(error.response?.data?.message || 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      // This would be a specific endpoint for admin statistics
      // For now, we'll use mock data
      setAdminStats({
        totalAdmins: 5,
        activeAdmins: 4,
        inactiveAdmins: 1,
        superAdmins: 1,
        seniorAdmins: 2,
        juniorAdmins: 2,
        newAdminsToday: 0,
        newAdminsThisWeek: 1,
        newAdminsThisMonth: 2,
        onlineAdmins: 3,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSort = (column: 'createdAt' | 'lastLogin' | 'fullName' | 'email') => {
    const newOrder = filters.sortBy === column && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    setFilters(prev => ({ ...prev, sortBy: column, sortOrder: newOrder }));
  };

  const handleAdminAction = async (adminId: string, action: string, value?: any) => {
    try {
      setActionLoading(adminId);
      
      switch (action) {
        case 'toggleStatus':
          await adminApi.updateUserStatus(adminId, value);
          break;
        case 'suspend':
          await adminApi.suspendUser(adminId, value.reason, value.duration);
          break;
        case 'unsuspend':
          await adminApi.unsuspendUser(adminId);
          break;
        case 'delete':
          await adminApi.deleteUser(adminId);
          break;
        case 'updatePermissions':
          await adminApi.updateUser(adminId, { permissions: value });
          break;
        default:
          throw new Error('Unknown action');
      }
      
      // Refresh data
      await fetchAdmins();
      await fetchAdminStats();
      
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      setError(error.response?.data?.message || `Failed to ${action} admin`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      setActionLoading('create');
      
      // This would be a specific endpoint for creating admin users
      // For now, we'll simulate the process
      console.log('Creating new admin:', newAdmin);
      
      // Reset form
      setNewAdmin({
        fullName: '',
        email: '',
        phoneNumber: '',
        adminLevel: 'junior',
        permissions: {
          userManagement: false,
          productManagement: false,
          orderManagement: false,
          financeAccess: false,
          systemSettings: false,
          analyticsAccess: false,
          contentManagement: false,
          supportAccess: false,
        }
      });
      
      setShowCreateModal(false);
      await fetchAdmins();
      await fetchAdminStats();
      
    } catch (error: any) {
      console.error('Error creating admin:', error);
      setError(error.response?.data?.message || 'Failed to create admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedAdmins.length === 0) return;
    
    try {
      setActionLoading('bulk');
      
      switch (action) {
        case 'activate':
          await adminApi.bulkUpdateUsers(selectedAdmins, { isActive: true });
          break;
        case 'deactivate':
          await adminApi.bulkUpdateUsers(selectedAdmins, { isActive: false });
          break;
        case 'delete':
          await adminApi.bulkDeleteUsers(selectedAdmins);
          break;
        default:
          throw new Error('Unknown bulk action');
      }
      
      setSelectedAdmins([]);
      await fetchAdmins();
      await fetchAdminStats();
      
    } catch (error: any) {
      console.error(`Error performing bulk ${action}:`, error);
      setError(error.response?.data?.message || `Failed to ${action} admins`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'text-red-700 bg-red-100';
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'inactive': return 'text-gray-700 bg-gray-100';
      case 'pending': return 'text-yellow-700 bg-yellow-100';
      case 'suspended': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getAdminLevelColor = (level: string) => {
    switch (level) {
      case 'super': return 'text-red-700 bg-red-100';
      case 'senior': return 'text-purple-700 bg-purple-100';
      case 'junior': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getAdminLevelIcon = (level: string) => {
    switch (level) {
      case 'super': return faCrown;
      case 'senior': return faUserShield;
      case 'junior': return faUser;
      default: return faUser;
    }
  };

  const getSortIcon = (column: string) => {
    if (filters.sortBy !== column) return faSort;
    return filters.sortOrder === 'asc' ? faSortUp : faSortDown;
  };

  return (
    <AdminLayout 
      title="TIKTOK SHOP ADMIN"
      subtitle="Administrators Management"
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Administrators</h2>
            <p className="text-gray-600">Manage admin users and their permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Add Admin</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-600 hover:text-red-800 mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Admins</p>
              <p className="text-2xl font-bold text-gray-900">{adminStats.totalAdmins}</p>
              <p className="text-xs text-gray-500 mt-1">+{adminStats.newAdminsThisMonth} this month</p>
            </div>
            <FontAwesomeIcon icon={faUserShield} className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Admins</p>
              <p className="text-2xl font-bold text-green-600">{adminStats.activeAdmins}</p>
              <p className="text-xs text-gray-500 mt-1">
                {adminStats.totalAdmins > 0 ? Math.round((adminStats.activeAdmins / adminStats.totalAdmins) * 100) : 0}% of total
              </p>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Senior Admins</p>
              <p className="text-2xl font-bold text-red-600">{adminStats.seniorAdmins}</p>
              <p className="text-xs text-gray-500 mt-1">Full access</p>
            </div>
            <FontAwesomeIcon icon={faCrown} className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online Now</p>
              <p className="text-2xl font-bold text-purple-600">{adminStats.onlineAdmins}</p>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </div>
            <FontAwesomeIcon icon={faGlobe} className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins by name or email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Admin Level Filter */}
          <div className="relative">
            <select
              value={filters.adminLevel}
              onChange={(e) => handleFilterChange('adminLevel', e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="senior">Senior Admin</option>
              <option value="junior">Junior Admin</option>
            </select>
            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedAdmins.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedAdmins.length} admin{selectedAdmins.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={actionLoading === 'bulk'}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={actionLoading === 'bulk'}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => setSelectedAdmins([])}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admins Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading administrators...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedAdmins.length === admins.length && admins.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAdmins(admins.map(a => a._id));
                          } else {
                            setSelectedAdmins([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('fullName')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Administrator</span>
                        <FontAwesomeIcon icon={getSortIcon('fullName')} className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Joined</span>
                        <FontAwesomeIcon icon={getSortIcon('createdAt')} className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('lastLogin')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Last Active</span>
                        <FontAwesomeIcon icon={getSortIcon('lastLogin')} className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <FontAwesomeIcon icon={faUserShield} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No administrators found</p>
                      </td>
                    </tr>
                  ) : (
                    // Mock data for demonstration
                    [
                      {
                        _id: '1',
                        fullName: 'John Admin',
                        email: 'john@admin.com',
                        phoneNumber: '+1234567890',
                        role: 'admin' as const,
                        status: 'active' as const,
                        isActive: true,
                        isEmailVerified: true,
                        createdAt: '2024-01-01T00:00:00Z',
                        lastLogin: '2024-01-20T10:30:00Z',
                        adminLevel: 'super' as const,
                        permissions: {
                          userManagement: true,
                          productManagement: true,
                          orderManagement: true,
                          financeAccess: true,
                          systemSettings: true,
                          analyticsAccess: true,
                          contentManagement: true,
                          supportAccess: true,
                        }
                      },
                      {
                        _id: '2',
                        fullName: 'Jane Manager',
                        email: 'jane@admin.com',
                        phoneNumber: '+1234567891',
                        role: 'admin' as const,
                        status: 'active' as const,
                        isActive: true,
                        isEmailVerified: true,
                        createdAt: '2024-01-05T00:00:00Z',
                        lastLogin: '2024-01-19T14:20:00Z',
                        adminLevel: 'senior' as const,
                        permissions: {
                          userManagement: true,
                          productManagement: true,
                          orderManagement: true,
                          financeAccess: false,
                          systemSettings: false,
                          analyticsAccess: true,
                          contentManagement: true,
                          supportAccess: true,
                        }
                      }
                    ].map((admin) => (
                      <tr key={admin._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedAdmins.includes(admin._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAdmins(prev => [...prev, admin._id]);
                              } else {
                                setSelectedAdmins(prev => prev.filter(id => id !== admin._id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <FontAwesomeIcon icon={faUserShield} className="text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{admin.fullName}</div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                              {admin.phoneNumber && (
                                <div className="text-xs text-gray-400">{admin.phoneNumber}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <FontAwesomeIcon 
                              icon={getAdminLevelIcon(admin.adminLevel || 'junior')} 
                              className={`w-4 h-4 ${
                                admin.adminLevel === 'super' ? 'text-red-600' :
                                admin.adminLevel === 'senior' ? 'text-purple-600' : 'text-blue-600'
                              }`}
                            />
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAdminLevelColor(admin.adminLevel || 'junior')}`}>
                              {admin.adminLevel || 'junior'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(admin.status, admin.isActive)}`}>
                              {admin.isActive ? admin.status : 'inactive'}
                            </span>
                            {admin.isEmailVerified && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-700 bg-green-100">
                                Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {admin.permissions && Object.entries(admin.permissions).filter(([_, value]) => value).slice(0, 3).map(([key, _]) => (
                              <span key={key} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-blue-700 bg-blue-100">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </span>
                            ))}
                            {admin.permissions && Object.entries(admin.permissions).filter(([_, value]) => value).length > 3 && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-gray-700 bg-gray-100">
                                +{Object.entries(admin.permissions).filter(([_, value]) => value).length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowAdminModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="View Details"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowPermissionsModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-900 p-1"
                              title="Manage Permissions"
                            >
                              <FontAwesomeIcon icon={faKey} />
                            </button>
                            
                            <button
                              onClick={() => handleAdminAction(admin._id, 'toggleStatus', !admin.isActive)}
                              disabled={actionLoading === admin._id}
                              className={`p-1 transition-colors ${
                                admin.isActive 
                                  ? 'text-yellow-600 hover:text-yellow-900' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                              title={admin.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {actionLoading === admin._id ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                              ) : (
                                <FontAwesomeIcon icon={admin.isActive ? faToggleOff : faToggleOn} />
                              )}
                            </button>
                            
                            {admin.adminLevel !== 'super' && (
                              <button
                                onClick={() => setShowDeleteConfirm(admin._id)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Delete Admin"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Add New Administrator</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateAdmin();
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={newAdmin.fullName}
                      onChange={(e) => setNewAdmin(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={newAdmin.phoneNumber}
                      onChange={(e) => setNewAdmin(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Level</label>
                    <select
                      value={newAdmin.adminLevel}
                      onChange={(e) => setNewAdmin(prev => ({ ...prev, adminLevel: e.target.value as 'senior' | 'junior' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="junior">Junior Admin</option>
                      <option value="senior">Senior Admin</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-4">Permissions</label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(newAdmin.permissions).map(([key, value]) => (
                      <label key={key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNewAdmin(prev => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [key]: e.target.checked
                            }
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'create'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {actionLoading === 'create' && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                    <span>Create Admin</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin Details Modal */}
      {showAdminModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Administrator Details</h3>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-gray-900">{selectedAdmin.fullName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedAdmin.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedAdmin.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Admin Level</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAdminLevelColor(selectedAdmin.adminLevel || 'junior')}`}>
                        {selectedAdmin.adminLevel || 'junior'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedAdmin.status, selectedAdmin.isActive)}`}>
                        {selectedAdmin.isActive ? selectedAdmin.status : 'inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedAdmin.permissions && Object.entries(selectedAdmin.permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <FontAwesomeIcon 
                          icon={value ? faCheckCircle : faBan} 
                          className={`w-4 h-4 ${value ? 'text-green-600' : 'text-red-600'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Joined Date</label>
                  <p className="text-gray-900">{new Date(selectedAdmin.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Login</label>
                  <p className="text-gray-900">{selectedAdmin.lastLogin ? new Date(selectedAdmin.lastLogin).toLocaleDateString() : 'Never'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Administrator</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this administrator? This action cannot be undone and will revoke all their access permissions.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAdminAction(showDeleteConfirm, 'delete');
                  setShowDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Admins;