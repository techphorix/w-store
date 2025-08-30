import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { productsApi, distributionsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSellerData } from '../../contexts/SellerDataContext';


import {
  faGlobe,
  faChevronDown,
  faBell,
  faUser,
  faCog,
  faSignOutAlt,
  faBoxes,
  faPlus,
  faSearch,
  faFilter,
  faArrowLeft,
  faImage,
  faDollarSign,
  faWarehouse,
  faEye,
  faChartLine,
  faArrowTrendUp,
  faTrash,
  faCheckSquare,
  faSquare,
  faTruck,
  faTimes,
  faShoppingCart
} from '@fortawesome/free-solid-svg-icons';
import tiktokLogo from '../../assets/tiktok-logo.png';
import tiktokBackground from '../../assets/tiktok-background.jpg';

// Language data
const languages = [
  { code: 'EN', name: 'English' },
  { code: 'ES', name: 'Español' },
  { code: 'ZH', name: '中文' }
];

const translations = {
  EN: {
    title: 'TIKTOK SHOP',
    subtitle: 'Products',
    backToDashboard: 'Back to Dashboard',
    totalProducts: 'Total Products',
    availableProducts: 'Available Products',
    distributedProducts: 'Distributed Products',
    popularProducts: 'Popular Products',
    searchProducts: 'Search products...',
    searchDistributions: 'Search distributions...',
    filterBy: 'Filter by',
    categories: {
      all: 'All Categories',
      electronics: 'Electronics',
      clothing: 'Clothing',
      home: 'Home & Garden',
      beauty: 'Beauty',
      sports: 'Sports',
      books: 'Books'
    },
    salesPrice: 'Sales Price',
    profit: 'Profit',
    stock: 'Stock',
    views: 'Views',
    addDistribution: 'Add Distribution',
    noProductsFound: 'No products found',
    noDistributionsFound: 'No distributions found',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    // New distribution-related translations
    tabProducts: 'Products',
    tabDistributions: 'My Distributions',
    bulkActions: 'Bulk Actions',
    selectAll: 'Select All',
    deleteSelected: 'Delete Selected',
    confirmDelete: 'Are you sure you want to delete the selected distributions?',
    distributionDeleted: 'Distribution deleted successfully',
    bulkDeleteSuccess: 'Selected distributions deleted successfully',
    allocatedStock: 'Allocated Stock',
    soldQuantity: 'Sold',
    availableStock: 'Available',
    markup: 'Markup',
    finalPrice: 'Final Price',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    outOfStock: 'Out of Stock'
  },
  ES: {
    title: 'TIENDA TIKTOK',
    subtitle: 'Productos',
    backToDashboard: 'Volver al Panel',
    totalProducts: 'Productos Totales',
    availableProducts: 'Productos Disponibles',
    distributedProducts: 'Productos Distribuidos',
    popularProducts: 'Productos Populares',
    searchProducts: 'Buscar productos...',
    searchDistributions: 'Buscar distribuciones...',
    filterBy: 'Filtrar por',
    categories: {
      all: 'Todas las Categorías',
      electronics: 'Electrónicos',
      clothing: 'Ropa',
      home: 'Hogar y Jardín',
      beauty: 'Belleza',
      sports: 'Deportes',
      books: 'Libros'
    },
    salesPrice: 'Precio de Venta',
    profit: 'Ganancia',
    stock: 'Stock',
    views: 'Visualizaciones',
    addDistribution: 'Agregar Distribución',
    noProductsFound: 'No se encontraron productos',
    noDistributionsFound: 'No se encontraron distribuciones',
    notifications: 'Notificaciones',
    profile: 'Perfil',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    // New distribution-related translations
    tabProducts: 'Productos',
    tabDistributions: 'Mis Distribuciones',
    bulkActions: 'Acciones en Lote',
    selectAll: 'Seleccionar Todo',
    deleteSelected: 'Eliminar Seleccionados',
    confirmDelete: '¿Estás seguro de que quieres eliminar las distribuciones seleccionadas?',
    distributionDeleted: 'Distribución eliminada con éxito',
    bulkDeleteSuccess: 'Distribuciones seleccionadas eliminadas con éxito',
    allocatedStock: 'Stock Asignado',
    soldQuantity: 'Vendido',
    availableStock: 'Disponible',
    markup: 'Margen',
    finalPrice: 'Precio Final',
    status: 'Estado',
    actions: 'Acciones',
    edit: 'Editar',
    delete: 'Eliminar',
    active: 'Activo',
    inactive: 'Inactivo',
    suspended: 'Suspendido',
    outOfStock: 'Sin Stock'
  },
  ZH: {
    title: 'TIKTOK商店',
    subtitle: '产品',
    backToDashboard: '返回仪表板',
    totalProducts: '总产品数',
    availableProducts: '可用产品',
    distributedProducts: '已分发产品',
    popularProducts: '热门产品',
    searchProducts: '搜索产品...',
    searchDistributions: '搜索分销...',
    filterBy: '筛选',
    categories: {
      all: '所有类别',
      electronics: '电子产品',
      clothing: '服装',
      home: '家居园艺',
      beauty: '美容',
      sports: '体育',
      books: '图书'
    },
    salesPrice: '销售价格',
    profit: '利润',
    stock: '库存',
    views: '浏览量',
    addDistribution: '添加分销',
    noProductsFound: '未找到产品',
    noDistributionsFound: '未找到分销',
    notifications: '通知',
    profile: '个人资料',
    settings: '设置',
    logout: '退出',
    // New distribution-related translations
    tabProducts: '产品',
    tabDistributions: '我的分销',
    bulkActions: '批量操作',
    selectAll: '全选',
    deleteSelected: '删除选中',
    confirmDelete: '您确定要删除选中的分销吗？',
    distributionDeleted: '分销删除成功',
    bulkDeleteSuccess: '选中的分销删除成功',
    allocatedStock: '分配库存',
    soldQuantity: '已售',
    availableStock: '可用',
    markup: '加价',
    finalPrice: '最终价格',
    status: '状态',
    actions: '操作',
    edit: '编辑',
    delete: '删除',
    active: '活跃',
    inactive: '非活跃',
    suspended: '暂停',
    outOfStock: '缺货'
  }
};

