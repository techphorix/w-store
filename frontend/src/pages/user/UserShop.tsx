import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe,
  faChevronDown,
  faSearch,
  faFilter,
  faHeart,
  faShare,
  faShoppingCart,
  faEye,
  faStar,
  faMapMarkerAlt,
  faEnvelope,
  faPhone,
  faCalendar,
  faPlus,
  faMinus,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import tiktokLogo from '../../assets/tiktok-logo.png';
import tiktokBackground from '../../assets/tiktok-background.jpg';
import { sellerApi, cartApi } from '../../services/api';

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
    searchPlaceholder: 'Search products...',
    allCategories: 'All Categories',
    addToCart: 'Add to Cart',
    viewDetails: 'View Details',
    noProducts: 'No products found',
    shopInfo: 'Shop Information',
    contactInfo: 'Contact Information',
    followers: 'Followers',
    following: 'Following',
    products: 'Products',
    rating: 'Rating',
    reviews: 'Reviews',
    joined: 'Joined',
    lastActive: 'Last Active',
    featured: 'Featured Products',
    allProducts: 'All Products'
  },
  ES: {
    title: 'TIENDA TIKTOK',
    searchPlaceholder: 'Buscar productos...',
    allCategories: 'Todas las Categorías',
    addToCart: 'Agregar al Carrito',
    viewDetails: 'Ver Detalles',
    noProducts: 'No se encontraron productos',
    shopInfo: 'Información de la Tienda',
    contactInfo: 'Información de Contacto',
    followers: 'Seguidores',
    following: 'Siguiendo',
    products: 'Productos',
    rating: 'Calificación',
    reviews: 'Reseñas',
    joined: 'Se unió',
    lastActive: 'Última actividad',
    featured: 'Productos Destacados',
    allProducts: 'Todos los Productos'
  }
};

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  salesPrice: number;
  stock: number;
  images: Array<{ url: string; alt: string }>;
  tags: string[];
  views: number;
  createdAt: string;
  seller: {
    _id: string;
    fullName: string;
    businessInfo: {
      storeName: string;
    };
  };
}

interface sellerInfo {
  _id: string;
  fullName: string;
  businessInfo: {
    storeName?: string;
    storeDescription?: string;
    businessType?: string;
    logo?: string;
  };
  bio?: string;
  profilePhoto?: string;
  createdAt: string;
}

interface ShopStats {
  totalProducts: number;
  totalOrders: number;
  rating: number;
  followers: number;
  following: number;
}

interface CartItem {
  productId: string;
  quantity: number;
}

