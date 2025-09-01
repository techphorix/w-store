import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faSearch, 
  faFilter,
  faSpinner,
  faEye,
  faCheck,
  faTimes,
  faExclamationTriangle,
  faSave
} from '@fortawesome/free-solid-svg-icons';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  isActive: boolean;
  createdAt: string;
  seller?: {
    _id: string;
    fullName: string;
    businessInfo?: {
      storeName: string;
    };
  };
}

const AdminProducts = () => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [sellers, setSellers] = useState<Array<{ id: string; fullName: string; storeName: string }>>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    category_id: '',
    seller_id: '',
    is_active: true
  });
  const [editingProduct, setEditingProduct] = useState({
    _id: '',
    name: '',
    description: '',
    price: 0,
    category_id: '',
    is_active: true
  });
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingProductLoading, setEditingProductLoading] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Fetch categories and sellers
  const fetchCategories = useCallback(async () => {
    try {
      const response = await adminApi.getCategories();
      if (response.categories) {
        setCategories(response.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Resolve images to absolute URLs for dev/proxy
  const getBackendOrigin = () => {
    try {
      const envUrl = (import.meta as any)?.env?.VITE_BACKEND_URL;
      if (envUrl) return String(envUrl);
      if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin.replace(':3000', ':5000');
      }
    } catch {}
    return '';
  };

  const resolveImageUrl = (url?: string) => {
    if (!url) return '';
    const s = String(url).trim();
    if (!s) return '';
    if (/^data:|^https?:\/\//i.test(s)) return s;
    const origin = getBackendOrigin();
    if (!s.startsWith('/')) {
      const path = `/uploads/products/${s}`;
      return origin ? `${origin}${path}` : path;
    }
    if (s.startsWith('/uploads')) {
      return origin ? `${origin}${s}` : s;
    }
    return s;
  };

  const fetchSellers = useCallback(async () => {
    try {
      const response = await adminApi.getSellers();
      if (response.sellers) {
        setSellers(response.sellers);
      }
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  }, []);

  // Fetch products from backend
  const fetchProducts = useCallback(async () => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the admin API to get all products
      const response = await adminApi.getProducts({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });


      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format from server');
      }

      const products = Array.isArray(response.products) ? response.products : [];
      const totalPages = typeof response.totalPages === 'number' ? response.totalPages : 1;
      const total = typeof response.total === 'number' ? response.total : 0;

      setProducts(products);
      setTotalPages(totalPages);
      setTotalProducts(total);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentUser, currentPage, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'admin') {
      fetchCategories();
      fetchSellers();
    }
  }, [isAuthenticated, currentUser, fetchCategories, fetchSellers]);

  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'admin') {
      fetchProducts();
    }
  }, [currentPage, searchTerm, categoryFilter, statusFilter, isAuthenticated, currentUser, fetchProducts]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  }, [fetchProducts]);

  const handleCategoryFilterChange = useCallback((category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handleToggleStatus = useCallback(async (productId: string, currentStatus: boolean) => {
    if (!productId) {
      console.error('No product ID provided for status toggle');
      return;
    }
    
    try {
      // This would call the backend API to toggle product status
      await adminApi.updateProductStatus(productId, !currentStatus);
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error toggling product status:', error);
    }
  }, [fetchProducts]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    if (!productId) {
      console.error('No product ID provided for deletion');
      return;
    }
    
    try {
      setDeletingProduct(true);
      await adminApi.deleteProduct(productId);
      setShowDeleteModal(false);
      setSelectedProduct(null);
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setDeletingProduct(false);
    }
  }, [fetchProducts]);

  // Handle add product
  const handleAddProduct = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setAddingProduct(true);
      
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('description', newProduct.description);
      formData.append('price', String(newProduct.price ?? 0));
      formData.append('category_id', String(newProduct.category_id ?? ''));
      formData.append('seller_id', String(newProduct.seller_id ?? ''));
      formData.append('is_active', String(!!newProduct.is_active));

      await adminApi.createProduct(formData);
      
      // Reset form and close modal
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        category_id: '',
        seller_id: '',
        is_active: true
      });
      setShowEditModal(false);
      
      // Refresh products list
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setAddingProduct(false);
    }
  }, [newProduct, fetchProducts]);

  // Handle edit product
  const handleEditProduct = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setEditingProductLoading(true);
      
      const formData = new FormData();
      formData.append('name', editingProduct.name);
      formData.append('description', editingProduct.description);
      formData.append('price', String(editingProduct.price ?? 0));
      formData.append('category_id', String(editingProduct.category_id ?? ''));
      formData.append('is_active', String(!!editingProduct.is_active));

      await adminApi.updateProduct(editingProduct._id, formData);
      
      // Close modal and refresh products list
      setShowEditModal(false);
      setSelectedProduct(null);
      setEditingProduct({
        _id: '',
        name: '',
        description: '',
        price: 0,
        category_id: '',
        is_active: true
      });
      
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    } finally {
      setEditingProductLoading(false);
    }
  }, [editingProduct, fetchProducts]);

  // Reset new product form when opening add modal
  const handleOpenAddModal = useCallback(() => {
    setNewProduct({
      name: '',
      description: '',
      price: 0,
      category_id: '',
      seller_id: '',
      is_active: true
    });
    setSelectedProduct(null);
    setShowEditModal(true);
  }, []);

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
              onClick={fetchProducts}
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
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <button 
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Product
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products by name or description..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value || '';
                  setSearchTerm(value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                const value = e.target.value || 'all';
                setCategoryFilter(value);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="fashion">Fashion</option>
              <option value="health">Health & Beauty</option>
              <option value="sports">Sports</option>
              <option value="books">Books</option>
              <option value="home">Home & Office</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value || 'all';
                setStatusFilter(value);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Products ({totalProducts || 0})
            </h2>
          </div>
          
          {(products || []).length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600">No products match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  {(products || []).map((product) => (
                    <tr key={product._id || `product-${Math.random()}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={resolveImageUrl(product.images[0])}
                                alt={product.name || 'Product'}
                                className="h-12 w-12 rounded-lg object-cover"
                                onError={(e) => {
                                  // Fallback icon
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center ${product.images && product.images.length > 0 ? 'hidden' : ''}`}>
                              <span className="text-gray-500 text-xs">No Image</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name || 'Unnamed Product'}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description || 'No description available'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {product.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${(() => {
                          const price = product.price;
                          if (typeof price === 'number' && !isNaN(price)) {
                            return price.toFixed(2);
                          }
                          return '0.00';
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(() => {
                          try {
                            if (product.seller?.businessInfo?.storeName) {
                              return product.seller.businessInfo.storeName;
                            }
                            if (product.seller?.fullName) {
                              return product.seller.fullName;
                            }
                            return 'Unknown';
                          } catch (e) {
                            return 'Unknown';
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => product._id && handleToggleStatus(product._id, Boolean(product.isActive))}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            Boolean(product.isActive)
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          disabled={!product._id}
                        >
                          {Boolean(product.isActive) ? (
                            <>
                              <FontAwesomeIcon icon={faCheck} className="mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faTimes} className="mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(() => {
                          try {
                            const date = new Date(product.createdAt);
                            if (isNaN(date.getTime())) {
                              return 'Invalid Date';
                            }
                            return date.toLocaleDateString();
                          } catch (e) {
                            return 'Invalid Date';
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <a
                            href={product._id ? `/product/${encodeURIComponent(product._id)}` : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-2 py-1 rounded text-xs ${product._id ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            onClick={(e) => { if (!product._id) e.preventDefault(); }}
                            title="View Product"
                          >
                            View Product
                          </a>
                          <button
                            onClick={() => {
                              if (product._id && product) {
                                setSelectedProduct(product);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                            disabled={!product._id}
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button
                            onClick={() => {
                              if (product._id) {
                                setEditingProduct({
                                  _id: product._id,
                                  name: product.name || '',
                                  description: product.description || '',
                                  price: product.price || 0,
                                  category_id: product.category || '',
                                  is_active: Boolean(product.isActive)
                                });
                                setShowEditModal(true);
                              }
                            }}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Edit Product"
                            disabled={!product._id}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            onClick={() => {
                              if (product._id) {
                                setSelectedProduct(product);
                                setShowDeleteModal(true);
                              }
                            }}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Product"
                            disabled={!product._id}
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
        {(totalPages || 1) > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const currentPageValue = currentPage || 1;
                  const newPage = Math.max(1, currentPageValue - 1);
                  if (newPage !== currentPageValue) {
                    setCurrentPage(newPage);
                  }
                }}
                disabled={(currentPage || 1) === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => {
                    const currentPageValue = currentPage || 1;
                    const totalPagesValue = totalPages || 1;
                    if (page !== currentPageValue && page >= 1 && page <= totalPagesValue) {
                      setCurrentPage(page);
                    }
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    (currentPage || 1) === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => {
                  const currentPageValue = currentPage || 1;
                  const totalPagesValue = totalPages || 1;
                  const newPage = Math.min(totalPagesValue, currentPageValue + 1);
                  if (newPage !== currentPageValue) {
                    setCurrentPage(newPage);
                  }
                }}
                disabled={(currentPage || 1) === (totalPages || 1)}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* No Data Message */}
        {!loading && products.length === 0 && totalProducts === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Products Available</h3>
            <p className="text-gray-600">Start by adding your first product to the system.</p>
          </div>
        )}

        {/* Add Product Modal */}
        {showEditModal && !selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Add New Product</h2>
                      <p className="text-blue-100 text-sm">Create a new product for the marketplace</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-200"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <form onSubmit={handleAddProduct} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newProduct.name || ''}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter product name"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newProduct.price || ''}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newProduct.category_id || ''}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, category_id: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Seller <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newProduct.seller_id || ''}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, seller_id: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                          required
                        >
                          <option value="">Select Seller</option>
                          {sellers.map(seller => (
                            <option key={seller.id} value={seller.id}>
                              {seller.storeName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={newProduct.description || ''}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter product description"
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none"
                          required
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Status
                        </label>
                        <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-xl border border-gray-200">
                          <input
                            type="checkbox"
                            checked={newProduct.is_active !== false}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="w-5 h-5 text-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 border-gray-300"
                          />
                          <label className="text-sm font-medium text-gray-700">Active</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100 bg-gray-50/50 p-6 flex-shrink-0">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingProduct}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-2"
                      >
                        {addingProduct ? (
                          <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                        )}
                        <span>Add Product</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {showEditModal && selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-green-600 to-emerald-700 text-white p-6 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <FontAwesomeIcon icon={faEdit} className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Edit Product</h2>
                      <p className="text-green-100 text-sm">Update product information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedProduct(null);
                    }}
                    className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-200"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <form onSubmit={handleEditProduct} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editingProduct.name || ''}
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter product name"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingProduct.price || ''}
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={editingProduct.category_id || ''}
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, category_id: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Status
                        </label>
                        <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-xl border border-gray-200">
                          <input
                            type="checkbox"
                            checked={editingProduct.is_active !== false}
                            onChange={(e) => setEditingProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="w-5 h-5 text-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 border-gray-300"
                          />
                          <label className="text-sm font-medium text-gray-700">Active</label>
                        </div>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={editingProduct.description || ''}
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter product description"
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100 bg-gray-50/50 p-6 flex-shrink-0">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          setSelectedProduct(null);
                        }}
                        className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editingProductLoading}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-2"
                      >
                        {editingProductLoading ? (
                          <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
                        )}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* View Product Modal */}
        {selectedProduct && !showEditModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <FontAwesomeIcon icon={faEye} className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Product Details</h2>
                      <p className="text-blue-100 text-sm">View product information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-200"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Product Image */}
                  <div className="text-center">
                    {selectedProduct.images && selectedProduct.images.length > 0 ? (
                      <img
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.name || 'Product'}
                        className="h-48 w-48 mx-auto rounded-xl object-cover shadow-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`h-48 w-48 mx-auto rounded-xl bg-gray-200 flex items-center justify-center shadow-lg ${selectedProduct.images && selectedProduct.images.length > 0 ? 'hidden' : ''}`}>
                      <span className="text-gray-500 text-lg">No Image</span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedProduct.name || 'Unnamed Product'}
                      </h3>
                      <p className="text-gray-600 text-lg">
                        {selectedProduct.description || 'No description available'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <div className="text-sm font-medium text-gray-500">Price</div>
                        <div className="text-2xl font-bold text-green-600">
                          ${(() => {
                            const price = selectedProduct.price;
                            if (typeof price === 'number' && !isNaN(price)) {
                              return price.toFixed(2);
                            }
                            return '0.00';
                          })()}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl">
                        <div className="text-sm font-medium text-gray-500">Category</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {selectedProduct.category || 'Uncategorized'}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl">
                        <div className="text-sm font-medium text-gray-500">Status</div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          Boolean(selectedProduct.isActive)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {Boolean(selectedProduct.isActive) ? 'Active' : 'Inactive'}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl">
                        <div className="text-sm font-medium text-gray-500">Created</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {(() => {
                            try {
                              const date = new Date(selectedProduct.createdAt);
                              if (isNaN(date.getTime())) {
                                return 'Invalid Date';
                              }
                              return date.toLocaleDateString();
                            } catch (e) {
                              return 'Invalid Date';
                            }
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl">
                      <div className="text-sm font-medium text-gray-500 mb-2">Seller Information</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {(() => {
                          try {
                            if (selectedProduct.seller?.businessInfo?.storeName) {
                              return selectedProduct.seller.businessInfo.storeName;
                            }
                            if (selectedProduct.seller?.fullName) {
                              return selectedProduct.seller.fullName;
                            }
                            return 'Unknown';
                          } catch (e) {
                            return 'Unknown';
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-gray-50/50 p-6 flex-shrink-0">
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setEditingProduct({
                          _id: selectedProduct._id || '',
                          name: selectedProduct.name || '',
                          description: selectedProduct.description || '',
                          price: selectedProduct.price || 0,
                          category_id: selectedProduct.category || '',
                          is_active: Boolean(selectedProduct.isActive)
                        });
                        setShowEditModal(true);
                        setSelectedProduct(null);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center space-x-2"
                    >
                      <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                      <span>Edit Product</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-red-600 to-pink-700 text-white p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <FontAwesomeIcon icon={faTrash} className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Delete Product</h2>
                      <p className="text-red-100 text-sm">This action cannot be undone</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="text-center">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-6xl text-red-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Are you sure?</h3>
                    <p className="text-gray-600 mb-4">
                      You are about to delete the product "{selectedProduct.name || 'Unnamed Product'}". 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-gray-50/50 p-6">
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setSelectedProduct(null);
                      }}
                      className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(selectedProduct._id || '')}
                      disabled={deletingProduct}
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-2"
                    >
                      {deletingProduct ? (
                        <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                      )}
                      <span>Delete Product</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