interface Product {
  _id: string;
  name: string;
  category: string;
  salesPrice: number;
  profit: number;
  stock: number;
  views: number;
  images: Array<{ url: string; alt: string }>;
  isDistributed: boolean;
  isActive: boolean;
  createdBy: any;
}

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

const Products = () => {
  const navigate = useNavigate();
  const { shopname } = useParams<{ shopname: string }>();
  
  // Get user from auth context for fallback
  const { user } = useAuth();
  
  // Helper function to clean shopname (remove extra @ symbols)
  const cleanShopname = (name: string) => {
    return name ? name.replace(/^@+/, '') : name;
  };
  
  // Fallback shopname if not provided in URL
  const rawShopname = shopname || user?.businessInfo?.storeName || user?.fullName || 'default';
  const effectiveShopname = cleanShopname(rawShopname);
  const [currentLanguage, setCurrentLanguage] = useState<'EN' | 'ES' | 'ZH'>('EN');
  const [isLoading, setIsLoading] = useState(true);
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'products' | 'distributions'>('products');
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Real product data from API
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Distribution data
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [totalDistributions, setTotalDistributions] = useState(0);
  const [distributionCurrentPage, setDistributionCurrentPage] = useState(1);
  const [distributionTotalPages, setDistributionTotalPages] = useState(1);
  
  // Bulk selection for distributions
  const [selectedDistributions, setSelectedDistributions] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  


  // Fetch products from API (including simulated products with orders)
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      
      // Fetch real products and simulated products in parallel
      const [realProductsResponse] = await Promise.all([
        productsApi.getProducts({
          page: currentPage,
          limit: 20,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          search: searchTerm,
          status: selectedStatus === 'all' ? undefined : selectedStatus
        }).catch(() => ({ products: [], total: 0, totalPages: 1 }))
      ]);
      
      // Use only real products
      const allProducts = (realProductsResponse.products || []).map(product => ({ ...product, isSimulated: false }));
      
      // Apply filters to products
      const filteredProducts = allProducts.filter(product => {
        if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
        if (selectedStatus !== 'all' && product.status !== selectedStatus) return false;
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      });
      
      setProducts(filteredProducts);
      setTotalProducts(filteredProducts.length);
      setTotalPages(Math.ceil(filteredProducts.length / 20));
      
      console.log(`📦 Products loaded: ${realProductsResponse.products?.length || 0} real products`);
    } catch (error) {
      console.error('Error fetching enhanced products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (activeTab === 'products') {
      await fetchProducts();
    } else {
      await fetchDistributions();
    }
  }, [activeTab]);

  // Fetch distributions from API
  const fetchDistributions = async () => {
    try {
      setIsLoading(true);
      const response = await distributionsApi.getDistributions({
        page: distributionCurrentPage,
        limit: 20,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: searchTerm,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      setDistributions(response.distributions || []);
      setTotalDistributions(response.total || 0);
      setDistributionTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Error fetching distributions:', error);
      setDistributions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add distribution
  const handleAddDistribution = async (productId: string) => {
    try {
      await distributionsApi.createDistribution({
        productId,
        allocatedStock: 10,
        markup: 0
      });
      
      // Refresh data based on current tab
      if (activeTab === 'products') {
        fetchProducts();
      } else {
        fetchDistributions();
      }
    } catch (error) {
      console.error('Error creating distribution:', error);
      alert('Failed to create distribution. Please try again.');
    }
  };

  // Handle bulk distribution creation
  const handleBulkDistribution = async (productIds: string[]) => {
    try {
      setIsDeleting(true);
      const result = await distributionsApi.createBulkDistributions({
        productIds,
        allocatedStock: 10,
        markup: 0
      });
      
      // Refresh data
      if (activeTab === 'products') {
        fetchProducts();
      } else {
        fetchDistributions();
      }
      
      if (result.errors && result.errors.length > 0) {
        alert(`Created ${result.successful} distributions successfully. ${result.failed} failed.`);
      } else {
        alert(`Successfully created ${result.successful} distributions!`);
      }
    } catch (error) {
      console.error('Error creating bulk distributions:', error);
      alert('Failed to create distributions. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete distribution
  const handleDeleteDistribution = async (distributionId: string) => {
    if (!window.confirm(currentLang.confirmDelete)) {
      return;
    }

    try {
      await distributionsApi.deleteDistribution(distributionId);
      alert(currentLang.distributionDeleted);
      fetchDistributions();
    } catch (error) {
      console.error('Error deleting distribution:', error);
      alert('Failed to delete distribution. Please try again.');
    }
  };

  // Handle bulk delete distributions
  const handleBulkDeleteDistributions = async () => {
    if (selectedDistributions.length === 0) {
      return;
    }

    if (!window.confirm(currentLang.confirmDelete)) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await distributionsApi.deleteBulkDistributions(selectedDistributions);
      
      setSelectedDistributions([]);
      
      if (result.errors && result.errors.length > 0) {
        alert(`Deleted ${result.successful} distributions successfully. ${result.failed} failed.`);
      } else {
        alert(currentLang.bulkDeleteSuccess);
      }
      
      fetchDistributions();
    } catch (error) {
      console.error('Error bulk deleting distributions:', error);
      alert('Failed to delete distributions. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };



  // Handle distribution selection
  const handleDistributionSelect = (distributionId: string) => {
    setSelectedDistributions(prev =>
      prev.includes(distributionId)
        ? prev.filter(id => id !== distributionId)
        : [...prev, distributionId]
    );
  };

  // Handle select all distributions
  const handleSelectAllDistributions = () => {
    if (selectedDistributions.length === distributions.length) {
      setSelectedDistributions([]);
    } else {
      setSelectedDistributions(distributions.map(d => d._id));
    }
  };

  // Stats calculation (calculated from real data)
  const stats = {
    totalProducts: products.length,
    availableProducts: products.filter(p => !p.isDistributed && p.stock > 0).length,
    distributedProducts: products.filter(p => p.isDistributed).length,
    popularProducts: products.filter(p => p.views > 1500).length,
    totalDistributions: distributions.length,
    activeDistributions: distributions.filter(d => d.status === 'active').length,
    totalRevenue: distributions.reduce((sum, d) => sum + d.totalRevenue, 0),
    totalProfit: distributions.reduce((sum, d) => sum + d.totalProfit, 0)
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'available' && !product.isDistributed && product.stock > 0) ||
      (selectedStatus === 'distributed' && product.isDistributed) ||
      (selectedStatus === 'outOfStock' && product.stock === 0);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filter distributions
  const filteredDistributions = distributions.filter(distribution => {
    const matchesSearch = distribution.product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || distribution.product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || distribution.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Helper functions
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'text-red-600', label: 'Out of Stock' };
    if (stock <= 5) return { color: 'text-yellow-600', label: 'Low Stock' };
    return { color: 'text-green-600', label: 'In Stock' };
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) {
      return '0';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const currentLang = translations[currentLanguage];

  // Fetch data on component mount and when filters change
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else {
      fetchDistributions();
    }
  }, [activeTab, currentPage, distributionCurrentPage, selectedCategory, selectedStatus, searchTerm]);

  // Reset selections when switching tabs
  useEffect(() => {
    setSelectedDistributions([]);
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStatus('all');
  }, [activeTab]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Global style for Webkit scrollbar hiding */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
      
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

      {/* Optional overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-10"></div>

      {/* Header */}
      <header className="relative z-10 bg-white/90 backdrop-blur-sm shadow-md py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[120px]">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Link
            to={`/dashboard/${effectiveShopname}`}
            className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            {currentLang.backToDashboard}
          </Link>
        </div>

        {/* Center */}
        <div className="flex items-center space-x-4">
          <img src={tiktokLogo} alt="TikTok" className="h-8 w-8" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{currentLang.title}</h1>
            <p className="text-sm text-gray-600">{currentLang.subtitle}</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="relative">
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value as 'EN' | 'ES' | 'ZH')}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <FontAwesomeIcon 
              icon={faChevronDown} 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" 
            />
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <FontAwesomeIcon icon={faUser} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Fixed sections + Scrollable grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-120px)]">
        {/* Fixed Header Section (Tabs + Stats Cards + Controls) */}
        <div className="flex-shrink-0 space-y-8">
          {/* Tab Navigation */}
          <div className="flex justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-gray-200 inline-flex">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'products'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faBoxes} className="mr-2" />
                {currentLang.tabProducts}
              </button>
              <button
                onClick={() => setActiveTab('distributions')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'distributions'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faTruck} className="mr-2" />
                {currentLang.tabDistributions}
              </button>
            </div>
          </div>



          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeTab === 'products' ? (
              <>
                {/* Total Products */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{currentLang.totalProducts}</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
                    </div>
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <FontAwesomeIcon icon={faBoxes} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Available Products */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{currentLang.availableProducts}</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.availableProducts}</p>
                    </div>
                    <div className="p-3 bg-green-500 rounded-lg">
                      <FontAwesomeIcon icon={faPlus} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Distributed Products */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{currentLang.distributedProducts}</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.distributedProducts}</p>
                    </div>
                    <div className="p-3 bg-purple-500 rounded-lg">
                      <FontAwesomeIcon icon={faArrowTrendUp} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Popular Products */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{currentLang.popularProducts}</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.popularProducts}</p>
                    </div>
                    <div className="p-3 bg-orange-500 rounded-lg">
                      <FontAwesomeIcon icon={faEye} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Total Distributions */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Distributions</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalDistributions}</p>
                    </div>
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <FontAwesomeIcon icon={faTruck} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Active Distributions */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Distributions</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.activeDistributions}</p>
                    </div>
                    <div className="p-3 bg-green-500 rounded-lg">
                      <FontAwesomeIcon icon={faCheckSquare} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-purple-500 rounded-lg">
                      <FontAwesomeIcon icon={faDollarSign} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Total Profit */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Profit</p>
                      <p className="text-3xl font-bold text-gray-900">${stats.totalProfit.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-orange-500 rounded-lg">
                      <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Controls (Search and Filters) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'products' ? currentLang.searchProducts : currentLang.searchDistributions}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="all">{currentLang.categories.all}</option>
                  <option value="electronics">{currentLang.categories.electronics}</option>
                  <option value="clothing">{currentLang.categories.clothing}</option>
                  <option value="home">{currentLang.categories.home}</option>
                  <option value="beauty">{currentLang.categories.beauty}</option>
                  <option value="sports">{currentLang.categories.sports}</option>
                  <option value="books">{currentLang.categories.books}</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="all">{currentLang.filterBy}</option>
                  {activeTab === 'products' ? (
                    <>
                      <option value="available">Available</option>
                      <option value="distributed">My Distributions</option>
                      <option value="outOfStock">Out of Stock</option>
                    </>
                  ) : (
                    <>
                      <option value="active">{currentLang.active}</option>
                      <option value="inactive">{currentLang.inactive}</option>
                      <option value="suspended">{currentLang.suspended}</option>
                      <option value="out_of_stock">{currentLang.outOfStock}</option>
                    </>
                  )}
                </select>
              </div>



              {/* Bulk Actions for Distributions */}
              {activeTab === 'distributions' && (
                <div className="flex items-center gap-2">
                  {/* Select All Button */}
                  <button
                    onClick={handleSelectAllDistributions}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FontAwesomeIcon 
                      icon={selectedDistributions.length === distributions.length && distributions.length > 0 ? faCheckSquare : faSquare} 
                      className="w-4 h-4" 
                    />
                    {currentLang.selectAll}
                  </button>

                  {selectedDistributions.length > 0 && (
                    <>
                      <div className="h-6 w-px bg-gray-300"></div>
                      <span className="text-sm text-gray-600">
                        {selectedDistributions.length} selected
                      </span>
                      <button
                        onClick={handleBulkDeleteDistributions}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        {isDeleting ? 'Deleting...' : currentLang.deleteSelected}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden mt-8">
          <div
            className="h-full overflow-y-auto hide-scrollbar"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              </div>
            ) : activeTab === 'products' ? (
              // Products View
              filteredProducts.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                  <FontAwesomeIcon icon={faBoxes} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{currentLang.noProductsFound}</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    const productImage = product.images?.[0]?.url || '/api/placeholder/300/300';
                    
                    return (
                      <div key={product._id} className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                        {/* Product Image */}
                        <div className="relative">
                          <div className="aspect-square bg-gray-200 flex items-center justify-center">
                            {productImage.startsWith('/api/placeholder') ? (
                              <FontAwesomeIcon icon={faImage} className="w-16 h-16 text-gray-400" />
                            ) : (
                              <img 
                                src={productImage} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="absolute top-3 right-3 space-y-2">
                            {product.isDistributed && (
                              <span className="block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Distributed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-4">
                          {/* Product Name */}
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {product.name}
                          </h3>

                          {/* Category */}
                          <div className="mb-3">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                              {currentLang.categories[product.category as keyof typeof currentLang.categories] || product.category}
                            </span>
                          </div>

                          {/* Product Stats */}
                          <div className="space-y-2 mb-4">
                            {/* Sales Price */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3 mr-1" />
                                {currentLang.salesPrice}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                ${product.salesPrice}
                              </span>
                            </div>

                            {/* Profit */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faChartLine} className="w-3 h-3 mr-1" />
                                {currentLang.profit}
                              </span>
                              <span className="text-sm font-medium text-green-600">
                                +${product.profit || '0.00'}
                              </span>
                            </div>

                            {/* Stock */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faWarehouse} className="w-3 h-3 mr-1" />
                                {currentLang.stock}
                              </span>
                              <span className={`text-sm font-medium ${stockStatus.color}`}>
                                {product.stock}
                              </span>
                            </div>

                            {/* Views */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faEye} className="w-3 h-3 mr-1" />
                                {currentLang.views}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatNumber(product.views)}
                              </span>
                            </div>
                          </div>

                          {/* Add Distribution Button */}
                          <button
                            onClick={() => handleAddDistribution(product._id)}
                            disabled={product.isDistributed || product.stock === 0}
                            className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                              product.isDistributed
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : product.stock === 0
                                ? 'bg-red-100 text-red-500 cursor-not-allowed'
                                : 'bg-black text-white hover:bg-gray-800'
                            }`}
                          >
                            {product.isDistributed
                              ? 'Already Distributed'
                              : product.stock === 0
                              ? 'Out of Stock'
                              : currentLang.addDistribution
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // Distributions View - Grid view like products
              filteredDistributions.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                  <FontAwesomeIcon icon={faTruck} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{currentLang.noDistributionsFound}</h3>
                  <p className="text-gray-500">You haven't created any distributions yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                  {filteredDistributions.map((distribution) => {
                    const productImage = distribution.product.images?.[0]?.url || '/api/placeholder/300/300';
                    const isSelected = selectedDistributions.includes(distribution._id);
                    
                    return (
                      <div 
                        key={distribution._id} 
                        className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border overflow-hidden hover:shadow-xl transition-all ${
                          isSelected ? 'border-black ring-2 ring-black' : 'border-gray-200'
                        }`}
                      >
                        {/* Product Image with Selection */}
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
                          
                          {/* Selection Checkbox */}
                          <div className="absolute top-3 left-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleDistributionSelect(distribution._id)}
                              className="w-5 h-5 rounded border-gray-300 bg-white/90 backdrop-blur-sm"
                            />
                          </div>

                          {/* Status Badge */}
                          <div className="absolute top-3 right-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              distribution.status === 'active' ? 'bg-green-100 text-green-800' :
                              distribution.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                              distribution.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {currentLang[distribution.status as keyof typeof currentLang] || distribution.status}
                            </span>
                          </div>
                        </div>

                        {/* Distribution Info */}
                        <div className="p-4">
                          {/* Product Name */}
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {distribution.product.name}
                          </h3>

                          {/* Category */}
                          <div className="mb-3">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                              {currentLang.categories[distribution.product.category as keyof typeof currentLang.categories] || distribution.product.category}
                            </span>
                          </div>

                          {/* Distribution Stats */}
                          <div className="space-y-2 mb-4">
                            {/* Final Price */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3 mr-1" />
                                {currentLang.finalPrice}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                ${distribution.finalPrice.toFixed(2)}
                              </span>
                            </div>

                            {/* Markup */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faChartLine} className="w-3 h-3 mr-1" />
                                {currentLang.markup}
                              </span>
                              <span className="text-sm font-medium text-green-600">
                                +${distribution.markup.toFixed(2)}
                              </span>
                            </div>

                            {/* Allocated Stock */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faWarehouse} className="w-3 h-3 mr-1" />
                                {currentLang.allocatedStock}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {distribution.allocatedStock}
                              </span>
                            </div>

                            {/* Available Stock */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faEye} className="w-3 h-3 mr-1" />
                                {currentLang.availableStock}
                              </span>
                              <span className={`text-sm font-medium ${
                                distribution.availableStock === 0 ? 'text-red-600' :
                                distribution.availableStock <= 5 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {distribution.availableStock}
                              </span>
                            </div>

                            {/* Sold Quantity */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faArrowTrendUp} className="w-3 h-3 mr-1" />
                                {currentLang.soldQuantity}
                              </span>
                              <span className="text-sm font-medium text-blue-600">
                                {distribution.soldQuantity}
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleDeleteDistribution(distribution._id)}
                            className="w-full py-2 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                            title={currentLang.delete}
                          >
                            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                            {currentLang.delete}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </main>





    </div>
  );
};

export default Products;
