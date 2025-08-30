import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

// Country data with phone codes
const countries = [
  { code: 'US', name: 'United States', phone: '+1' },
  { code: 'CA', name: 'Canada', phone: '+1' },
  { code: 'GB', name: 'United Kingdom', phone: '+44' },
  { code: 'AU', name: 'Australia', phone: '+61' },
  { code: 'DE', name: 'Germany', phone: '+49' },
  { code: 'FR', name: 'France', phone: '+33' },
  { code: 'IN', name: 'India', phone: '+91' },
  { code: 'CN', name: 'China', phone: '+86' },
  { code: 'JP', name: 'Japan', phone: '+81' },
  { code: 'KR', name: 'South Korea', phone: '+82' },
  { code: 'SG', name: 'Singapore', phone: '+65' },
  { code: 'MY', name: 'Malaysia', phone: '+60' },
  { code: 'TH', name: 'Thailand', phone: '+66' },
  { code: 'ID', name: 'Indonesia', phone: '+62' },
  { code: 'PH', name: 'Philippines', phone: '+63' },
  { code: 'VN', name: 'Vietnam', phone: '+84' },
];

// Business types for admin to select
const adminBusinessTypes = [
  'Individual',
  'Business',
  'Corporation',
  'Partnership',
  'LLC',
  'Sole Proprietorship'
];
import {
  faSearch,
  faFilter,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faUser,
  faStore,
  faChartLine,
  faDollarSign,
  faShoppingBag,
  faUsers,
  faStar,
  faCreditCard,
  faCalendar,
  faMapMarkerAlt,
  faEnvelope,
  faPhone,
  faGlobe,
  faCog,
  faDownload,
  faPrint,
  faBell,
  faExclamationTriangle,
  faCheckCircle,
  faClock,
  faTruck,
  faBoxes,
  faWallet,
  faPiggyBank,
  faArrowUp,
  faArrowDown,
  faRefresh,
  faSync,
  faChartBar,
  faTable,
  faGrip,
  faList,
  faSpinner,
  faTimes,
  faSignInAlt,
  faImage,
  faIdCard
} from '@fortawesome/free-solid-svg-icons';

interface Seller {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  businessInfo?: {
    storeName: string;
    storeDescription?: string;
    businessType: string;
    logo?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
  };
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  analytics: {
    totalSales: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    averageOrderValue: number;
    conversionRate: number;
    customerSatisfaction: number;
    monthlyGrowth: number;
  };
  financial: {
    balance: number;
    pendingPayouts: number;
    totalEarnings: number;
    monthlyRevenue: number;
    profitMargin: number;
    refundRate: number;
  };
  performance: {
    rating: number;
    responseTime: number;
    fulfillmentRate: number;
    returnRate: number;
    customerReviews: number;
  };
}

