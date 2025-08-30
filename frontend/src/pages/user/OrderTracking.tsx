import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faCheckCircle,
  faClock,
  faTruck,
  faBox,
  faClipboardCheck,
  faTimesCircle,
  faCalendarAlt,
  faMapMarkerAlt,
  faUser,
  faPhone,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { ordersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface OrderItem {
  product: {
    _id: string;
    name: string;
    images: Array<{ url: string; alt: string }>;
  };
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  paymentMethod: string;
  customerNotes?: string;
  trackingNumber?: string;
  orderDate: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  seller: {
    _id: string;
    fullName: string;
    businessInfo: {
      storeName: string;
    };
  };
}

const OrderTracking = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ordersApi.getOrder(orderId || '');
      setOrder(response.data);
    } catch (err: any) {
      console.error('Failed to load order:', err);
      setError(err.response?.data?.message || 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FontAwesomeIcon icon={faClock} className="text-yellow-500" />;
      case 'confirmed':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-blue-500" />;
      case 'processing':
        return <FontAwesomeIcon icon={faBox} className="text-purple-500" />;
      case 'shipped':
        return <FontAwesomeIcon icon={faTruck} className="text-indigo-500" />;
      case 'delivered':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'cancelled':
        return <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />;
      default:
        return <FontAwesomeIcon icon={faClock} className="text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order Pending';
      case 'confirmed':
        return 'Order Confirmed';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const isStatusCompleted = (status: string, currentStatus: string) => {
    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const statusIndex = statusOrder.indexOf(status);
    
    if (currentStatus === 'cancelled') {
      return false;
    }
    
    return statusIndex <= currentIndex;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This order could not be found or you do not have permission to view it.'}</p>
          <Link 
            to="/" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              to={`/shop/${order.seller.businessInfo.storeName || order.seller.fullName}`}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
              <p className="text-gray-600">Order #{order.orderNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Ordered from</p>
            <p className="font-semibold text-gray-900">
              {order.seller.businessInfo.storeName || order.seller.fullName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Status Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Order Status</h2>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(order.status)}
                  <span className="font-semibold text-gray-900">{getStatusText(order.status)}</span>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="space-y-4">
                {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((status, index) => {
                  const isCompleted = isStatusCompleted(status, order.status);
                  const isCurrent = order.status === status;
                  const isDisabled = order.status === 'cancelled' && status !== 'pending';
                  
                  return (
                    <div key={status} className="flex items-center">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted && !isDisabled
                          ? 'bg-green-500 text-white'
                          : isCurrent && !isDisabled
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted && !isDisabled ? (
                          <FontAwesomeIcon icon={faCheckCircle} className="text-sm" />
                        ) : (
                          <span className="text-sm font-semibold">{index + 1}</span>
                        )}
                      </div>
                      <div className={`ml-4 flex-1 ${
                        index < 4 ? 'border-l-2 border-gray-200 pb-4 pl-4' : 'pl-4'
                      }`}>
                        <p className={`font-medium ${
                          isCompleted && !isDisabled ? 'text-green-600' : 
                          isCurrent && !isDisabled ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {getStatusText(status)}
                        </p>
                        {order.statusHistory.find(h => h.status === status) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(order.statusHistory.find(h => h.status === status)!.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {order.trackingNumber && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Tracking Number</p>
                  <p className="text-lg font-mono text-blue-700">{order.trackingNumber}</p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
              
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-b-0">
                    <img
                      src={item.product?.images?.[0]?.url || '/placeholder-image.jpg'}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">{item.productName}</h3>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${item.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date</span>
                  <span className="text-gray-900">{new Date(order.orderDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="text-gray-900 capitalize">{order.paymentMethod.replace('_', ' ')}</span>
                </div>
                {order.customerNotes && (
                  <div>
                    <span className="text-gray-600 block mb-1">Notes</span>
                    <span className="text-gray-900 text-xs bg-gray-50 p-2 rounded block">
                      {order.customerNotes}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-blue-600" />
                Shipping Address
              </h2>
              
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && (
                  <p className="mt-2 flex items-center">
                    <FontAwesomeIcon icon={faPhone} className="mr-2 text-gray-400" />
                    {order.shippingAddress.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">
                    {order.shippingCost === 0 ? 'Free' : `$${order.shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">${order.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-700 mb-4">
                Contact the seller or our support team if you have any questions about your order.
              </p>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 bg-white border border-blue-300 rounded text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Contact Seller
                </button>
                <button className="w-full text-left px-3 py-2 bg-white border border-blue-300 rounded text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Support Center
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
