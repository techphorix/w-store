import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { useSellerData } from '../../contexts/SellerDataContext';
import { distributionsApi } from '../../services/api';
import {
  faGlobe,
  faChevronDown,
  faUser,
  faCog,
  faSignOutAlt,
  faArrowLeft,
  faStore,
  faChartLine,
  faPalette,
  faEye,
  faEdit,
  faSave,
  faTimes,
  faPlus,
  faTrash,
  faImage,
  faUpload,
  faDollarSign,
  faWarehouse,
  faArrowTrendUp,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import tiktokLogo from '../../assets/tiktok-logo.png';
import tiktokBackground from '../../assets/tiktok-background.jpg';

// Language data
const languages = [
  { code: 'EN', name: 'English' },
  { code: 'ES', name: 'Español' },
  { code: 'FR', name: 'Français' },
  { code: 'DE', name: 'Deutsch' },
  { code: 'IT', name: 'Italiano' },
  { code: 'PT', name: 'Português' },
  { code: 'RU', name: 'Русский' },
  { code: 'ZH', name: '中文' },
  { code: 'JA', name: '日本語' },
  { code: 'KO', name: '한국어' },
  { code: 'AR', name: 'العربية' },
  { code: 'HI', name: 'हिन्दी' }
];

const translations = {
  EN: {
    title: 'TIKTOK SHOP',
    subtitle: 'Shop Management',
    backToDashboard: 'Back to Dashboard',
    shopManagement: 'Shop Management',
    customize: 'Customize',
    analytics: 'Analytics',
    products: 'Products',
    preview: 'Preview',
    viewPublicShop: 'View Public Shop',
    shopSettings: 'Shop Settings',
    storeName: 'Store Name',
    storeDescription: 'Store Description',
    storeTheme: 'Store Theme',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    edit: 'Edit',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    // Analytics
    totalViews: 'Total Views',
    totalSales: 'Total Sales',
    conversionRate: 'Conversion Rate',
    topProducts: 'Top Products',
    recentActivity: 'Recent Activity',
    salesChart: 'Sales Analytics',
    visitorChart: 'Visitor Analytics'
  },
  ES: {
    title: 'TIENDA TIKTOK',
    subtitle: 'Gestión de Tienda',
    backToDashboard: 'Volver al Panel',
    shopManagement: 'Gestión de Tienda',
    customize: 'Personalizar',
    analytics: 'Análisis',
    products: 'Productos',
    preview: 'Vista Previa',
    viewPublicShop: 'Ver Tienda Pública',
    shopSettings: 'Configuración de Tienda',
    storeName: 'Nombre de Tienda',
    storeDescription: 'Descripción de Tienda',
    storeTheme: 'Tema de Tienda',
    saveChanges: 'Guardar Cambios',
    cancel: 'Cancelar',
    edit: 'Editar',
    notifications: 'Notificaciones',
    profile: 'Perfil',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    // Analytics
    totalViews: 'Vistas Totales',
    totalSales: 'Ventas Totales',
    conversionRate: 'Tasa de Conversión',
    topProducts: 'Productos Principales',
    recentActivity: 'Actividad Reciente',
    salesChart: 'Análisis de Ventas',
    visitorChart: 'Análisis de Visitantes'
  }
};

// Add Distribution interface
interface Distribution {
  _id: string;
  seller: {
    _id: string;
    fullName: string;
    businessInfo: {
      storeName: string;
    };
  };
  product: {
    _id: string;
    name: string;
    category: string;
    salesPrice: number;
    images: Array<{ url: string; alt: string }>;
    stock: number;
  };
  distributionId: string;
  sellerPrice: number;
  markup: number;
  finalPrice: number;
  allocatedStock: number;
  soldQuantity: number;
  availableStock: number;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  status: 'active' | 'inactive' | 'suspended' | 'out_of_stock';
  isPromoted: boolean;
  commissionRate: number;
  createdAt: string;
  updatedAt: string;
}

const ShopManagement = () => {
  const navigate = useNavigate();
  const { shopname } = useParams<{ shopname: string }>();
  const { user, logout } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations] || translations.EN;
  
  // Helper function to clean shopname (remove extra @ symbols)
  const cleanShopname = (name: string) => {
    return name ? name.replace(/^@+/, '') : name;
  };
  
  // Fallback shopname if not provided in URL
  const rawShopname = shopname || user?.businessInfo?.storeName || user?.fullName || 'default';
  const effectiveShopname = cleanShopname(rawShopname);
  
  // State management
  const [activeTab, setActiveTab] = useState<'customize' | 'analytics' | 'products'>('customize');
  const [isEditing, setIsEditing] = useState(false);
  
  // Shop data state
  const [shopData, setShopData] = useState({
    storeName: user?.businessInfo?.storeName || 'My Store',
    storeDescription: user?.businessInfo?.storeDescription || 'Welcome to my store',
    logo: user?.businessInfo?.logo || '',
    theme: 'default'
  });

  // Products/Distributions state
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's distributions for products tab
  const fetchDistributions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await distributionsApi.getDistributions({
        limit: 50,
        status: 'active',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      setDistributions(response.distributions || []);
    } catch (err) {
      console.error('Error fetching distributions:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Load distributions when products tab is selected
  useEffect(() => {
    if (activeTab === 'products') {
      fetchDistributions();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* TikTok Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${tiktokBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>
      
      {/* Optional overlay for better content readability */}
      <div className="absolute inset-0 bg-black bg-opacity-5"></div>

      {/* Header */}
      <div className="relative z-10">
        <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Title */}
              <div className="flex items-center">
                <Link
                  to={`/dashboard/${effectiveShopname}`}
                  className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors mr-4"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                  {currentLang.backToDashboard}
                </Link>
                <img src={tiktokLogo} alt="TikTok Logo" className="w-10 h-10 mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{currentLang.title}</h1>
                  <p className="text-sm text-gray-600">{currentLang.subtitle}</p>
                </div>
              </div>

              {/* Right side - Language, View Public Shop, Profile */}
              <div className="flex items-center space-x-4">
                {/* Language Converter */}
                <div className="relative">
                  <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1">
                    <FontAwesomeIcon icon={faGlobe} className="w-4 h-4 text-black mr-2" />
                    <select
                      value={currentLanguage}
                      onChange={(e) => setCurrentLanguage(e.target.value)}
                      className="appearance-none bg-transparent text-sm font-medium text-gray-900 cursor-pointer outline-none pr-4"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-black" />
                  </div>
                </div>

                {/* View Public Shop Button */}
                <Link
                  to={`/shop/${effectiveShopname}`}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FontAwesomeIcon icon={faEye} className="mr-2" />
                  {currentLang.viewPublicShop}
                </Link>

                {/* Profile Menu */}
                <div className="flex items-center space-x-3">
                  <div className="relative group">
                    <button className="flex items-center space-x-1 p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors">
                      <FontAwesomeIcon icon={faUser} className="w-5 h-5 mr-1" />
                      <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />
                    </button>
                    
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <Link to={`/my/${effectiveShopname}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <FontAwesomeIcon icon={faUser} className="mr-2" />
                        {currentLang.profile}
                      </Link>
                      <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <FontAwesomeIcon icon={faCog} className="mr-2" />
                        {currentLang.settings}
                      </Link>
                      <button 
                        onClick={() => {
                          logout();
                          navigate('/login');
                        }} 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
                        {currentLang.logout}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentLang.shopManagement}</h2>
            <p className="text-gray-600">Manage your shop settings, customize appearance, and view analytics.</p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8 flex justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-gray-200 inline-flex">
              <button
                onClick={() => setActiveTab('customize')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'customize'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faPalette} className="mr-2" />
                {currentLang.customize}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'analytics'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                {currentLang.analytics}
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'products'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faStore} className="mr-2" />
                {currentLang.products}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200">
            {/* Customize Tab */}
            {activeTab === 'customize' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{currentLang.shopSettings}</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isEditing 
                        ? 'bg-gray-600 text-white hover:bg-gray-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <FontAwesomeIcon icon={isEditing ? faTimes : faEdit} className="mr-2" />
                    {isEditing ? currentLang.cancel : currentLang.edit}
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Store Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {currentLang.storeName}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={shopData.storeName}
                        onChange={(e) => setShopData({...shopData, storeName: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{shopData.storeName}</p>
                    )}
                  </div>

                  {/* Store Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {currentLang.storeDescription}
                    </label>
                    {isEditing ? (
                      <textarea
                        value={shopData.storeDescription}
                        onChange={(e) => setShopData({...shopData, storeDescription: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-700">{shopData.storeDescription}</p>
                    )}
                  </div>

                  {/* Save Button */}
                  {isEditing && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          // Save logic here
                          setIsEditing(false);
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                        {currentLang.saveChanges}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">{currentLang.analytics}</h3>
                
                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 font-medium">{currentLang.totalViews}</p>
                        <p className="text-2xl font-bold text-blue-900">1,234</p>
                      </div>
                      <FontAwesomeIcon icon={faEye} className="text-blue-600 text-2xl" />
                    </div>
                  </div>

                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 font-medium">{currentLang.totalSales}</p>
                        <p className="text-2xl font-bold text-green-900">$5,678</p>
                      </div>
                      <FontAwesomeIcon icon={faStore} className="text-green-600 text-2xl" />
                    </div>
                  </div>

                  <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 font-medium">{currentLang.conversionRate}</p>
                        <p className="text-2xl font-bold text-purple-900">3.4%</p>
                      </div>
                      <FontAwesomeIcon icon={faChartLine} className="text-purple-600 text-2xl" />
                    </div>
                  </div>
                </div>

                {/* Charts Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{currentLang.salesChart}</h4>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      Chart placeholder - integrate with Chart.js
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">{currentLang.visitorChart}</h4>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      Chart placeholder - integrate with Chart.js
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{currentLang.products}</h3>
                  <Link
                    to={`/products/${effectiveShopname}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FontAwesomeIcon icon={faStore} className="mr-2" />
                    Manage Products
                  </Link>
                </div>
                
                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin mr-3" />
                    <span className="text-gray-600">Loading your products...</span>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="text-center py-12">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Error Loading Products</h4>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                      onClick={fetchDistributions}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && distributions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FontAwesomeIcon icon={faStore} className="text-6xl mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Products Yet</h4>
                    <p className="mb-4">You haven't distributed any products to your shop yet.</p>
                    <Link
                      to={`/products/${effectiveShopname}`}
                      className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Add Products
                    </Link>
                  </div>
                )}

                {/* Products Grid */}
                {!loading && !error && distributions.length > 0 && (
                  <>
                    <div className="mb-4 text-sm text-gray-600">
                      Showing {distributions.length} distributed products in your shop
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {distributions.map((distribution) => {
                        const productImage = distribution.product.images?.[0]?.url || '/api/placeholder/300/300';
                        
                        return (
                          <div 
                            key={distribution._id} 
                            className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
                          >
                            {/* Product Image */}
                            <div className="relative">
                              <div className="aspect-square bg-gray-200 flex items-center justify-center">
                                {productImage.startsWith('/api/placeholder') ? (
                                  <FontAwesomeIcon icon={faImage} className="w-16 h-16 text-gray-400" />
                                ) : (
                                  <img 
                                    src={productImage} 
                                    alt={distribution.product.name}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              
                              {/* Status Badge */}
                              <div className="absolute top-3 right-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  distribution.status === 'active' ? 'bg-green-100 text-green-800' :
                                  distribution.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                  distribution.status === 'suspended' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {distribution.status.charAt(0).toUpperCase() + distribution.status.slice(1)}
                                </span>
                              </div>
                            </div>

                            {/* Product Info */}
                            <div className="p-4">
                              {/* Product Name */}
                              <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                                {distribution.product.name}
                              </h4>

                              {/* Category */}
                              <div className="mb-3">
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                  {distribution.product.category}
                                </span>
                              </div>

                              {/* Product Stats */}
                              <div className="space-y-2 mb-4">
                                {/* Final Price */}
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3 mr-1" />
                                    Price
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    ${distribution.finalPrice.toFixed(2)}
                                  </span>
                                </div>

                                {/* Markup */}
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <FontAwesomeIcon icon={faArrowTrendUp} className="w-3 h-3 mr-1" />
                                    Markup
                                  </span>
                                  <span className="text-sm font-medium text-green-600">
                                    +${distribution.markup.toFixed(2)}
                                  </span>
                                </div>

                                {/* Stock */}
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <FontAwesomeIcon icon={faWarehouse} className="w-3 h-3 mr-1" />
                                    Stock
                                  </span>
                                  <span className={`text-sm font-medium ${
                                    distribution.availableStock === 0 ? 'text-red-600' :
                                    distribution.availableStock <= 5 ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {distribution.availableStock}
                                  </span>
                                </div>

                                {/* Sales */}
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <FontAwesomeIcon icon={faEye} className="w-3 h-3 mr-1" />
                                    Sold
                                  </span>
                                  <span className="text-sm font-medium text-blue-600">
                                    {distribution.soldQuantity}
                                  </span>
                                </div>
                              </div>

                              {/* Revenue */}
                              {distribution.totalRevenue > 0 && (
                                <div className="pt-3 border-t border-gray-200">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-600">Total Revenue</div>
                                    <div className="text-lg font-bold text-green-600">
                                      ${distribution.totalRevenue.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ShopManagement;
