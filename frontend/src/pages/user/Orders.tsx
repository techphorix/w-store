import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { ordersApi } from '../../services/api';
import NotificationsDropdown from '../../components/NotificationsDropdown';
import { useSellerData } from '../../contexts/SellerDataContext';
import useRealTimeOrders from '../../hooks/useRealTimeOrders';

import {
  faGlobe,
  faChevronDown,
  faBell,
  faUser,
  faCog,
  faSignOutAlt,
  faClipboardList,
  faSearch,
  faFilter,
  faEye,
  faEdit,
  faDownload,
  faArrowLeft,
  faBox,
  faTruck,
  faCheckCircle,
  faTimesCircle,
  faCalendar,
  faDollarSign,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faChartLine,
  faRobot,
  faClock,
  faCheck,

  
} from '@fortawesome/free-solid-svg-icons';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import tiktokLogo from '../../assets/tiktok-logo.png';
import tiktokBackground from '../../assets/tiktok-background.jpg';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement);

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
    subtitle: 'Order Management',
    backToDashboard: 'Back to Dashboard',
    totalOrders: 'Total Orders',
    pendingOrders: 'Pending Orders',
    shippedOrders: 'Shipped Orders',
    completedOrders: 'Completed Orders',
    searchOrders: 'Search orders...',
    filterBy: 'Filter by',
    allOrders: 'All Orders',
        pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    // Legacy status options for backwards compatibility
    allStatuses: 'All Orders',
    waitingForPayment: 'Waiting for Payment',
    awaitingPickup: 'Awaiting Pickup',
    waitingForShipment: 'Waiting for Shipment',
    received: 'Received',
    completed: 'Completed',
    orderNumber: 'Order #',
    customer: 'Customer',
    products: 'Products',
    total: 'Total',
    status: 'Status',
    date: 'Date',
    actions: 'Actions',
    view: 'View',
    edit: 'Edit',
    download: 'Download',
    exportOrders: 'Export Orders',
    customerInfo: 'Customer Info',
    shippingAddress: 'Shipping Address',
    orderDetails: 'Order Details',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    customRange: 'Custom Range',
    // New tab translations
    today: 'Today',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    totalTab: 'Total',
    ordersChart: 'Orders Overview',
    ordersPerDay: 'Orders per Day',
    revenue: 'Revenue',
    ordersByStatus: 'Orders by Status'
  },
  ES: {
    title: 'TIENDA TIKTOK',
    subtitle: 'Gestión de Pedidos',
    backToDashboard: 'Volver al Panel',
    totalOrders: 'Pedidos Totales',
    pendingOrders: 'Pedidos Pendientes',
    shippedOrders: 'Pedidos Enviados',
    completedOrders: 'Pedidos Completados',
    searchOrders: 'Buscar pedidos...',
    filterBy: 'Filtrar por',
    allOrders: 'Todos los Pedidos',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
    // Legacy status options for backwards compatibility
    allStatuses: 'Todos los Pedidos',
    waitingForPayment: 'Esperando Pago',
    awaitingPickup: 'Esperando Recogida',
    waitingForShipment: 'Esperando Envío',
    received: 'Recibido',
    completed: 'Completado',
    orderNumber: 'Pedido #',
    customer: 'Cliente',
    products: 'Productos',
    total: 'Total',
    status: 'Estado',
    date: 'Fecha',
    actions: 'Acciones',
    view: 'Ver',
    edit: 'Editar',
    download: 'Descargar',
    exportOrders: 'Exportar Pedidos',
    customerInfo: 'Info del Cliente',
    shippingAddress: 'Dirección de Envío',
    orderDetails: 'Detalles del Pedido',
    notifications: 'Notificaciones',
    profile: 'Perfil',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    thisWeek: 'Esta Semana',
    thisMonth: 'Este Mes',
    thisYear: 'Este Año',
    customRange: 'Rango Personalizado',
    // New tab translations
    today: 'Hoy',
    last7Days: 'Últimos 7 Días',
    last30Days: 'Últimos 30 Días',
    totalTab: 'Total',
    ordersChart: 'Resumen de Pedidos',
    ordersPerDay: 'Pedidos por Día',
    revenue: 'Ingresos',
    ordersByStatus: 'Pedidos por Estado'
  },
  ZH: {
    title: 'TIKTOK商店',
    subtitle: '订单管理',
    backToDashboard: '返回仪表板',
    totalOrders: '总订单数',
    pendingOrders: '待处理订单',
    shippedOrders: '已发货订单',
    completedOrders: '已完成订单',
    searchOrders: '搜索订单...',
    filterBy: '筛选',
    allOrders: '所有订单',
    pending: '待处理',
    confirmed: '已确认',
    processing: '处理中',
    shipped: '已发货',
    delivered: '已送达',
    cancelled: '已取消',
    refunded: '已退款',
    // Legacy status options for backwards compatibility
    allStatuses: '所有订单',
    waitingForPayment: '等待付款',
    awaitingPickup: '等待取货',
    waitingForShipment: '等待发货',
    received: '已收到',
    completed: '已完成',
    orderNumber: '订单 #',
    customer: '客户',
    products: '产品',
    total: '总计',
    status: '状态',
    date: '日期',
    actions: '操作',
    view: '查看',
    edit: '编辑',
    download: '下载',
    exportOrders: '导出订单',
    customerInfo: '客户信息',
    shippingAddress: '收货地址',
    orderDetails: '订单详情',
    notifications: '通知',
    profile: '个人资料',
    settings: '设置',
    logout: '退出',
    thisWeek: '本周',
    thisMonth: '本月',
    thisYear: '今年',
    customRange: '自定义范围',
    // New tab translations
    today: '今天',
    last7Days: '最近7天',
    last30Days: '最近30天',
    totalTab: '全部',
    ordersChart: '订单概览',
    ordersPerDay: '每日订单',
    revenue: '收入',
    ordersByStatus: '按状态分类订单'
  }
};

