import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faShoppingCart,
  faCreditCard,
  faMapMarkerAlt,
  faUser,
  faPhone,
  faEnvelope,
  faSpinner,
  faCheckCircle,
  faPlus,
  faMinus,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { cartApi, sellerApi, ordersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Product {
  _id: string;
  name: string;
  description: string;
  salesPrice: number;
  images: Array<{ url: string; alt: string }>;
}

interface CartItem {
  productId: string;
  quantity: number;
  product?: Product;
}

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { shopname } = useParams<{ shopname: string }>();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Cart and seller data
  const [sellerInfo, setsellerInfo] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [productsData, setProductsData] = useState<{[key: string]: Product}>({});
  
  // Form data
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: user?.fullName || '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    phone: user?.phoneNumber || ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [customerNotes, setCustomerNotes] = useState('');

  useEffect(() => {
    if (shopname) {
      loadCheckoutData();
    }
  }, [shopname]);

  const loadCheckoutData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get seller info
      const sellerResponse = await sellerApi.getSellerByShopname(shopname || '');
      setsellerInfo(sellerResponse.data.seller);
      
      // Get cart items for this seller
      const cart = cartApi.getCart();
      const sellerCart = cart[sellerResponse.data.seller._id];
      
      if (!sellerCart || sellerCart.length === 0) {
        setError('Your cart is empty');
        return;
      }
      
      setCartItems(sellerCart);
      
      // Load product details for cart items
      const productPromises = sellerCart.map(async (item: CartItem) => {
        try {
          // For now, we'll use a simplified approach since we don't have a single product endpoint
          // In a real app, you'd fetch individual product details
          return { id: item.productId, ...item };
        } catch (err) {
          console.error(`Failed to load product ${item.productId}:`, err);
          return null;
        }
      });
      
      const products = await Promise.all(productPromises);
      const productsMap: {[key: string]: Product} = {};
      
      products.forEach(product => {
        if (product) {
          // For demo purposes, we'll create mock product data
          productsMap[product.id] = {
            _id: product.id,
            name: `Product ${product.id.slice(-4)}`,
            description: 'Product description...',
            salesPrice: Math.floor(Math.random() * 100) + 10,
            images: [{ url: '/placeholder-image.jpg', alt: 'Product image' }]
          };
        }
      });
      
      setProductsData(productsMap);
      
    } catch (err: any) {
      console.error('Failed to load checkout data:', err);
      setError(err.response?.data?.message || 'Failed to load checkout data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (!sellerInfo) return;
    
    cartApi.updateQuantity(productId, quantity, sellerInfo._id);
    
    // Update local state
    setCartItems(prev => {
      if (quantity <= 0) {
        return prev.filter(item => item.productId !== productId);
      }
      return prev.map(item => 
        item.productId === productId ? { ...item, quantity } : item
      );
    });
  };

  const removeItem = (productId: string) => {
    if (!sellerInfo) return;
    
    cartApi.removeItem(productId, sellerInfo._id);
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const product = productsData[item.productId];
      return total + (product?.salesPrice || 0) * item.quantity;
    }, 0);
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal > 100 ? 0 : 10; // Free shipping over $100
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() + calculateTax();
  };

  const handleSubmitOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const orderData = {
        sellerId: sellerInfo._id,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        shippingAddress,
        paymentMethod,
        customerNotes: customerNotes || undefined
      };

      const orderResponse = await ordersApi.createOrder(orderData);
      
      // Clear cart for this seller
      cartApi.clearCart(sellerInfo._id);
      
      setSuccess(true);
      
      // Redirect to order tracking page after 2 seconds
      setTimeout(() => {
        if (orderResponse.order?._id) {
          navigate(`/order/${orderResponse.order._id}`);
        } else {
          navigate(`/shop/${shopname}`);
        }
      }, 2000);

    } catch (err: any) {
      console.error('Failed to create order:', err);
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error && cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faShoppingCart} className="text-6xl text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cart is Empty</h1>
          <p className="text-gray-600 mb-6">Add some items to your cart before checking out.</p>
          <button 
            onClick={() => navigate(`/shop/${shopname}`)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faCheckCircle} className="text-6xl text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-6">Thank you for your order. You'll receive a confirmation email shortly.</p>
          <p className="text-sm text-gray-500">Redirecting you to order tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate(`/shop/${shopname}`)}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          </div>
          {sellerInfo && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Shopping at</p>
              <p className="font-semibold text-gray-900">
                {sellerInfo.businessInfo?.storeName || sellerInfo.fullName}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-blue-600" />
                Shipping Address
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={shippingAddress.zipCode}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FontAwesomeIcon icon={faCreditCard} className="mr-2 text-blue-600" />
                Payment Method
              </h2>
              
              <div className="space-y-3">
                {[
                  { value: 'credit_card', label: 'Credit Card' },
                  { value: 'debit_card', label: 'Debit Card' },
                  { value: 'paypal', label: 'PayPal' },
                  { value: 'cash_on_delivery', label: 'Cash on Delivery' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={paymentMethod === option.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Order Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Notes (Optional)</h2>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Any special instructions for your order..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const product = productsData[item.productId];
                  if (!product) return null;
                  
                  return (
                    <div key={item.productId} className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-b-0">
                      <img
                        src={product.images[0]?.url || '/placeholder-image.jpg'}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500">${product.salesPrice.toFixed(2)} each</p>
                        
                        <div className="flex items-center mt-2 space-x-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                          >
                            <FontAwesomeIcon icon={faMinus} className="text-xs" />
                          </button>
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium min-w-[40px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                          >
                            <FontAwesomeIcon icon={faPlus} className="text-xs" />
                          </button>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="ml-2 p-1 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          ${(product.salesPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">
                    {calculateShipping() === 0 ? 'Free' : `$${calculateShipping().toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">${calculateTax().toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || cartItems.length === 0}
                className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Processing Order...
                  </>
                ) : (
                  `Place Order - $${calculateTotal().toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
