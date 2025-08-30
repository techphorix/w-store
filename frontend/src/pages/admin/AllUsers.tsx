import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faUsers,
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
  faUserShield,
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
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { adminApi } from '../../services/api';

// Types
interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'seller';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  businessInfo?: {
    storeName: string;
    storeDescription?: string;
    businessType: string;
    logo?: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
  lastLogin?: string;
  sellerId?: string;
  profileImage?: string; // Added for the new modal
  profileImageFile?: File; // Added for file upload
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  totalSellers: number;
  totalCustomers: number;
  totalAdmins: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

interface Filters {
  search: string;
  role: 'all' | 'admin' | 'seller';
  status: 'all' | 'active' | 'inactive' | 'pending' | 'suspended';
  sortBy: 'createdAt' | 'lastLogin' | 'fullName' | 'email';
  sortOrder: 'asc' | 'desc';
}

const AllUsers = () => {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    pendingUsers: 0,
    suspendedUsers: 0,
    totalSellers: 0,
    totalCustomers: 0,
    totalAdmins: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 20;
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState<{ userId: string; newRole: string; userName: string } | null>(null);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState<{ userId: string; userName: string } | null>(null);
  
  // Selected users for bulk operations
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchUserStats();
  }, []);

  // Auto-clear success messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Keyboard shortcuts for quick actions
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when no modals are open
      if (showUserModal || showDeleteConfirm || showRoleChangeConfirm || showSuspendConfirm) {
        return;
      }

      const key = event.key.toLowerCase();
      const selectedUser = users.find(user => selectedUsers.includes(user._id));
      
      if (!selectedUser) return;

      switch (key) {
        case 'v':
          event.preventDefault();
          setSelectedUser(selectedUser);
          setShowUserModal(true);
          break;
        case 'e':
          event.preventDefault();
          handleEditUser(selectedUser);
          break;
        case 'r':
          event.preventDefault();
          handleRoleChange(selectedUser);
          break;
        case 't':
          event.preventDefault();
          handleUserAction(selectedUser._id, 'toggleStatus', !selectedUser.isActive);
          break;
        case 'b':
          event.preventDefault();
          if (selectedUser.status !== 'suspended') {
            handleSuspendUser(selectedUser);
          }
          break;
        case 'u':
          event.preventDefault();
          if (selectedUser.status === 'suspended') {
            handleUserAction(selectedUser._id, 'unsuspend');
          }
          break;
        case 'd':
          event.preventDefault();
          setShowDeleteConfirm(selectedUser._id);
          break;
        case 's':
          event.preventDefault();
          if (selectedUser.role === 'seller' && selectedUser.businessInfo?.storeName) {
            window.open(`/shop/${selectedUser.businessInfo.storeName}`, '_blank');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [users, selectedUsers, showUserModal, showDeleteConfirm, showRoleChangeConfirm, showSuspendConfirm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search || undefined,
        role: filters.role !== 'all' ? filters.role : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      const response = await adminApi.getAllUsers(params);
      
      setUsers(response.users || []);
      setTotalPages(response.totalPages || 1);
      setTotalUsers(response.total || 0);
      
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const stats = await adminApi.getUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Set default values on error to prevent crashes
      setUserStats({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        pendingUsers: 0,
        suspendedUsers: 0,
        totalSellers: 0,
        totalCustomers: 0,
        totalAdmins: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
      });
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

  const handleUserAction = async (userId: string, action: string, value?: any) => {
    try {
      setActionLoading(userId);
      setError(null); // Clear previous errors
      
      switch (action) {
        case 'toggleStatus':
          await adminApi.updateUserStatus(userId, value);
          break;
        case 'changeRole':
          await adminApi.updateUserRole(userId, value);
          break;
        case 'suspend':
          await adminApi.suspendUser(userId, value.reason, value.duration);
          break;
        case 'unsuspend':
          await adminApi.unsuspendUser(userId);
          break;
        case 'delete':
          await adminApi.deleteUser(userId);
          break;
        default:
          throw new Error('Unknown action');
      }
      
      // Refresh data
      await fetchUsers();
      await fetchUserStats();
      
      // Show success message based on action
      const actionNames = {
        'toggleStatus': value ? 'activated' : 'deactivated',
        'changeRole': 'role changed',
        'suspend': 'banned/suspended',
        'unsuspend': 'access restored',
        'delete': 'deleted'
      };
      setSuccessMessage(`User ${actionNames[action as keyof typeof actionNames] || action} successfully.`);
      
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      const errorMessage = error.response?.data?.message || `Failed to ${action} user`;
      setError(errorMessage);
      
      // Auto-clear error after 8 seconds
      setTimeout(() => {
        setError(null);
      }, 8000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedUsers.length === 0) return;
    
    try {
      setActionLoading('bulk');
      
      switch (action) {
        case 'activate':
          await adminApi.bulkUpdateUsers(selectedUsers, { isActive: true });
          break;
        case 'deactivate':
          await adminApi.bulkUpdateUsers(selectedUsers, { isActive: false });
          break;
        case 'delete':
          await adminApi.bulkDeleteUsers(selectedUsers);
          break;
        default:
          throw new Error('Unknown bulk action');
      }
      
      setSelectedUsers([]);
      await fetchUsers();
      await fetchUserStats();
      setSuccessMessage(`Bulk ${action} successfully.`);
      
    } catch (error: any) {
      console.error(`Error performing bulk ${action}:`, error);
      setError(error.response?.data?.message || `Failed to ${action} users`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async () => {
    try {
      const params = {
        role: filters.role !== 'all' ? filters.role : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        format: 'csv'
      };
      
      const data = await adminApi.exportUsers(params);
      
      // Create and download file
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Error exporting users:', error);
      setError(error.response?.data?.message || 'Failed to export users');
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-purple-700 bg-purple-100';
      case 'seller': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getSortIcon = (column: string) => {
    if (filters.sortBy !== column) return faSort;
    return filters.sortOrder === 'asc' ? faSortUp : faSortDown;
  };

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleRoleChange = (user: User) => {
    const newRole = user.role === 'admin' ? 'seller' : 'admin';
    setShowRoleChangeConfirm({
      userId: user._id,
      newRole,
      userName: user.fullName
    });
  };

  const handleSuspendUser = (user: User) => {
    setShowSuspendConfirm({
      userId: user._id,
      userName: user.fullName
    });
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      setActionLoading(updatedUser._id);
      setError(null);
      
      // If there's a new profile image file, upload it first
      if (updatedUser.profileImageFile) {
        await adminApi.updateUserProfileImage(updatedUser._id, updatedUser.profileImageFile);
      }
      
      // Update other user information
      await adminApi.updateUser(updatedUser._id, {
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        status: updatedUser.status,
        isEmailVerified: updatedUser.isEmailVerified,
        isPhoneVerified: updatedUser.isPhoneVerified,
        businessInfo: updatedUser.businessInfo,
        address: updatedUser.address
      });
      
      // Refresh data
      await fetchUsers();
      await fetchUserStats();
      
      setSuccessMessage('User information updated successfully! All changes have been applied.');
      setShowEditModal(false);
      setEditingUser(null);
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError(error.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout 
      title="TIKTOK SHOP ADMIN"
      subtitle="All Users Management"
    >
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">All Users</h2>
        <p className="text-gray-600">Manage all registered users across the platform</p>
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

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-sm text-green-600 hover:text-green-800 mt-2"
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
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{(userStats?.totalUsers || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">+{userStats?.newUsersThisMonth || 0} this month</p>
            </div>
            <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{(userStats?.activeUsers || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {userStats?.totalUsers > 0 ? Math.round(((userStats?.activeUsers || 0) / userStats.totalUsers) * 100) : 0}% of total
              </p>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sellers</p>
              <p className="text-2xl font-bold text-blue-600">{(userStats?.totalSellers || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Business accounts</p>
            </div>
            <FontAwesomeIcon icon={faStore} className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{(userStats?.pendingUsers || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </div>
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">

      {/* Filters and Controls */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
                         <select
               value={filters.role}
               onChange={(e) => handleFilterChange('role', e.target.value)}
               className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
             >
               <option value="all">All Roles</option>
               <option value="admin">Admins</option>
               <option value="seller">Sellers</option>
             </select>
            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
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

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faDownload} />
            <span>Export</span>
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-800">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={actionLoading === 'bulk'}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'bulk' ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                  )}
                  Activate All
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={actionLoading === 'bulk'}
                  className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'bulk' ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faToggleOff} className="mr-2" />
                  )}
                  Deactivate All
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
                      handleBulkAction('delete');
                    }
                  }}
                  disabled={actionLoading === 'bulk'}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'bulk' ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                  )}
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faInfoCircle} className="text-gray-500" />
              <span className="text-sm text-gray-600">Keyboard Shortcuts:</span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">V</kbd> View</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">E</kbd> Edit</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">R</kbd> Role</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">T</kbd> Toggle</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">B</kbd> Ban</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">D</kbd> Delete</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">S</kbd> Shop</span>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="relative overflow-hidden bg-white shadow-sm rounded-lg border border-gray-200">
          {/* Helpful Note about User Actions */}
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-start space-x-2">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">User Management Actions:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>Toggle Status Button</strong> (⚡): Quickly activate/deactivate users (status: active ↔ inactive)</li>
                  <li>• <strong>Ban/Suspend Button</strong> (🚫): In dropdown menu - completely ban users from platform access (status: suspended)</li>
                  <li>• <strong>Restore Access</strong> (✅): In dropdown menu - restore suspended users to active status</li>
                </ul>
              </div>
            </div>
          </div>
          
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600" />
                <span className="text-blue-600">Loading users...</span>
              </div>
            </div>
          )}
        
        <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(users.map(user => user._id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Info
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
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <FontAwesomeIcon icon={faUsers} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No users found</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(prev => [...prev, user._id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user._id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {user.profileImage ? (
                                <img className="h-10 w-10 rounded-full object-cover" src={user.profileImage} alt="" />
                              ) : user.businessInfo?.logo ? (
                                <img className="h-10 w-10 rounded-full object-cover" src={user.businessInfo.logo} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <FontAwesomeIcon icon={faUser} className="text-gray-600" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              {user.phoneNumber && (
                                <div className="text-xs text-gray-400">{user.phoneNumber}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status, user.isActive)}`}>
                              {user.isActive ? user.status : 'inactive'}
                            </span>
                            {user.isEmailVerified && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-700 bg-green-100">
                                Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.businessInfo?.storeName ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.businessInfo.storeName}</div>
                              <div className="text-sm text-gray-500">{user.businessInfo.businessType}</div>
                              {user.sellerId && (
                                <div className="text-xs text-gray-400">{user.sellerId}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No business info</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {/* Quick Actions Menu */}
                            <div className="relative group">
                              <button 
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                title="Quick Actions (Press Enter to open)"
                                aria-label="Quick actions menu"
                                aria-haspopup="true"
                                aria-expanded="false"
                              >
                                <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                              </button>
                              
                              {/* Dropdown Menu */}
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                                <div className="py-1">
                                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                                    Quick Actions
                                  </div>
                                  
                                  <button
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowUserModal(true);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 focus:outline-none focus:bg-gray-100"
                                    title="View user details (V)"
                                  >
                                    <FontAwesomeIcon icon={faEye} className="w-4 h-4 text-blue-600" />
                                    <span>View Details</span>
                                    <span className="ml-auto text-xs text-gray-400">V</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 focus:outline-none focus:bg-gray-100"
                                    title="Edit user information (E)"
                                  >
                                    <FontAwesomeIcon icon={faEdit} className="w-4 h-4 text-green-600" />
                                    <span>Edit User</span>
                                    <span className="ml-auto text-xs text-gray-400">E</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => handleRoleChange(user)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 focus:outline-none focus:bg-gray-100"
                                    title="Change user role (R)"
                                  >
                                    <FontAwesomeIcon icon={faUserShield} className="w-4 h-4 text-purple-600" />
                                    <span>Change Role</span>
                                    <span className="ml-auto text-xs text-gray-400">R</span>
                                  </button>
                                  
                                  {user.role === 'seller' && user.businessInfo?.storeName && (
                                    <Link
                                      to={`/shop/${user.businessInfo.storeName}`}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 focus:outline-none focus:bg-gray-100"
                                      title="View user's shop (S)"
                                    >
                                      <FontAwesomeIcon icon={faStore} className="w-4 h-4 text-indigo-600" />
                                      <span>View Shop</span>
                                      <span className="ml-auto text-xs text-gray-400">S</span>
                                    </Link>
                                  )}
                                  
                                  <hr className="my-1" />
                                  
                                  <button
                                    onClick={() => handleUserAction(user._id, 'toggleStatus', !user.isActive)}
                                    disabled={actionLoading === user._id}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 focus:outline-none focus:bg-gray-100 ${
                                      actionLoading === user._id ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    title={`${user.isActive ? 'Deactivate' : 'Activate'} user (T)`}
                                  >
                                    {actionLoading === user._id ? (
                                      <FontAwesomeIcon icon={faSpinner} className="animate-spin w-4 h-4 text-gray-600" />
                                    ) : (
                                      <FontAwesomeIcon 
                                        icon={user.isActive ? faToggleOff : faToggleOn} 
                                        className={`w-4 h-4 ${user.isActive ? 'text-yellow-600' : 'text-green-600'}`} 
                                      />
                                    )}
                                    <span>{user.isActive ? 'Deactivate' : 'Activate'}</span>
                                    <span className="ml-auto text-xs text-gray-400">T</span>
                                  </button>
                                  
                                  {user.status === 'suspended' ? (
                                    <button
                                      onClick={() => handleUserAction(user._id, 'unsuspend')}
                                      disabled={actionLoading === user._id}
                                      className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 focus:outline-none focus:bg-gray-100 ${
                                        actionLoading === user._id ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title="Restore user access (U) - This will allow user to access the platform again"
                                    >
                                      <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" />
                                      <span>Restore Access</span>
                                      <span className="ml-auto text-xs text-gray-400">U</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSuspendUser(user)}
                                      disabled={actionLoading === user._id}
                                      className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 focus:outline-none focus:bg-gray-100 ${
                                        actionLoading === user._id ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title="Ban/Suspend user (B) - This will prevent user access to the platform"
                                    >
                                      <FontAwesomeIcon icon={faBan} className="w-4 h-4 text-orange-600" />
                                      <span>Ban/Suspend</span>
                                      <span className="ml-auto text-xs text-gray-400">B</span>
                                    </button>
                                  )}
                                  
                                  <hr className="my-1" />
                                  
                                  <button
                                    onClick={() => setShowDeleteConfirm(user._id)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 focus:outline-none focus:bg-red-50"
                                    title="Delete user (D)"
                                  >
                                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                    <span>Delete User</span>
                                    <span className="ml-auto text-xs text-gray-400">D</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Toggle Button (Quick Access) */}
                            <button
                              onClick={() => handleUserAction(user._id, 'toggleStatus', !user.isActive)}
                              disabled={actionLoading === user._id}
                              className={`group relative p-2 rounded-lg transition-all duration-200 ${
                                user.isActive 
                                  ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50' 
                                  : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                              } ${actionLoading === user._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={user.isActive ? 'Deactivate User (Quick - sets status to inactive)' : 'Activate User (Quick - sets status to active)'}
                            >
                              {actionLoading === user._id ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin w-4 h-4" />
                              ) : (
                                <FontAwesomeIcon icon={user.isActive ? faToggleOff : faToggleOn} className="w-4 h-4" />
                              )}
                            </button>
                            
                            {/* View Shop Button (only for sellers) */}
                            {user.role === 'seller' && user.businessInfo?.storeName && (
                              <Link
                                to={`/shop/${user.businessInfo.storeName}`}
                                className="group relative p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                                title="View Shop"
                              >
                                <FontAwesomeIcon icon={faStore} className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden">
                    {selectedUser.profileImage ? (
                      <img className="h-16 w-16 rounded-full object-cover" src={selectedUser.profileImage} alt="" />
                    ) : (
                      <FontAwesomeIcon icon={faUser} className="text-white text-2xl" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedUser.fullName}</h3>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                      </span>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedUser.status, selectedUser.isActive)}`}>
                        {selectedUser.isActive ? selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1) : 'Inactive'}
                      </span>
                      {selectedUser.isEmailVerified && (
                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full text-green-700 bg-green-100">
                          <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 mr-1" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FontAwesomeIcon icon={faUser} className="text-blue-600 mr-2" />
                      Basic Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Full Name</span>
                        <span className="text-sm text-gray-900 font-medium">{selectedUser.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Email</span>
                        <span className="text-sm text-gray-900 font-medium">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Phone</span>
                        <span className="text-sm text-gray-900 font-medium">{selectedUser.phoneNumber || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Role</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                          {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Status</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.status, selectedUser.isActive)}`}>
                          {selectedUser.isActive ? selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1) : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Email Verified</span>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedUser.isEmailVerified ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                        }`}>
                          {selectedUser.isEmailVerified ? (
                            <>
                              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 mr-1" />
                              Not Verified
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Phone Verified</span>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedUser.isPhoneVerified ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                        }`}>
                          {selectedUser.isPhoneVerified ? (
                            <>
                              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 mr-1" />
                              Not Verified
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedUser.businessInfo && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FontAwesomeIcon icon={faStore} className="text-green-600 mr-2" />
                        Business Information
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Store Name</span>
                          <span className="text-sm text-gray-900 font-medium">{selectedUser.businessInfo.storeName}</span>
                        </div>
                        <div className="flex justify-between items-start py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Description</span>
                          <span className="text-sm text-gray-900 font-medium max-w-xs text-right">
                            {selectedUser.businessInfo.storeDescription || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Business Type</span>
                          <span className="text-sm text-gray-900 font-medium">{selectedUser.businessInfo.businessType}</span>
                        </div>
                        {selectedUser.sellerId && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Seller ID</span>
                            <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{selectedUser.sellerId}</span>
                          </div>
                        )}
                        {selectedUser.businessInfo?.logo && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Store Logo</span>
                            <div className="flex items-center space-x-2">
                              <img className="h-8 w-8 rounded object-cover" src={selectedUser.businessInfo.logo} alt="Store logo" />
                              <span className="text-sm text-gray-900 font-medium">Logo set</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {selectedUser.address && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-600 mr-2" />
                        Address Information
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Street</span>
                          <span className="text-sm text-gray-900 font-medium">{selectedUser.address.street}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">City</span>
                          <span className="text-sm text-gray-900 font-medium">{selectedUser.address.city}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">State</span>
                          <span className="text-sm text-gray-900 font-medium">{selectedUser.address.state}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Zip Code</span>
                          <span className="text-sm text-gray-900 font-medium">{selectedUser.address.zipCode}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm font-medium text-gray-600">Country</span>
                          <span className="text-sm text-gray-900 font-medium">{selectedUser.address.country}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-600 mr-2" />
                      Account Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Joined Date</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Last Login</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {selectedUser.lastLogin ? 
                            new Date(selectedUser.lastLogin).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
                    <button
                      onClick={() => {
                        setShowUserModal(false);
                        handleEditUser(selectedUser);
                      }}
                      disabled={actionLoading === selectedUser._id}
                      className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors ${
                        actionLoading === selectedUser._id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {actionLoading === selectedUser._id ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-2" />
                          Edit User
                        </>
                      )}
                    </button>
                    {selectedUser.role === 'seller' && selectedUser.businessInfo?.storeName && (
                      <Link
                        to={`/shop/${selectedUser.businessInfo.storeName}`}
                        target="_blank"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faStore} className="w-4 h-4 mr-2" />
                        View Shop
                      </Link>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setShowUserModal(false);
                        handleRoleChange(selectedUser);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <FontAwesomeIcon icon={faUserShield} className="w-4 h-4 mr-2" />
                      Change Role
                    </button>
                    {selectedUser.status === 'suspended' ? (
                      <button
                        onClick={() => {
                          setShowUserModal(false);
                          handleUserAction(selectedUser._id, 'unsuspend');
                        }}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 mr-2" />
                        Restore Access
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowUserModal(false);
                          handleSuspendUser(selectedUser);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faBan} className="w-4 h-4 mr-2" />
                        Ban User
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <FontAwesomeIcon icon={faEdit} className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Edit User Information</h3>
                    <p className="text-gray-600">Update user details and business information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleUpdateUser(editingUser);
              }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FontAwesomeIcon icon={faUser} className="text-blue-600 mr-2" />
                        Basic Information
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden">
                            {editingUser.profileImageFile ? (
                              <img className="h-20 w-20 rounded-full object-cover" src={URL.createObjectURL(editingUser.profileImageFile)} alt="" />
                            ) : editingUser.profileImage ? (
                              <img className="h-20 w-20 rounded-full object-cover" src={editingUser.profileImage} alt="" />
                            ) : (
                              <FontAwesomeIcon icon={faUser} className="text-white text-2xl" />
                            )}
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && editingUser) {
                                      setEditingUser({ ...editingUser, profileImageFile: file });
                                    }
                                  }}
                                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {editingUser.profileImageFile && (
                                  <button
                                    type="button"
                                    onClick={() => editingUser && setEditingUser({ ...editingUser, profileImageFile: undefined })}
                                    className="px-3 py-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove selected file"
                                  >
                                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">Upload a new profile image (JPEG, PNG, WebP up to 5MB)</p>
                              {editingUser.profileImage && !editingUser.profileImageFile && (
                                <p className="text-xs text-blue-600">Current image: {editingUser.profileImage}</p>
                              )}
                              {editingUser.profileImageFile && (
                                <p className="text-xs text-green-600">New image selected: {editingUser.profileImageFile.name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                          <input
                            type="text"
                            value={editingUser.fullName}
                            onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter full name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                          <input
                            type="email"
                            value={editingUser.email}
                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={editingUser.phoneNumber || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Account Status *</label>
                          <select
                            value={editingUser.status}
                            onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            <option value="active">Active - User can access the platform</option>
                            <option value="inactive">Inactive - User account is disabled</option>
                            <option value="pending">Pending - Awaiting approval</option>
                            <option value="suspended">Suspended - User is banned from platform</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Choose the appropriate status for this user</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Verification</label>
                            <select
                              value={editingUser.isEmailVerified ? 'verified' : 'unverified'}
                              onChange={(e) => setEditingUser({ ...editingUser, isEmailVerified: e.target.value === 'verified' })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                              <option value="verified">Verified ✓</option>
                              <option value="unverified">Not Verified ✗</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Verification</label>
                            <select
                              value={editingUser.isPhoneVerified ? 'verified' : 'unverified'}
                              onChange={(e) => setEditingUser({ ...editingUser, isPhoneVerified: e.target.value === 'verified' })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                              <option value="verified">Verified ✓</option>
                              <option value="unverified">Not Verified ✗</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {editingUser.address && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-600 mr-2" />
                          Address Information
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                            <input
                              type="text"
                              value={editingUser.address.street || ''}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                address: { ...editingUser.address!, street: e.target.value }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter street address"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                              <input
                                type="text"
                                value={editingUser.address.city || ''}
                                onChange={(e) => setEditingUser({
                                  ...editingUser,
                                  address: { ...editingUser.address!, city: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter city"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                              <input
                                type="text"
                                value={editingUser.address.state || ''}
                                onChange={(e) => setEditingUser({
                                  ...editingUser,
                                  address: { ...editingUser.address!, state: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter state"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                              <input
                                type="text"
                                value={editingUser.address.zipCode || ''}
                                onChange={(e) => setEditingUser({
                                  ...editingUser,
                                  address: { ...editingUser.address!, zipCode: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter zip code"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                              <input
                                type="text"
                                value={editingUser.address.country || ''}
                                onChange={(e) => setEditingUser({
                                  ...editingUser,
                                  address: { ...editingUser.address!, country: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter country"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {editingUser.businessInfo && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <FontAwesomeIcon icon={faStore} className="text-green-600 mr-2" />
                          Business Information
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Store Name *</label>
                            <input
                              type="text"
                              value={editingUser.businessInfo.storeName}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                businessInfo: { ...editingUser.businessInfo!, storeName: e.target.value }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter store name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                            <input
                              type="text"
                              value={editingUser.businessInfo.businessType}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                businessInfo: { ...editingUser.businessInfo!, businessType: e.target.value }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="e.g., Retail, Wholesale, Service"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Store Description</label>
                            <textarea
                              value={editingUser.businessInfo.storeDescription || ''}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                businessInfo: { ...editingUser.businessInfo!, storeDescription: e.target.value }
                              })}
                              rows={4}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                              placeholder="Describe the business, products, or services offered..."
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional: Provide a detailed description of the business</p>
                          </div>
                          {editingUser.sellerId && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Seller ID</label>
                              <input
                                type="text"
                                value={editingUser.sellerId}
                                disabled
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                              />
                              <p className="text-xs text-gray-500 mt-1">This is a system-generated ID and cannot be changed</p>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Store Logo URL</label>
                            <input
                              type="url"
                              value={editingUser.businessInfo?.logo || ''}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                businessInfo: { ...editingUser.businessInfo!, logo: e.target.value }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="https://example.com/logo.png"
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional: URL for the store's logo image</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Business Information Notes:</p>
                            <ul className="space-y-1 text-blue-700">
                              <li>• Store name is used for the shop URL and display</li>
                              <li>• Business type helps categorize the seller</li>
                              <li>• Description appears on the seller's profile page</li>
                              <li>• Changes to business info will be reflected immediately</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === editingUser._id}
                    className={`px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium ${
                      actionLoading === editingUser._id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {actionLoading === editingUser._id ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                        Updating User...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                        Update User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      {showRoleChangeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faUserShield} className="text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Change User Role</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to change <strong>{showRoleChangeConfirm.userName}</strong>'s role from <strong>{showRoleChangeConfirm.newRole === 'admin' ? 'seller' : 'admin'}</strong> to <strong>{showRoleChangeConfirm.newRole}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRoleChangeConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUserAction(showRoleChangeConfirm.userId, 'changeRole', { role: showRoleChangeConfirm.newRole, reason: 'Role change requested by admin' });
                  setShowRoleChangeConfirm(null);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Confirmation Modal */}
      {showSuspendConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faBan} className="text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Ban/Suspend User</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to <strong>ban/suspend</strong> <strong>{showSuspendConfirm.userName}</strong>? 
              This will <strong>completely prevent them from accessing the platform</strong> until you restore their access.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSuspendConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUserAction(showSuspendConfirm.userId, 'suspend', { reason: 'User suspended for violating terms of service', duration: '7 days' });
                  setShowSuspendConfirm(null);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Ban User
              </button>
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
              <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone and will also remove all associated data.
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
                  handleUserAction(showDeleteConfirm, 'delete');
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

export default AllUsers;