interface SellerManagementFilters {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'verified' | 'unverified';
  businessType: string;
  performance: 'all' | 'high' | 'medium' | 'low';
  sortBy: 'name' | 'sales' | 'orders' | 'rating' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

const Sellers: React.FC = () => {
  const navigate = useNavigate();
  const { user, impersonateUser } = useAuth();
  
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SellerManagementFilters>({
    search: '',
    status: 'all',
    businessType: 'all',
    performance: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'cards'>('table');
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [editingSeller, setEditingSeller] = useState<string | null>(null);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<any>('');
  const [saving, setSaving] = useState(false);
  
  // Add Seller Modal State
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [addSellerForm, setAddSellerForm] = useState({
    storeName: '',
    storeAddress: '',
    country: 'US',
    phoneNumber: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessType: 'individual',
    website: '',
    storeDescription: ''
  });
  const [addSellerErrors, setAddSellerErrors] = useState<{[key: string]: string}>({});
  const [isAddingSeller, setIsAddingSeller] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [nicFile, setNicFile] = useState<File | null>(null);
  const [nicPreview, setNicPreview] = useState<string>('');

  // Fetch sellers data
  const fetchSellers = useCallback(async () => {
    try {
      console.log('🔄 Fetching sellers data...');
      setLoading(true);
      setError(null);
      
      const data = await adminApi.getSellers({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
      console.log('📊 API response:', data);
      // Fix: API returns 'sellers' field, not 'users'
      const users = data?.sellers || data?.users || [];
      console.log('👥 Raw users:', users);
      console.log('🔍 First user object:', users[0]);

      const mapped: Seller[] = users
        .filter((u: any) => {
          console.log('🔍 Processing user:', u);
          // Since this is the /admin/sellers endpoint, all users returned are sellers
          // No need to filter by role - just ensure the user object is valid
          const isValidUser = u && u._id && u.email;
          console.log('🔍 Is valid user?', isValidUser);
          return isValidUser;
        })
        .map((u: any) => ({
          _id: u._id,
          fullName: u.fullName || u.name || 'Unnamed',
          email: u.email || 'no-email',
          phone: u.phoneNumber || u.phone || '',
          businessInfo: {
            storeName: u.businessInfo?.storeName || 'Store',
            storeDescription: u.businessInfo?.storeDescription || '',
            businessType: u.businessInfo?.businessType || 'individual',
            website: u.businessInfo?.website || ''
          },
          role: u.role || 'seller', // Default to 'seller' since this endpoint returns sellers
          isVerified: Boolean(u.isEmailVerified || u.isVerified),
          isActive: Boolean(u.isActive !== false),
          createdAt: u.createdAt || new Date().toISOString(),
          lastLogin: u.lastLogin || '',
          analytics: {
            totalSales: 0,
            totalOrders: 0,
            totalProducts: 0,
            totalCustomers: 0,
            averageOrderValue: 0,
            conversionRate: 0,
            customerSatisfaction: 0,
            monthlyGrowth: 0
          },
          financial: {
            balance: 0,
            pendingPayouts: 0,
            totalEarnings: 0,
            monthlyRevenue: 0,
            profitMargin: 0,
            refundRate: 0
          },
          performance: {
            rating: 4,
            responseTime: 0,
            fulfillmentRate: 0,
            returnRate: 0,
            customerReviews: 0
          }
        }));

      console.log('🎯 Mapped sellers:', mapped);
      console.log('📊 Final sellers count:', mapped.length);
      setSellers(mapped);
      setFilteredSellers(mapped);

    } catch (err: any) {
      console.error('❌ Error fetching sellers:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      setError(err.response?.data?.message || err.message || 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array is correct here

  // Handle Add Seller form input changes
  const handleAddSellerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddSellerForm(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (addSellerErrors[name]) {
      setAddSellerErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setLogoFile(file);
        const url = URL.createObjectURL(file);
        setLogoPreview(url);
      } else {
        setAddSellerErrors(prev => ({ ...prev, logoFile: 'Please select an image file' }));
      }
    }
  };

  // Handle NIC upload
  const handleNicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setNicFile(file);
        if (file.type === 'application/pdf') {
          setNicPreview('PDF Document');
        } else {
          const url = URL.createObjectURL(file);
          setNicPreview(url);
        }
      } else {
        setAddSellerErrors(prev => ({ ...prev, nicFile: 'Please select an image or PDF file' }));
      }
    }
  };

  // Validate Add Seller form
  const validateAddSellerForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!addSellerForm.storeName.trim()) errors.storeName = 'Store name is required';
    if (!addSellerForm.storeAddress.trim()) errors.storeAddress = 'Store address is required';
    if (!addSellerForm.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!addSellerForm.fullName.trim()) errors.fullName = 'Full name is required';
    if (!addSellerForm.email.trim()) errors.email = 'Email is required';
    if (!addSellerForm.password) errors.password = 'Password is required';
    if (!addSellerForm.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    if (!addSellerForm.businessType.trim()) errors.businessType = 'Business type is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (addSellerForm.email && !emailRegex.test(addSellerForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (addSellerForm.password && addSellerForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    // Password confirmation
    if (addSellerForm.password !== addSellerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // File validation
    if (!logoFile) errors.logoFile = 'Store logo is required';
    if (!nicFile) errors.nicFile = 'NIC document is required';

    setAddSellerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Add Seller form submission
  const handleAddSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAddSellerForm()) {
      return;
    }

    setIsAddingSeller(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('storeName', addSellerForm.storeName);
      submitData.append('storeAddress', addSellerForm.storeAddress);
      submitData.append('country', addSellerForm.country);
      submitData.append('phoneNumber', addSellerForm.phoneNumber);
      submitData.append('fullName', addSellerForm.fullName);
      submitData.append('email', addSellerForm.email);
      submitData.append('password', addSellerForm.password);
      submitData.append('businessType', addSellerForm.businessType);
      submitData.append('website', addSellerForm.website);
      submitData.append('storeDescription', addSellerForm.storeDescription);
      submitData.append('role', 'seller');
      submitData.append('isActive', 'true');
      submitData.append('isEmailVerified', 'true');
      submitData.append('status', 'active');
      
      if (logoFile) submitData.append('logo', logoFile);
      if (nicFile) submitData.append('nicDocument', nicFile);

      // Make API call to create seller
      const response = await adminApi.createSeller(submitData);
      
      if (response.success) {
        // Close modal and refresh sellers list
        setShowAddSellerModal(false);
        resetAddSellerForm();
        fetchSellers();
        // Show success message
        alert('Seller created successfully!');
      } else {
        setAddSellerErrors({ submit: response.message || 'Failed to create seller. Please try again.' });
      }
    } catch (error: any) {
      console.error('Create seller error:', error);
      
      let errorMessage = 'Failed to create seller. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setAddSellerErrors({ submit: errorMessage });
    } finally {
      setIsAddingSeller(false);
    }
  };

  // Reset Add Seller form
  const resetAddSellerForm = () => {
    setAddSellerForm({
      storeName: '',
      storeAddress: '',
      country: 'US',
      phoneNumber: '',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      businessType: 'individual',
      website: '',
      storeDescription: ''
    });
    setAddSellerErrors({});
    setLogoFile(null);
    setLogoPreview('');
    setNicFile(null);
    setNicPreview('');
  };

  const handleLoginAsSeller = useCallback(async (seller: Seller) => {
    try {
      await impersonateUser(seller._id);
      // Redirect to seller dashboard with shop name for admin impersonation
      const shopName = seller.businessInfo?.storeName || seller.fullName?.toLowerCase().replace(/\s+/g, '') || 'default';
      navigate(`/dashboard/${shopName}`);
    } catch (error) {
      console.error('Failed to impersonate seller:', error);
      // You can add a toast notification here if you have one
    }
  }, [impersonateUser, navigate]);

  useEffect(() => {
    console.log('🚀 useEffect triggered - calling fetchSellers');
    fetchSellers();
  }, []); // Remove fetchSellers dependency to prevent infinite loop

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...sellers];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(seller =>
        seller.fullName.toLowerCase().includes(filters.search.toLowerCase()) ||
        seller.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        seller.businessInfo?.storeName.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(seller => {
        switch (filters.status) {
          case 'active': return seller.isActive;
          case 'inactive': return !seller.isActive;
          case 'verified': return seller.isVerified;
          case 'unverified': return !seller.isVerified;
          default: return true;
        }
      });
    }

    // Business type filter
    if (filters.businessType !== 'all') {
      filtered = filtered.filter(seller => 
        seller.businessInfo?.businessType === filters.businessType
      );
    }

    // Performance filter
    if (filters.performance !== 'all') {
      filtered = filtered.filter(seller => {
        const rating = seller.performance.rating;
        switch (filters.performance) {
          case 'high': return rating >= 4.5;
          case 'medium': return rating >= 3.5 && rating < 4.5;
          case 'low': return rating < 3.5;
          default: return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.fullName;
          bValue = b.fullName;
          break;
        case 'sales':
          aValue = a.analytics.totalSales;
          bValue = b.analytics.totalSales;
          break;
        case 'orders':
          aValue = a.analytics.totalOrders;
          bValue = b.analytics.totalOrders;
          break;
        case 'rating':
          aValue = a.performance.rating;
          bValue = b.performance.rating;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = a.fullName;
          bValue = b.fullName;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSellers(filtered);
  }, [sellers, filters]);

  // Handle bulk actions
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'verify' | 'unverify' | 'delete') => {
    if (selectedSellers.length === 0) return;
    
    try {
      setSaving(true);
      
      // Update local state
      const updatedSellers = sellers.map(seller => {
        if (selectedSellers.includes(seller._id)) {
      switch (action) {
        case 'activate':
              return { ...seller, isActive: true };
        case 'deactivate':
              return { ...seller, isActive: false };
            case 'verify':
              return { ...seller, isVerified: true };
            case 'unverify':
              return { ...seller, isVerified: false };
        default:
              return seller;
          }
        }
        return seller;
      });

      if (action === 'delete') {
        setSellers(sellers.filter(seller => !selectedSellers.includes(seller._id)));
      } else {
        setSellers(updatedSellers);
      }

      setSelectedSellers([]);
      setShowBulkActions(false);

      // Here you would make API calls to update the backend
      console.log(`Bulk action ${action} applied to ${selectedSellers.length} sellers`);

    } catch (err) {
      console.error('Error applying bulk action:', err);
      setError('Failed to apply bulk action');
    } finally {
      setSaving(false);
    }
  };

  // Handle real-time analytics editing
  const startEditing = (sellerId: string, field: string, value: any) => {
    setEditingSeller(sellerId);
    setEditField(field);
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingSeller || !editField) return;

    try {
      setSaving(true);
      
      // Update local state
      const updatedSellers = sellers.map(seller => {
        if (seller._id === editingSeller) {
          const updatedSeller = { ...seller };
          const fieldPath = editField.split('.');
          let current: any = updatedSeller;
          
          for (let i = 0; i < fieldPath.length - 1; i++) {
            current = current[fieldPath[i]];
          }
          current[fieldPath[fieldPath.length - 1]] = editValue;
          
          return updatedSeller;
        }
        return seller;
      });

      setSellers(updatedSellers);
      setEditingSeller(null);
      setEditField('');
      setEditValue('');

      // Here you would make API calls to update the backend
      console.log(`Updated ${editField} for seller ${editingSeller} to ${editValue}`);

    } catch (err) {
      console.error('Error saving edit:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingSeller(null);
    setEditField('');
    setEditValue('');
  };

  // Get business types for filter
  const businessTypes = Array.from(new Set(sellers.map(seller => seller.businessInfo?.businessType).filter(Boolean)));

  if (loading) {
    return (
      <AdminLayout title="Seller Management" subtitle="Manage and monitor all sellers in the platform">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sellers...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Seller Management" subtitle="Manage and monitor all sellers in the platform">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Sellers</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchSellers}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Seller Management" subtitle="Manage and monitor all sellers in the platform">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faUsers} className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sellers</p>
                <p className="text-2xl font-bold text-gray-900">{sellers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faCheckCircle} className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sellers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sellers.filter(s => s.isActive).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faStar} className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verified Sellers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sellers.filter(s => s.isVerified).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(sellers.reduce((acc, s) => acc + s.performance.rating, 0) / sellers.length || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Filters & Controls</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchSellers}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <FontAwesomeIcon icon={faRefresh} className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button 
                onClick={() => setShowAddSellerModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                <span>Add Seller</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search sellers..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            {/* Business Type Filter */}
            <div>
              <select
                value={filters.businessType}
                onChange={(e) => setFilters(prev => ({ ...prev, businessType: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {businessTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Performance Filter */}
            <div>
              <select
                value={filters.performance}
                onChange={(e) => setFilters(prev => ({ ...prev, performance: e.target.value as any }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Performance</option>
                <option value="high">High (4.5+)</option>
                <option value="medium">Medium (3.5-4.5)</option>
                <option value="low">Low (&lt;3.5)</option>
              </select>
            </div>
          </div>

          {/* Additional Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Sort Controls */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">Name</option>
                  <option value="sales">Sales</option>
                  <option value="orders">Orders</option>
                  <option value="rating">Rating</option>
                  <option value="createdAt">Join Date</option>
                </select>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FontAwesomeIcon 
                    icon={filters.sortOrder === 'asc' ? faArrowUp : faArrowDown} 
                    className="w-4 h-4" 
                  />
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Table View"
                >
                  <FontAwesomeIcon icon={faTable} className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <FontAwesomeIcon icon={faGrip} className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'cards' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Card View"
                >
                  <FontAwesomeIcon icon={faList} className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedSellers.length > 0 && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">{selectedSellers.length} selected</span>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Bulk Actions
                </button>
              </div>
            )}
          </div>

          {/* Bulk Actions Menu */}
          {showBulkActions && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Apply to {selectedSellers.length} sellers:</span>
                <button
                  onClick={() => setShowBulkActions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={saving}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={saving}
                  className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('verify')}
                  disabled={saving}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Verify
                </button>
                <button
                  onClick={() => handleBulkAction('unverify')}
                  disabled={saving}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Unverify
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={saving}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sellers List */}
        <div className="space-y-6">
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedSellers.length === filteredSellers.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSellers(filteredSellers.map(s => s._id));
                            } else {
                              setSelectedSellers([]);
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Analytics</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Performance</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSellers.map((seller) => (
                      <tr key={seller._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSellers.includes(seller._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSellers(prev => [...prev, seller._id]);
                              } else {
                                setSelectedSellers(prev => prev.filter(id => id !== seller._id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">{seller.fullName}</div>
                              <div className="text-sm text-gray-500">{seller.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{seller.businessInfo?.storeName}</div>
                          <div className="text-sm text-gray-500 capitalize">{seller.businessInfo?.businessType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-gray-500">Sales: </span>
                              <span className="font-semibold text-gray-900">${seller.analytics.totalSales.toLocaleString()}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-500">Orders: </span>
                              <span className="font-semibold text-gray-900">{seller.analytics.totalOrders}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FontAwesomeIcon
                                  key={star}
                                  icon={faStar}
                                  className={`w-4 h-4 ${
                                    star <= seller.performance.rating
                                      ? 'text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">({seller.performance.rating.toFixed(1)})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-2">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              seller.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {seller.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              seller.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {seller.isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/admin/sellers/${seller._id}`}
                              state={{ seller }}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleLoginAsSeller(seller)}
                              className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="Login as Seller"
                            >
                              <FontAwesomeIcon icon={faSignInAlt} className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSellers.map((seller) => (
                <div key={seller._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faUser} className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{seller.fullName}</h3>
                        <p className="text-sm text-gray-500">{seller.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesomeIcon
                          key={star}
                          icon={faStar}
                          className={`w-3 h-3 ${
                            star <= seller.performance.rating
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Sales:</span>
                      <span className="font-semibold text-gray-900">${seller.analytics.totalSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Orders:</span>
                      <span className="font-semibold text-gray-900">{seller.analytics.totalOrders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rating:</span>
                      <span className="font-semibold text-gray-900">{seller.performance.rating.toFixed(1)}/5</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        seller.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {seller.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        seller.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {seller.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleLoginAsSeller(seller)}
                        className="text-green-600 hover:text-green-900 text-sm font-medium hover:underline flex items-center space-x-1"
                        title="Login as Seller"
                      >
                        <FontAwesomeIcon icon={faSignInAlt} className="w-3 h-3" />
                        <span>Login as Seller</span>
                      </button>
                      <Link
                        to={`/admin/sellers/${seller._id}`}
                        state={{ seller }}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="space-y-4">
              {filteredSellers.map((seller) => (
                <div key={seller._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faUser} className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{seller.fullName}</h3>
                        <p className="text-gray-500">{seller.email}</p>
                        <p className="text-sm text-gray-400">{seller.businessInfo?.storeName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">${seller.analytics.totalSales.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Total Sales</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{seller.analytics.totalOrders}</div>
                      <div className="text-sm text-gray-500">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{seller.analytics.totalCustomers}</div>
                      <div className="text-sm text-gray-500">Customers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{seller.performance.rating.toFixed(1)}</div>
                      <div className="text-sm text-gray-500">Rating</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {seller.analytics.monthlyGrowth > 0 ? '+' : ''}{seller.analytics.monthlyGrowth.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500">Growth</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="flex space-x-2">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        seller.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {seller.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        seller.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {seller.isVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 rounded-lg">
                        <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleLoginAsSeller(seller)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
                        title="Login as Seller"
                      >
                        <FontAwesomeIcon icon={faSignInAlt} className="w-3 h-3" />
                        <span>Login as Seller</span>
                      </button>
                      <Link
                        to={`/admin/sellers/${seller._id}`}
                        state={{ seller }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingSeller && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Analytics</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editField.split('.').pop()?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
            {/* Add Seller Modal */}
        {showAddSellerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-800">Add New Seller</h3>
                  <button
                    onClick={() => {
                      setShowAddSellerModal(false);
                      resetAddSellerForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-gray-600 mt-2">Create a new seller account with all required information</p>
              </div>
              
              <form onSubmit={handleAddSellerSubmit} className="p-6 space-y-6">
                {/* Submit Error */}
                {addSellerErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-3" />
                      <span className="text-red-700 font-medium">{addSellerErrors.submit}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Store Information */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                      <FontAwesomeIcon icon={faStore} className="text-blue-600 mr-2" />
                      Store Information
                    </h4>

                    {/* Store Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Name *
                      </label>
                      <input
                        type="text"
                        name="storeName"
                        value={addSellerForm.storeName}
                        onChange={handleAddSellerInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter store name"
                      />
                      {addSellerErrors.storeName && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.storeName}</p>
                      )}
                    </div>

                    {/* Store Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Description
                      </label>
                      <textarea
                        name="storeDescription"
                        value={addSellerForm.storeDescription}
                        onChange={handleAddSellerInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter store description"
                      />
                    </div>

                    {/* Business Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Type *
                      </label>
                      <select
                        name="businessType"
                        value={addSellerForm.businessType}
                        onChange={handleAddSellerInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {adminBusinessTypes.map(type => (
                          <option key={type} value={type.toLowerCase()}>{type}</option>
                        ))}
                      </select>
                      {addSellerErrors.businessType && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.businessType}</p>
                      )}
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={addSellerForm.website}
                        onChange={handleAddSellerInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com"
                      />
                    </div>

                    {/* Store Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Address *
                      </label>
                      <textarea
                        name="storeAddress"
                        value={addSellerForm.storeAddress}
                        onChange={handleAddSellerInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter complete store address"
                      />
                      {addSellerErrors.storeAddress && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.storeAddress}</p>
                      )}
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country *
                      </label>
                      <select
                        name="country"
                        value={addSellerForm.country}
                        onChange={handleAddSellerInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <div className="flex space-x-3">
                        <div className="w-24 px-3 py-3 bg-gray-100 border border-gray-300 rounded-lg text-center">
                          {countries.find(c => c.code === addSellerForm.country)?.phone || '+1'}
                        </div>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={addSellerForm.phoneNumber}
                          onChange={handleAddSellerInputChange}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter phone number"
                        />
                      </div>
                      {addSellerErrors.phoneNumber && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.phoneNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                      <FontAwesomeIcon icon={faUser} className="text-green-600 mr-2" />
                      Personal Information
                    </h4>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={addSellerForm.fullName}
                        onChange={handleAddSellerInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter full name"
                      />
                      {addSellerErrors.fullName && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.fullName}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={addSellerForm.email}
                        onChange={handleAddSellerInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter email address"
                      />
                      {addSellerErrors.email && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.email}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={addSellerForm.password}
                        onChange={handleAddSellerInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Create password (min 8 characters)"
                      />
                      {addSellerErrors.password && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.password}</p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={addSellerForm.confirmPassword}
                        onChange={handleAddSellerInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Confirm password"
                      />
                      {addSellerErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.confirmPassword}</p>
                      )}
                    </div>

                    {/* Store Logo Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Logo *
                      </label>
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <FontAwesomeIcon icon={faImage} className="text-gray-400 text-xl" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Recommended: 500x500px, JPG/PNG, Max 5MB
                          </p>
                        </div>
                      </div>
                      {addSellerErrors.logoFile && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.logoFile}</p>
                      )}
                    </div>

                    {/* NIC Document Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NIC Document *
                      </label>
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                          {nicPreview ? (
                            nicPreview === 'PDF Document' ? (
                              <div className="text-center">
                                <FontAwesomeIcon icon={faIdCard} className="text-gray-400 text-xl mb-1" />
                                <p className="text-xs text-gray-500">PDF</p>
                              </div>
                            ) : (
                              <img src={nicPreview} alt="NIC preview" className="w-full h-full object-cover rounded-lg" />
                            )
                          ) : (
                            <FontAwesomeIcon icon={faIdCard} className="text-gray-400 text-xl" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleNicUpload}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Accepted: JPG, PNG, PDF, Max 10MB
                          </p>
                        </div>
                      </div>
                      {addSellerErrors.nicFile && (
                        <p className="mt-1 text-sm text-red-500">{addSellerErrors.nicFile}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSellerModal(false);
                      resetAddSellerForm();
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingSeller}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAddingSeller ? (
                      <div className="flex items-center justify-center">
                        <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin mr-2" />
                        Creating Seller...
                      </div>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Create Seller
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </AdminLayout>
      );
    };
    
    export default Sellers;