const UserShop = () => {
  const navigate = useNavigate();
  const { shopname } = useParams<{ shopname: string }>();
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations] || translations.EN;
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [sellerInfo, setsellerInfo] = useState<sellerInfo | null>(null);
  const [shopStats, setShopStats] = useState<ShopStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{[key: string]: CartItem[]}>(cartApi.getCart());
  const [cartCount, setCartCount] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const categories = [
    'all', 
    'electronics', 
    'clothing', 
    'home', 
    'beauty', 
    'sports', 
    'books'
  ];

  // Load shop data on mount and when shopname changes
  useEffect(() => {
    if (shopname) {
      loadShopData();
    }
  }, [shopname]);

  // Load products when seller changes or filters change
  useEffect(() => {
    if (sellerInfo) {
      loadProducts();
      updateCartCount();
    }
  }, [sellerInfo, searchTerm, selectedCategory, currentPage]);

  // Update cart count when cart changes
  useEffect(() => {
    updateCartCount();
  }, [cart]);

  const updateCartCount = () => {
    if (sellerInfo) {
      setCartCount(cartApi.getCartItemCount(sellerInfo._id));
    }
  };

  const loadShopData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await sellerApi.getSellerByShopname(shopname || '');
      setsellerInfo(response.data.seller);
      setShopStats(response.data.stats);
    } catch (err: any) {
      console.error('Failed to load shop data:', err);
      setError(err.response?.data?.message || 'Failed to load shop data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!sellerInfo) return;

    try {
      const response = await sellerApi.getSellerProducts(sellerInfo._id, {
        page: currentPage,
        limit: 12,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      setProducts(response.data.products);
      setTotalPages(response.data.totalPages);
      setTotalProducts(response.data.total);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err.response?.data?.message || 'Failed to load products');
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!sellerInfo) return;

    try {
      cartApi.addItem(product._id, 1, sellerInfo._id);
      setCart(cartApi.getCart());
      
      // Show success message (you could add a toast notification here)
      console.log(`Added ${product.name} to cart`);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (!sellerInfo) return;

    try {
      cartApi.updateQuantity(productId, quantity, sellerInfo._id);
      setCart(cartApi.getCart());
    } catch (err) {
      console.error('Failed to update quantity:', err);
    }
  };

  const getProductCartQuantity = (productId: string): number => {
    if (!sellerInfo || !cart[sellerInfo._id]) return 0;
    const item = cart[sellerInfo._id].find((item: CartItem) => item.productId === productId);
    return item?.quantity || 0;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading shop...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Shop Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            to="/" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!sellerInfo || !shopStats) {
    return null;
  }

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
                <img src={tiktokLogo} alt="TikTok Logo" className="w-10 h-10 mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{currentLang.title}</h1>
                  <p className="text-sm text-gray-600">{sellerInfo.businessInfo?.storeName || sellerInfo.fullName}</p>
                </div>
              </div>

              {/* Right side - Cart and Language selector */}
              <div className="flex items-center space-x-4">
                {/* Shopping Cart */}
                <button 
                  onClick={() => navigate(`/checkout/${shopname}`)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FontAwesomeIcon icon={faShoppingCart} className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>

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
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Public Shop Content */}
          <div className="space-y-8">
            {/* Shop Header */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Banner */}
              <div className="h-48 bg-gradient-to-r from-purple-500 to-pink-500 relative">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {sellerInfo.businessInfo?.storeName || sellerInfo.fullName}
                  </h2>
                  <p className="text-white/90">
                    {sellerInfo.businessInfo?.storeDescription || sellerInfo.bio || 'Welcome to our shop!'}
                  </p>
                </div>
              </div>

              {/* Shop Stats */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{shopStats.followers.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{currentLang.followers}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{shopStats.following.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{currentLang.following}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{shopStats.totalProducts}</p>
                    <p className="text-sm text-gray-600">{currentLang.products}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center">
                      <p className="text-2xl font-bold text-gray-900 mr-1">{shopStats.rating.toFixed(1)}</p>
                      <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
                    </div>
                    <p className="text-sm text-gray-600">{currentLang.rating}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{shopStats.totalOrders.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Orders</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={currentLang.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="all">{currentLang.allCategories}</option>
                    {categories.slice(1).map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                  <FontAwesomeIcon icon={faChevronDown} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{currentLang.allProducts}</h3>
                <p className="text-sm text-gray-600">{totalProducts} products found</p>
              </div>
              
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => {
                    const cartQuantity = getProductCartQuantity(product._id);
                    const isInStock = product.stock > 0;
                    const productImage = product.images?.[0]?.url || '/placeholder-image.jpg';
                    
                    return (
                      <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative">
                          <img 
                            src={productImage} 
                            alt={product.name} 
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.jpg';
                            }}
                          />
                          {!isInStock && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-semibold">Out of Stock</span>
                            </div>
                          )}
                          {cartQuantity > 0 && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                              {cartQuantity}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h4>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                          
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xl font-bold text-gray-900">${product.salesPrice.toFixed(2)}</span>
                            <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                          </div>

                          {/* Cart Controls */}
                          {isInStock ? (
                            cartQuantity > 0 ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleUpdateQuantity(product._id, cartQuantity - 1)}
                                    className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                  >
                                    <FontAwesomeIcon icon={faMinus} className="text-xs" />
                                  </button>
                                  <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                                    {cartQuantity}
                                  </span>
                                  <button
                                    onClick={() => handleUpdateQuantity(product._id, cartQuantity + 1)}
                                    className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                  >
                                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                                  </button>
                                </div>
                                <div className="flex space-x-1">
                                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                    <FontAwesomeIcon icon={faHeart} />
                                  </button>
                                  <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                                    <FontAwesomeIcon icon={faShare} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <button 
                                  onClick={() => handleAddToCart(product)}
                                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors mr-2"
                                >
                                  <FontAwesomeIcon icon={faShoppingCart} className="mr-2" />
                                  {currentLang.addToCart}
                                </button>
                                <div className="flex space-x-1">
                                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                    <FontAwesomeIcon icon={faHeart} />
                                  </button>
                                  <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                                    <FontAwesomeIcon icon={faShare} />
                                  </button>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center justify-between">
                              <button 
                                disabled
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed mr-2"
                              >
                                Out of Stock
                              </button>
                              <div className="flex space-x-1">
                                <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                  <FontAwesomeIcon icon={faHeart} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                                  <FontAwesomeIcon icon={faShare} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FontAwesomeIcon icon={faSearch} className="text-6xl mb-4" />
                  <p className="text-xl">{currentLang.noProducts}</p>
                  <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-black text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Shop Information */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">{currentLang.shopInfo}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">{currentLang.contactInfo}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 mr-3" />
                      <span className="text-gray-700">Contact shop for inquiries</span>
                    </div>
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faCalendar} className="text-gray-400 mr-3" />
                      <span className="text-gray-700">
                        {currentLang.joined}: {new Date(sellerInfo.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faEye} className="text-gray-400 mr-3" />
                      <span className="text-gray-700">Business Type: {sellerInfo.businessInfo?.businessType || 'Individual'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">About This Shop</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {sellerInfo.businessInfo?.storeDescription || sellerInfo.bio || 
                     'Welcome to our shop! We offer quality products with excellent service.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserShop;