interface Order {
  _id: string;
  id?: string; // Optional for backward compatibility
  orderNumber?: string;
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
  customer?: string; // ObjectId or populated user
  customerName?: string; // Optional for backward compatibility
  customerEmail?: string; // Optional for backward compatibility
  seller?: string; // Required by useRealTimeOrders
  items?: {
    product: string;
    productName: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }[];
  products?: { // Optional for backward compatibility
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  discount?: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'waitingForPayment' | 'awaitingPickup' | 'waitingForShipment' | 'received' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial';
  orderDate?: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string; // Optional for backward compatibility
  shippingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { shopname } = useParams<{ shopname: string }>();
  
  // Helper function to clean shopname (remove extra @ symbols)
  const cleanShopname = (name: string) => {
    return name ? name.replace(/^@+/, '') : name;
  };
  
  // Fallback shopname if not provided in URL
  const rawShopname = shopname || user?.businessInfo?.storeName || user?.fullName || 'default';
  const effectiveShopname = cleanShopname(rawShopname);

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations] || translations.EN;

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [activeTab, setActiveTab] = useState<'today' | 'last7Days' | 'last30Days' | 'total'>('today');

  // Real orders data from API with real-time updates
  const [initialOrders, setInitialOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const { orders, setOrders, joinOrderRoom, leaveOrderRoom } = useRealTimeOrders(initialOrders);
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    shippedOrders: 0,
    completedOrders: 0
  });
  
  // Fetch orders from API
  const fetchOrders = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    try {
      setIsLoadingOrders(true);
      
      // Use basic orders API
      const [ordersResponse, statsResponse] = await Promise.all([
        ordersApi.getOrders({
          page: 1,
          limit: 50,
          status: selectedStatus === 'all' ? undefined : selectedStatus
        }),
        ordersApi.getOrderStats()
      ]);
      
      setInitialOrders(ordersResponse.orders || []);
      setOrderStats({
        totalOrders: statsResponse.totalOrders || 0,
        pendingOrders: statsResponse.pendingOrders || 0,
        shippedOrders: statsResponse.shippedOrders || 0,
        completedOrders: statsResponse.completedOrders || 0
      });
      
      console.log(`📊 Orders loaded: ${statsResponse.totalOrders || 0} total orders`);
    } catch (error) {
      console.error('Error fetching enhanced orders:', error);
      setInitialOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, selectedPeriod, isAuthenticated, user, navigate]);



  // Fetch chart data from API
  const fetchChartData = async () => {
    try {
      const analyticsResponse = await ordersApi.getOrderAnalytics(8);
      return analyticsResponse;
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return { ordersOverTime: [], ordersByStatus: [] };
    }
  };

  // Generate dynamic chart data based on filtered orders (will be called after filtering)
  const generateOrdersChartData = (filteredOrdersData: typeof orders) => {
    const today = new Date();
    let labels: string[] = [];
    let orderCounts: number[] = [];
    let revenueCounts: number[] = [];

    if (activeTab === 'today') {
      // Show hourly data for today
      labels = ['6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];
      const todayOrders = filteredOrdersData.filter(order => {
        const dateStr = order.orderDate || order.date || order.createdAt;
        if (!dateStr) return false;
        const orderDate = new Date(dateStr);
        return !isNaN(orderDate.getTime()) && orderDate.toDateString() === today.toDateString();
      });
      
      // Group by hour ranges
      const hourRanges = [6, 9, 12, 15, 18, 21];
      orderCounts = hourRanges.map(hour => {
        return todayOrders.filter(order => {
          const dateStr = order.orderDate || order.date || order.createdAt;
          if (!dateStr) return false;
          const orderDate = new Date(dateStr);
          if (isNaN(orderDate.getTime())) return false;
          const orderHour = orderDate.getHours();
          return orderHour >= hour && orderHour < (hour + 3);
        }).length;
      });
      
      revenueCounts = hourRanges.map(hour => {
        return todayOrders.filter(order => {
          const dateStr = order.orderDate || order.date || order.createdAt;
          if (!dateStr) return false;
          const orderDate = new Date(dateStr);
          if (isNaN(orderDate.getTime())) return false;
          const orderHour = orderDate.getHours();
          return orderHour >= hour && orderHour < (hour + 3);
        }).reduce((sum, order) => sum + (order.total || 0), 0);
      });
      
    } else if (activeTab === 'last7Days') {
      // Show daily data for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const dayOrders = filteredOrdersData.filter(order => {
          const dateStr = order.orderDate || order.date || order.createdAt;
          if (!dateStr) return false;
          const orderDate = new Date(dateStr);
          return !isNaN(orderDate.getTime()) && orderDate.toDateString() === date.toDateString();
        });
        
        orderCounts.push(dayOrders.length);
        revenueCounts.push(dayOrders.reduce((sum, order) => sum + (order.total || 0), 0));
      }
      
    } else if (activeTab === 'last30Days') {
      // Show weekly data for last 30 days
      for (let i = 4; i >= 0; i--) {
        const endDate = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        labels.push(`${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        
        const weekOrders = filteredOrdersData.filter(order => {
          const dateStr = order.orderDate || order.date || order.createdAt;
          if (!dateStr) return false;
          const orderDate = new Date(dateStr);
          return !isNaN(orderDate.getTime()) && orderDate >= startDate && orderDate <= endDate;
        });
        
        orderCounts.push(weekOrders.length);
        revenueCounts.push(weekOrders.reduce((sum, order) => sum + (order.total || 0), 0));
      }
      
    } else {
      // Show monthly data for total
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        
        const monthOrders = filteredOrdersData.filter(order => {
          const dateStr = order.orderDate || order.date || order.createdAt;
          if (!dateStr) return false;
          const orderDate = new Date(dateStr);
          return !isNaN(orderDate.getTime()) && orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
        });
        
        orderCounts.push(monthOrders.length);
        revenueCounts.push(monthOrders.reduce((sum, order) => sum + (order.total || 0), 0));
      }
    }

    return {
      labels,
      datasets: [
        {
          label: currentLang.ordersPerDay,
          data: orderCounts,
          borderColor: 'rgb(0, 0, 0)',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          tension: 0.4,
        },
        {
          label: currentLang.revenue,
          data: revenueCounts,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          yAxisID: 'y1',
        }
      ],
    };
  };

  // Generate dynamic status chart data based on filtered orders (will be called after filtering)
  const generateStatusChartData = (filteredOrdersData: typeof orders) => {
    const statusCounts = {
      pending: filteredOrdersData.filter(o => o.status === 'pending').length,
      confirmed: filteredOrdersData.filter(o => o.status === 'confirmed').length,
      processing: filteredOrdersData.filter(o => o.status === 'processing').length,
      shipped: filteredOrdersData.filter(o => o.status === 'shipped').length,
      delivered: filteredOrdersData.filter(o => o.status === 'delivered').length,
      cancelled: filteredOrdersData.filter(o => o.status === 'cancelled').length,
      refunded: filteredOrdersData.filter(o => o.status === 'refunded').length,
      // Legacy status support
      waitingForPayment: filteredOrdersData.filter(o => o.status === 'waitingForPayment').length,
      awaitingPickup: filteredOrdersData.filter(o => o.status === 'awaitingPickup').length,
      waitingForShipment: filteredOrdersData.filter(o => o.status === 'waitingForShipment').length,
      received: filteredOrdersData.filter(o => o.status === 'received').length,
      completed: filteredOrdersData.filter(o => o.status === 'completed').length,
    };

    // Filter out statuses with zero counts for cleaner chart
    const activeStatuses = Object.entries(statusCounts).filter(([_, count]) => count > 0);
    
    return {
      labels: activeStatuses.map(([status, _]) => {
        // Map status to display labels
        const statusLabels: Record<string, string> = {
          pending: currentLang.pending,
          confirmed: currentLang.confirmed,
          processing: currentLang.processing,
          shipped: currentLang.shipped,
          delivered: currentLang.delivered,
          cancelled: currentLang.cancelled,
          refunded: currentLang.refunded,
          // Legacy support
          waitingForPayment: currentLang.waitingForPayment,
          awaitingPickup: currentLang.awaitingPickup,
          waitingForShipment: currentLang.waitingForShipment,
          received: currentLang.received,
          completed: currentLang.completed,
        };
        return statusLabels[status] || status;
      }),
      datasets: [
        {
          label: currentLang.ordersByStatus,
          data: activeStatuses.map(([_, count]) => count),
          backgroundColor: activeStatuses.map(([status, _]) => {
            // Color mapping for different statuses
            const statusColors: Record<string, string> = {
              pending: 'rgba(249, 115, 22, 0.8)',              // orange
              confirmed: 'rgba(59, 130, 246, 0.8)',            // blue
              processing: 'rgba(251, 191, 36, 0.8)',           // yellow
              shipped: 'rgba(147, 51, 234, 0.8)',              // purple
              delivered: 'rgba(34, 197, 94, 0.8)',             // green
              cancelled: 'rgba(239, 68, 68, 0.8)',             // red
              refunded: 'rgba(156, 163, 175, 0.8)',            // gray
              // Legacy support
              waitingForPayment: 'rgba(249, 115, 22, 0.8)',
              awaitingPickup: 'rgba(251, 191, 36, 0.8)',
              waitingForShipment: 'rgba(59, 130, 246, 0.8)',
              received: 'rgba(99, 102, 241, 0.8)',
              completed: 'rgba(34, 197, 94, 0.8)',
            };
            return statusColors[status] || 'rgba(156, 163, 175, 0.8)';
          }),
          borderColor: activeStatuses.map(([status, _]) => {
            // Border color mapping
            const borderColors: Record<string, string> = {
              pending: 'rgb(249, 115, 22)',
              confirmed: 'rgb(59, 130, 246)',
              processing: 'rgb(251, 191, 36)',
              shipped: 'rgb(147, 51, 234)',
              delivered: 'rgb(34, 197, 94)',
              cancelled: 'rgb(239, 68, 68)',
              refunded: 'rgb(156, 163, 175)',
              // Legacy support
              waitingForPayment: 'rgb(249, 115, 22)',
              awaitingPickup: 'rgb(251, 191, 36)',
              waitingForShipment: 'rgb(59, 130, 246)',
              received: 'rgb(99, 102, 241)',
              completed: 'rgb(34, 197, 94)',
            };
            return borderColors[status] || 'rgb(156, 163, 175)';
          }),
          borderWidth: 2,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Helper function to check if order matches date tab
  const matchesDateTab = (orderDate: string | undefined, tab: string) => {
    if (!orderDate) return tab === 'total'; // If no date, only show in 'total' tab
    
    const today = new Date();
    const orderDateObj = new Date(orderDate);
    
    // Check if date is valid
    if (isNaN(orderDateObj.getTime())) return tab === 'total';
    
    switch (tab) {
      case 'today':
        return orderDateObj.toDateString() === today.toDateString();
      case 'last7Days':
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDateObj >= sevenDaysAgo;
      case 'last30Days':
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDateObj >= thirtyDaysAgo;
      case 'total':
        return true;
      default:
        return true;
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
                            (order.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                      (order._id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                      (order.orderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                      (order.customerInfo?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                      (order.customerInfo?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                      (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                      (order.customerEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesDate = matchesDateTab(order.orderDate || order.date || order.createdAt, activeTab);
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Stats calculation based on filtered orders
  const stats = {
    totalOrders: filteredOrders.length,
    pendingOrders: filteredOrders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing').length,
    shippedOrders: filteredOrders.filter(o => o.status === 'shipped').length,
    completedOrders: filteredOrders.filter(o => o.status === 'delivered').length
  };

  // Generate chart data with filtered orders
  const ordersChartData = generateOrdersChartData(filteredOrders);
  const statusChartData = generateStatusChartData(filteredOrders);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'shipped': return 'text-purple-600 bg-purple-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'refunded': return 'text-gray-600 bg-gray-100';
      // Legacy status support
      case 'waitingForPayment': return 'text-orange-600 bg-orange-100';
      case 'awaitingPickup': return 'text-yellow-600 bg-yellow-100';
      case 'waitingForShipment': return 'text-blue-600 bg-blue-100';
      case 'received': return 'text-indigo-600 bg-indigo-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return faClock;
      case 'confirmed': return faCheck;
      case 'processing': return faBox;
      case 'shipped': return faTruck;
      case 'delivered': return faCheckCircle;
      case 'cancelled': return faTimesCircle;
      case 'refunded': return faTimesCircle;
      // Legacy status support
      case 'waitingForPayment': return faDollarSign;
      case 'awaitingPickup': return faBox;
      case 'waitingForShipment': return faBox;
      case 'received': return faCheckCircle;
      case 'completed': return faCheckCircle;
      default: return faBox;
    }
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Orders...</p>
        </div>
      </div>
    );
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
      <div className="absolute inset-0 bg-black bg-opacity-10"></div>

      {/* Language Converter - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg px-4 py-2 shadow-lg hover:bg-white transition-all">
            <FontAwesomeIcon icon={faGlobe} className="w-4 h-4 text-black mr-2" />
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
              className="appearance-none bg-transparent text-sm font-medium text-gray-900 cursor-pointer outline-none pr-6"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-black" />
            </div>
          </div>
          </div>
        </div>

      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left side - Logo and Back */}
              <div className="flex items-center space-x-4">
                <Link
                  to={`/dashboard/${effectiveShopname}`}
                  className="flex items-center text-gray-700 hover:text-black font-medium"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                  {currentLang.backToDashboard}
                </Link>
                
                <div className="flex items-center">
                  <img
                    src={tiktokLogo}
                    alt="TikTok Logo"
                    className="w-8 h-8 mr-2"
                  />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">{currentLang.title}</h1>
                    <p className="text-sm text-gray-600">{currentLang.subtitle}</p>
                    </div>
                  </div>
                </div>

              {/* Right side - User controls */}
                <div className="flex items-center space-x-4">

                
                <NotificationsDropdown />
                
                <div className="relative group">
                  <button className="flex items-center p-2 text-gray-600 hover:text-black">
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
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Date Tab Navigation */}
          <div className="flex justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-gray-200 inline-flex">
              <button
                onClick={() => setActiveTab('today')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'today'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {currentLang.today}
              </button>
              <button
                onClick={() => setActiveTab('last7Days')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'last7Days'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {currentLang.last7Days}
              </button>
              <button
                onClick={() => setActiveTab('last30Days')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'last30Days'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {currentLang.last30Days}
              </button>
              <button
                onClick={() => setActiveTab('total')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'total'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {currentLang.totalTab}
              </button>
            </div>
          </div>

          {/* Order Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.totalOrders}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <div className="p-3 bg-black rounded-lg">
                  <FontAwesomeIcon icon={faClipboardList} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                    <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.pendingOrders}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                </div>
                <div className="p-3 bg-yellow-500 rounded-lg">
                  <FontAwesomeIcon icon={faBox} className="w-6 h-6 text-white" />
                </div>
              </div>
                    </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                    <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.shippedOrders}</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.shippedOrders}</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-lg">
                  <FontAwesomeIcon icon={faTruck} className="w-6 h-6 text-white" />
                </div>
              </div>
                    </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                    <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.completedOrders}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
                </div>
                <div className="p-3 bg-green-500 rounded-lg">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Orders Overview Chart */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                {currentLang.ordersChart}
              </h3>
              <Line data={ordersChartData} options={chartOptions} />
            </div>

            {/* Orders by Status Chart */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {currentLang.ordersByStatus}
              </h3>
              <Bar data={statusChartData} options={barChartOptions} />
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={currentLang.searchOrders}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
        </div>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="all">{currentLang.allOrders}</option>
                  <option value="pending">{currentLang.pending}</option>
                  <option value="confirmed">{currentLang.confirmed}</option>
                  <option value="processing">{currentLang.processing}</option>
                  <option value="shipped">{currentLang.shipped}</option>
                  <option value="delivered">{currentLang.delivered}</option>
                  <option value="cancelled">{currentLang.cancelled}</option>
                  <option value="refunded">{currentLang.refunded}</option>
                </select>

                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="thisWeek">{currentLang.thisWeek}</option>
                  <option value="thisMonth">{currentLang.thisMonth}</option>
                  <option value="thisYear">{currentLang.thisYear}</option>
                  <option value="custom">{currentLang.customRange}</option>
                </select>
              </div>

              {/* Export Button */}
              <button className="flex items-center justify-center px-6 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                {currentLang.exportOrders}
              </button>
              </div>
              </div>

          {/* Orders Table */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.orderNumber}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.customer}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.products}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.total}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.status}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.date}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order._id || order.id || Math.random()} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">{order.orderNumber || order.id || order._id || 'N/A'}</div>
                          {order.isSimulated && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              <FontAwesomeIcon icon={faChartLine} className="mr-1" />
                              Demo
                            </span>
                          )}
                          {order.isLocalGenerated && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              <FontAwesomeIcon icon={faRobot} className="mr-1" />
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.customerInfo?.name || order.customerName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{order.customerInfo?.email || order.customerEmail || 'N/A'}</div>
              </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {(order.items || order.products || []).map((item, index) => (
                            <div key={index} className="mb-1">
                              {item?.quantity || 0}x {item?.productName || item?.name || 'Unknown Product'}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">${order.total || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status || 'pending')}`}>
                          <FontAwesomeIcon icon={getStatusIcon(order.status || 'pending')} className="mr-1" />
                          {currentLang[(order.status || 'pending') as keyof typeof currentLang] || order.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.orderDate || order.date || order.createdAt || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button className="text-green-600 hover:text-green-800">
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800">
                            <FontAwesomeIcon icon={faDownload} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      

    </div>
  );
};

export default Orders;
