import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStore, 
  faSearch, 
  faFilter, 
  faEye, 
  faEdit, 
  faTrash,
  faSpinner,
  faExclamationTriangle,
  faCheck,
  faTimes,
  faGlobe,
  faUser,
  faCalendarAlt,
  faFileAlt,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';
import { 
  faInstagram,
  faFacebook,
  faTiktok
} from '@fortawesome/free-brands-svg-icons';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import EditModal from '../../components/EditModal'; // Added import for EditModal

interface Shop {
  id: string;
  full_name: string;
  email: string;
  business_info?: any;
  status: string;
  created_at: string;
  total_products: number;
  active_products: number;
  // Legacy support for backward compatibility
  _id?: string;
  storeName?: string;
  owner?: {
    _id: string;
    fullName: string;
    email: string;
  };
  businessType?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  seo?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  socialMedia?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  stats?: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    rating: number;
  };
}

const ShopControl = () => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { showToast } = useNotifications();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalShops, setTotalShops] = useState(0);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch shops from backend
  const fetchShops = async () => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the admin API to get all shops
      const response = await adminApi.getShops({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      });

      console.log('🔍 Fetched shops response:', response);
      
      // Show success message if shops were fetched
      if (response.shops && response.shops.length > 0) {
        showToast(`Loaded ${response.shops.length} shops`, 'info');
      }
      setShops(response.shops || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalShops(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching shops:', error);
      setError('Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [currentPage, searchTerm, statusFilter, typeFilter, isAuthenticated, currentUser]);

  // Debug: Monitor selectedShop changes
  useEffect(() => {
    console.log('🔍 selectedShop state changed:', selectedShop);
  }, [selectedShop]);

  // Debug: Monitor shops array changes
  useEffect(() => {
    console.log('🔍 shops array changed, length:', shops.length);
    if (shops.length > 0) {
      console.log('🔍 First shop in array:', shops[0]);
    }
  }, [shops]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchShops();
  };

  const handleToggleStatus = async (shopId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateShopStatus(shopId, !currentStatus);
      // Show success message
      showToast(`Shop status updated to ${!currentStatus ? 'active' : 'inactive'}`, 'success');
      fetchShops(); // Refresh the list
    } catch (error) {
      console.error('Error toggling shop status:', error);
      showToast('Failed to update shop status', 'error');
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    try {
      await adminApi.deleteShop(shopId);
      showToast('Shop deleted successfully', 'success');
      setShowDeleteModal(false);
      fetchShops(); // Refresh the list
    } catch (error) {
      console.error('Error deleting shop:', error);
      showToast('Failed to delete shop', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'business':
      case 'retail':
        return 'bg-blue-100 text-blue-800';
      case 'individual':
        return 'bg-green-100 text-green-800';
      case 'corporation':
        return 'bg-purple-100 text-purple-800';
      case 'wholesale':
        return 'bg-orange-100 text-orange-800';
      case 'service':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
              onClick={fetchShops}
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
          <h1 className="text-3xl font-bold text-gray-900">Shop Control</h1>
          <button
            onClick={fetchShops}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors duration-200"
          >
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4" />
            Refresh Shops
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search shops by name, owner, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="review">Under Review</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="service">Service</option>
              <option value="business">Business</option>
              <option value="individual">Individual</option>
              <option value="corporation">Corporation</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faSearch} />
              Search
            </button>
          </form>
        </div>

        {/* Shops Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Shops ({totalShops})
            </h2>
          </div>
          
          {shops.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Shops Found</h3>
              <p className="text-gray-600">No shops match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Social Media
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(shops || []).map((shop) => (
                    <tr key={shop.id || shop._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {shop.business_info?.logo ? (
                              <img 
                                src={shop.business_info.logo} 
                                alt="Shop Logo" 
                                className="h-10 w-10 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                                <FontAwesomeIcon icon={faStore} className="text-blue-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {shop.business_info?.business_name || shop.business_info?.storeName || shop.storeName || shop.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {shop.business_info?.description || shop.description || 'No description available'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            <FontAwesomeIcon icon={faUser} className="text-gray-500" />
                            {shop.full_name || shop.owner?.fullName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {shop.email || shop.owner?.email || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(shop.business_info?.business_type || shop.business_info?.businessType || shop.businessType || 'unknown')}`}>
                          {shop.business_info?.business_type || shop.business_info?.businessType || shop.businessType || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shop.status)}`}>
                          {shop.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {shop.total_products || 0} products
                          </div>
                          <div className="text-gray-500">
                            {shop.active_products || 0} active
                          </div>
                          {shop.stats && (
                            <div className="text-xs text-gray-400">
                              ${shop.stats.totalRevenue?.toLocaleString() || '0'} revenue
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(shop.business_info?.website || shop.business_info?.instagram || shop.business_info?.facebook || shop.business_info?.tiktok) ? (
                          <div className="flex gap-2">
                            {shop.business_info?.website && (
                              <a
                                href={shop.business_info.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="Website"
                              >
                                <FontAwesomeIcon icon={faGlobe} />
                              </a>
                            )}
                            {shop.business_info?.instagram && (
                              <span className="text-pink-600" title="Instagram">
                                <FontAwesomeIcon icon={faInstagram} />
                              </span>
                            )}
                            {shop.business_info?.facebook && (
                              <span className="text-blue-600" title="Facebook">
                                <FontAwesomeIcon icon={faGlobe} />
                              </span>
                            )}
                            {shop.business_info?.tiktok && (
                              <span className="text-black" title="TikTok">
                                <FontAwesomeIcon icon={faTiktok} />
                              </span>
                            )}
                            {!shop.business_info?.website && !shop.business_info?.instagram && !shop.business_info?.facebook && !shop.business_info?.tiktok && (
                              <span className="text-gray-400 text-xs">No social media</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No social media</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
                          {shop.created_at || shop.createdAt ? new Date(shop.created_at || shop.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedShop(shop)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                // Verify the shop still exists before opening edit modal
                                const shopId = shop.id || shop._id;
                                console.log('🔍 Verifying shop exists:', shopId);
                                
                                // Check if shop exists by making a quick API call
                                await adminApi.getShop(shopId);
                                
                                setSelectedShop(shop);
                                setShowEditModal(true);
                              } catch (error) {
                                console.error('Shop verification failed:', error);
                                if (error.response?.status === 404) {
                                  alert('This shop no longer exists in the database. The page will refresh to show current data.');
                                } else {
                                  alert('Unable to verify shop. Please refresh the page and try again.');
                                }
                                fetchShops(); // Refresh the shops list
                              }
                            }}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Edit Shop"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedShop(shop);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Shop"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* No Data Message */}
        {!loading && shops.length === 0 && totalShops === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Shops Available</h3>
            <p className="text-gray-600">Shops will appear here once sellers create them.</p>
          </div>
        )}

        {/* Shop View Modal */}
        {selectedShop && !showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Shop Details</h2>
                <button
                  onClick={() => setSelectedShop(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Shop Logo</label>
                      <div className="mt-1">
                        {selectedShop.business_info?.logo ? (
                          <img 
                            src={selectedShop.business_info.logo} 
                            alt="Shop Logo" 
                            className="h-16 w-16 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-gray-200 rounded-lg border flex items-center justify-center">
                            <FontAwesomeIcon icon={faStore} className="text-gray-400 text-xl" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Shop Name</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedShop.business_info?.business_name || selectedShop.business_info?.storeName || selectedShop.storeName || selectedShop.full_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedShop.full_name || selectedShop.owner?.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedShop.email || selectedShop.owner?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Type</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedShop.business_info?.business_type || selectedShop.business_info?.businessType || selectedShop.businessType || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedShop.status)}`}>
                        {selectedShop.status}
                      </span>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Business Details</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedShop.business_info?.description || selectedShop.description || 'No description available'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedShop.created_at || selectedShop.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Products</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedShop.total_products || 0} total, {selectedShop.active_products || 0} active
                      </p>
                    </div>
                    {selectedShop.stats && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Revenue</label>
                        <p className="mt-1 text-sm text-gray-900">
                          ${selectedShop.stats.totalRevenue?.toLocaleString() || '0'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Social Media */}
                  {(selectedShop.business_info?.website || selectedShop.business_info?.instagram || selectedShop.business_info?.facebook || selectedShop.business_info?.tiktok) && (
                    <div className="space-y-4 md:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Social Media</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {selectedShop.business_info?.website && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Website</label>
                            <a
                              href={selectedShop.business_info.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 text-sm text-blue-600 hover:text-blue-800 break-all"
                            >
                              {selectedShop.business_info.website}
                            </a>
                          </div>
                        )}
                        {selectedShop.business_info?.instagram && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Instagram</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedShop.business_info.instagram}</p>
                          </div>
                        )}
                        {selectedShop.business_info?.facebook && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Facebook</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedShop.business_info.facebook}</p>
                          </div>
                        )}
                        {selectedShop.business_info?.tiktok && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">TikTok</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedShop.business_info.tiktok}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Shop
                </button>
                <button
                  onClick={() => setSelectedShop(null)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shop Edit Modal */}
        {showEditModal && selectedShop && (
          <EditModal
            key={`edit-modal-${selectedShop.id || selectedShop._id}-${JSON.stringify(selectedShop.business_info)}`}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedShop(null);
            }}
            title="Edit Shop"
            data={{
              business_name: selectedShop.business_info?.business_name || selectedShop.business_info?.storeName || selectedShop.storeName || selectedShop.full_name || '',
              business_type: selectedShop.business_info?.business_type || selectedShop.business_info?.businessType || selectedShop.businessType || '',
              description: selectedShop.business_info?.description || selectedShop.description || '',
              status: selectedShop.status,
              logo: selectedShop.business_info?.logo || '',
              website: selectedShop.business_info?.website || '',
              instagram: selectedShop.business_info?.instagram || '',
              facebook: selectedShop.business_info?.facebook || '',
              tiktok: selectedShop.business_info?.tiktok || ''
            }}
            fields={[
              {
                key: 'business_name',
                label: 'Shop Name',
                type: 'text',
                required: true,
                placeholder: 'Enter shop name',
                icon: faStore
              },
              {
                key: 'business_type',
                label: 'Business Type',
                type: 'select',
                required: true,
                options: [
                  { value: 'retail', label: 'Retail' },
                  { value: 'wholesale', label: 'Wholesale' },
                  { value: 'service', label: 'Service' },
                  { value: 'business', label: 'Business' },
                  { value: 'individual', label: 'Individual' },
                  { value: 'corporation', label: 'Corporation' }
                ],
                icon: faBuilding
              },
              {
                key: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Enter shop description',
                rows: 4,
                icon: faFileAlt
              },
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'suspended', label: 'Suspended' }
                ]
              },
              {
                key: 'logo',
                label: 'Store Logo',
                type: 'image',
                accept: 'image/*',
                maxSize: 5,
                helperText: selectedShop.business_info?.logo ? `Current logo: ${selectedShop.business_info.logo}. Upload a new file to replace it.` : 'Upload a logo image (JPEG, PNG, WebP). Max size: 5MB.',
                required: false
              },

              {
                key: 'social_media',
                label: 'Social Media & Website',
                type: 'social_media_group',
                fields: [
                  {
                    key: 'website',
                    label: 'Website',
                    placeholder: 'Website URL',
                    icon: faGlobe
                  },
                  {
                    key: 'instagram',
                    label: 'Instagram',
                    placeholder: 'Instagram URL',
                    icon: faInstagram
                  },
                  {
                    key: 'facebook',
                    label: 'Facebook',
                    placeholder: 'Facebook URL',
                    icon: faFacebook
                  },
                  {
                    key: 'tiktok',
                    label: 'TikTok',
                    placeholder: 'TikTok URL',
                    icon: faTiktok
                  }
                ]
              }
            ]}
            onSave={async (formData) => {
              try {
                // Create FormData for file upload
                const submitData = new FormData();
                
                // Add all form fields
                Object.keys(formData).forEach(key => {
                  if (key === 'logo' && formData[key] instanceof File) {
                    submitData.append('logo', formData[key]);
                  } else if (key === 'logo' && !formData[key]) {
                    // Skip empty logo field if no file
                    return;
                  } else if (key !== 'logo') {
                    // Only add non-empty values to avoid validation errors
                    // Skip empty strings for URL fields and other optional fields
                    if (formData[key] && formData[key].trim() !== '') {
                      submitData.append(key, formData[key]);
                    }
                  }
                });
                
                // Debug: Log what's being sent
                console.log('🔍 FormData contents:');
                for (let [key, value] of submitData.entries()) {
                  console.log(`  ${key}: ${value}`);
                }
                
                // Debug: Log the actual data being sent to backend
                console.log('🔍 Data being sent to backend:');
                const dataToSend: any = {};
                for (let [key, value] of submitData.entries()) {
                  dataToSend[key] = value;
                }
                console.log('🔍 Final data object:', dataToSend);
                
                // Debug: Log the original form data
                console.log('🔍 Original form data:', formData);
                console.log('🔍 Selected shop before update:', selectedShop);
                
                // Validate that required fields are present
                const requiredFields = ['business_name', 'business_type', 'status'];
                const missingFields = requiredFields.filter(field => !submitData.has(field));
                if (missingFields.length > 0) {
                  console.warn('🔍 Missing required fields:', missingFields);
                  throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }
                
                // Validate URL fields if they have values
                const urlFields = ['website', 'facebook'];
                for (const field of urlFields) {
                  if (submitData.has(field)) {
                    const value = submitData.get(field);
                    if (value && typeof value === 'string' && value.trim() !== '') {
                      if (!value.startsWith('http://') && !value.startsWith('https://')) {
                        throw new Error(`${field} must be a valid URL starting with http:// or https://`);
                      }
                    }
                  }
                }
                
                // Update shop information
                const shopId = selectedShop.id || selectedShop._id;
                console.log('🔍 Updating shop with ID:', shopId);
                console.log('🔍 Shop data:', selectedShop);
                console.log('🔍 Form data:', formData);
                
                const updateResponse = await adminApi.updateShop(shopId, submitData);
                console.log('🔍 Update response:', updateResponse);
                
                // Debug: Check if the shop was actually updated
                console.log('🔍 After update - checking if shop data changed');
                const updatedShopResponse = await adminApi.getShop(shopId);
                console.log('🔍 Updated shop data:', updatedShopResponse);
                console.log('🔍 Updated shop data structure:', {
                  hasShop: !!updatedShopResponse?.shop,
                  shopKeys: updatedShopResponse?.shop ? Object.keys(updatedShopResponse.shop) : [],
                  businessInfoKeys: updatedShopResponse?.shop?.business_info ? Object.keys(updatedShopResponse.shop.business_info) : []
                });
                
                // Update the selectedShop state with the new data
                if (updatedShopResponse && updatedShopResponse.shop) {
                  console.log('🔍 Setting updated shop data:', updatedShopResponse.shop);
                  console.log('🔍 Previous selectedShop:', selectedShop);
                  
                  setSelectedShop(updatedShopResponse.shop);
                  
                  // Also update the shops array to reflect the change immediately
                  setShops(prevShops => {
                    const updatedShops = prevShops.map(shop => 
                      (shop.id === shopId || shop._id === shopId) 
                        ? { ...shop, ...updatedShopResponse.shop }
                        : shop
                    );
                    console.log('🔍 Updated shops array:', updatedShops);
                    return updatedShops;
                  });
                } else {
                  console.warn('🔍 No shop data in response:', updatedShopResponse);
                }
                
                // Show success message
                showToast('Shop updated successfully!', 'success');
                
                // Close the edit modal to show the updated data
                setShowEditModal(false);
                
                // Refresh shops list in the background to ensure consistency
                // Use a longer delay to avoid race conditions
                setTimeout(() => {
                  fetchShops();
                }, 500);
              } catch (error: any) {
                console.error('Error updating shop:', error);
                console.error('Error details:', {
                  status: error.response?.status,
                  statusText: error.response?.statusText,
                  data: error.response?.data,
                  message: error.message
                });
                
                let errorMessage = 'Failed to update shop';
                if (error.response?.status === 404) {
                  errorMessage = 'Shop not found. Please refresh the page and try again.';
                } else if (error.response?.status === 400) {
                  // Show detailed validation errors if available
                  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                    const validationErrors = error.response.data.errors.map((err: any) => `${err.param}: ${err.msg}`).join(', ');
                    errorMessage = `Validation failed: ${validationErrors}`;
                  } else {
                    errorMessage = error.response?.data?.message || 'Invalid data provided';
                  }
                } else if (error.response?.status === 500) {
                  errorMessage = 'Server error. Please try again later.';
                } else if (error.response?.data?.message) {
                  errorMessage = error.response.data.message;
                }
                
                // Show error toast
                showToast(errorMessage, 'error');
                throw new Error(errorMessage);
              }
            }}
            size="lg"
            saveButtonText="Update Shop"
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedShop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Shop</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to delete the shop "{selectedShop.business_info?.business_name || selectedShop.business_info?.storeName || selectedShop.storeName || selectedShop.full_name || 'Unknown'}"? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedShop(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // TODO: Implement shop deletion API
                        alert('Shop deletion not yet implemented');
                        setShowDeleteModal(false);
                        setSelectedShop(null);
                      } catch (error) {
                        console.error('Error deleting shop:', error);
                        alert('Failed to delete shop');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ShopControl;
