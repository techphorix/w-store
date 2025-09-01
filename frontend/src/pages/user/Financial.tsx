import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { useSellerData } from '../../contexts/SellerDataContext';
import { financeApi } from '../../services/api';

import {
  faGlobe,
  faChevronDown,
  faBell,
  faUser,
  faCog,
  faSignOutAlt,
  faWallet,
  faArrowUp,
  faArrowDown,
  faDownload,
  faArrowLeft,
  faChartLine,
  faCreditCard,
  faFilter,
  faPlus,
  faMinus,
  faLock,
  faPiggyBank,
  faArrowTrendUp,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import tiktokLogo from '../../assets/tiktok-logo.png';
import tiktokBackground from '../../assets/tiktok-background.jpg';
const backendBase = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

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
    subtitle: 'Financial Management',
    backToDashboard: 'Back to Dashboard',
    totalRevenue: 'Total Revenue',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    pendingPayouts: 'Pending Payouts',
    revenueChart: 'Revenue Overview',
    expenseBreakdown: 'Expense Breakdown',
    recentTransactions: 'Recent Transactions',
    downloadReport: 'Download Report',
    filterBy: 'Filter by',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    thisYear: 'This Year',
    customRange: 'Custom Range',
    transactionId: 'Transaction ID',
    description: 'Description',
    amount: 'Amount',
    type: 'Type',
    date: 'Date',
    status: 'Status',
    income: 'Income',
    expense: 'Expense',
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    paymentMethods: 'Payment Methods',
    bankAccount: 'Bank Account',
    paypal: 'PayPal',
    stripe: 'Stripe',
    categories: {
      productSales: 'Product Sales',
      shipping: 'Shipping',
      marketing: 'Marketing',
      operations: 'Operations',
      refunds: 'Refunds'
    },
    // New translations for deposit/withdrawal and investments
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    fixedTermManagement: 'Fixed-Term Financial Management',
    investmentPlans: 'Investment Plans',
    depositFunds: 'Deposit Funds',
    withdrawFunds: 'Withdraw Funds',
    availableBalance: 'Available Balance',
    minimumAmount: 'Minimum Amount',
    maximumAmount: 'Maximum Amount',
    enterAmount: 'Enter Amount',
    selectPaymentMethod: 'Select Payment Method',
    processingTime: 'Processing Time',
    instantTransfer: 'Instant Transfer',
    bankTransfer: 'Bank Transfer',
    confirm: 'Confirm',
    cancel: 'Cancel',
    // Investment plans
    plan15Days: '15 Days Plan',
    plan30Days: '30 Days Plan',
    plan60Days: '60 Days Plan',
    returnRate: 'Return Rate',
    minInvestment: 'Min Investment',
    duration: 'Duration',
    totalReturn: 'Total Return',
    maturityDate: 'Maturity Date',
    invest: 'Invest',
    myInvestments: 'My Investments',
    activeInvestments: 'Active Investments',
    completedInvestments: 'Completed Investments',
    totalInvested: 'Total Invested',
    totalEarned: 'Total Earned',
    overview: 'Overview',
    transactions: 'Transactions',
    investments: 'Investments'
  },
  ES: {
    title: 'TIENDA TIKTOK',
    subtitle: 'Gestión Financiera',
    backToDashboard: 'Volver al Panel',
    totalRevenue: 'Ingresos Totales',
    totalExpenses: 'Gastos Totales',
    netProfit: 'Beneficio Neto',
    pendingPayouts: 'Pagos Pendientes',
    revenueChart: 'Resumen de Ingresos',
    expenseBreakdown: 'Desglose de Gastos',
    recentTransactions: 'Transacciones Recientes',
    downloadReport: 'Descargar Informe',
    filterBy: 'Filtrar por',
    thisMonth: 'Este Mes',
    lastMonth: 'Mes Pasado',
    thisYear: 'Este Año',
    customRange: 'Rango Personalizado',
    transactionId: 'ID de Transacción',
    description: 'Descripción',
    amount: 'Cantidad',
    type: 'Tipo',
    date: 'Fecha',
    status: 'Estado',
    income: 'Ingreso',
    expense: 'Gasto',
    completed: 'Completado',
    pending: 'Pendiente',
    failed: 'Fallido',
    notifications: 'Notificaciones',
    profile: 'Perfil',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    paymentMethods: 'Métodos de Pago',
    bankAccount: 'Cuenta Bancaria',
    paypal: 'PayPal',
    stripe: 'Stripe',
    categories: {
      productSales: 'Ventas de Productos',
      shipping: 'Envío',
      marketing: 'Marketing',
      operations: 'Operaciones',
      refunds: 'Reembolsos'
    },
    // New translations for deposit/withdrawal and investments
    deposit: 'Depósito',
    withdrawal: 'Retiro',
    fixedTermManagement: 'Gestión Financiera a Plazo Fijo',
    investmentPlans: 'Planes de Inversión',
    depositFunds: 'Depositar Fondos',
    withdrawFunds: 'Retirar Fondos',
    availableBalance: 'Saldo Disponible',
    minimumAmount: 'Cantidad Mínima',
    maximumAmount: 'Cantidad Máxima',
    enterAmount: 'Ingresar Cantidad',
    selectPaymentMethod: 'Seleccionar Método de Pago',
    processingTime: 'Tiempo de Procesamiento',
    instantTransfer: 'Transferencia Instantánea',
    bankTransfer: 'Transferencia Bancaria',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    // Investment plans
    plan15Days: 'Plan 15 Días',
    plan30Days: 'Plan 30 Días',
    plan60Days: 'Plan 60 Días',
    returnRate: 'Tasa de Retorno',
    minInvestment: 'Inversión Mínima',
    duration: 'Duración',
    totalReturn: 'Retorno Total',
    maturityDate: 'Fecha de Vencimiento',
    invest: 'Invertir',
    myInvestments: 'Mis Inversiones',
    activeInvestments: 'Inversiones Activas',
    completedInvestments: 'Inversiones Completadas',
    totalInvested: 'Total Invertido',
    totalEarned: 'Total Ganado',
    overview: 'Resumen',
    transactions: 'Transacciones',
    investments: 'Inversiones'
  },
  ZH: {
    title: 'TIKTOK商店',
    subtitle: '财务管理',
    backToDashboard: '返回仪表板',
    totalRevenue: '总收入',
    totalExpenses: '总支出',
    netProfit: '净利润',
    pendingPayouts: '待付款',
    revenueChart: '收入概览',
    expenseBreakdown: '支出明细',
    recentTransactions: '最近交易',
    downloadReport: '下载报告',
    filterBy: '筛选',
    thisMonth: '本月',
    lastMonth: '上月',
    thisYear: '今年',
    customRange: '自定义范围',
    transactionId: '交易ID',
    description: '描述',
    amount: '金额',
    type: '类型',
    date: '日期',
    status: '状态',
    income: '收入',
    expense: '支出',
    completed: '已完成',
    pending: '待处理',
    failed: '失败',
    notifications: '通知',
    profile: '个人资料',
    settings: '设置',
    logout: '退出',
    paymentMethods: '支付方式',
    bankAccount: '银行账户',
    paypal: 'PayPal',
    stripe: 'Stripe',
    categories: {
      productSales: '产品销售',
      shipping: '运费',
      marketing: '营销',
      operations: '运营',
      refunds: '退款'
    },
    // New translations for deposit/withdrawal and investments
    deposit: '存款',
    withdrawal: '提款',
    fixedTermManagement: '定期理财管理',
    investmentPlans: '投资计划',
    depositFunds: '存入资金',
    withdrawFunds: '提取资金',
    availableBalance: '可用余额',
    minimumAmount: '最低金额',
    maximumAmount: '最高金额',
    enterAmount: '输入金额',
    selectPaymentMethod: '选择支付方式',
    processingTime: '处理时间',
    instantTransfer: '即时转账',
    bankTransfer: '银行转账',
    confirm: '确认',
    cancel: '取消',
    // Investment plans
    plan15Days: '15天计划',
    plan30Days: '30天计划',
    plan60Days: '60天计划',
    returnRate: '收益率',
    minInvestment: '最低投资',
    duration: '期限',
    totalReturn: '总收益',
    maturityDate: '到期日',
    invest: '投资',
    myInvestments: '我的投资',
    activeInvestments: '活跃投资',
    completedInvestments: '已完成投资',
    totalInvested: '总投资额',
    totalEarned: '总收益',
    overview: '概览',
    transactions: '交易',
    investments: '投资'
  }
};

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  category: string;
}

interface Investment {
  id: string;
  plan: '15days' | '30days' | '60days';
  amount: number;
  returnRate: number;
  startDate: string;
  maturityDate: string;
  status: 'active' | 'completed' | 'cancelled';
  totalReturn: number;
  currentValue: number;
}

interface InvestmentPlan {
  id: string;
  name: string;
  duration: number;
  returnRate: number;
  minInvestment: number;
  description: string;
}

const Financial = () => {
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
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdrawal' | 'investments'>('overview');
  const [error, setError] = useState<string | null>(null);

  // Financial data state
  const [financeData, setFinanceData] = useState({
    totalFinancing: 0,
    yesterdayEarnings: 0,
    accumulatedEarnings: 0,
    pendingAmount: 0,
    investments: []
  });

  // Deposit/Withdrawal state
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedWithdrawalAccountId, setSelectedWithdrawalAccountId] = useState<string>('');
  const [depositReference, setDepositReference] = useState('');
  const [depositScreenshot, setDepositScreenshot] = useState<File | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [showDepositSuccess, setShowDepositSuccess] = useState(false);
  const [depositConfirmation, setDepositConfirmation] = useState<{ depositId?: string; amount?: number } | null>(null);
  const [myDeposits, setMyDeposits] = useState<any[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState({ deposits: false, withdrawals: false });
  
  // Payment methods state
  const [depositPaymentMethods, setDepositPaymentMethods] = useState<any[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<any[]>([]);
  const [withdrawalAccounts, setWithdrawalAccounts] = useState<any[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState<{ methodId: string; label?: string; details: any; isDefault?: boolean }>({ methodId: '', details: {} });

  // Investment state
  const [selectedInvestmentPlan, setSelectedInvestmentPlan] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('');

  // Investment plans data
  const investmentPlans: InvestmentPlan[] = [
    {
      id: '60days',
      name: currentLang.plan60Days,
      duration: 60,
      returnRate: 15,
      minInvestment: 100,
      description: '60 days with 15% return'
    },
    {
      id: '30days',
      name: currentLang.plan30Days,
      duration: 30,
      returnRate: 10,
      minInvestment: 50,
      description: '30 days with 10% return'
    },
    {
      id: '15days',
      name: currentLang.plan15Days,
      duration: 15,
      returnRate: 7,
      minInvestment: 25,
      description: '15 days with 7% return'
    }
  ];

  // Sample investments data
  const [investments] = useState<Investment[]>([
    {
      id: 'INV001',
      plan: '30days',
      amount: 500,
      returnRate: 10,
      startDate: '2024-01-01',
      maturityDate: '2024-01-31',
      status: 'active',
      totalReturn: 50,
      currentValue: 525
    },
    {
      id: 'INV002',
      plan: '15days',
      amount: 200,
      returnRate: 7,
      startDate: '2023-12-15',
      maturityDate: '2023-12-30',
      status: 'completed',
      totalReturn: 14,
      currentValue: 214
    }
  ]);

  // Use centralized seller data
  const { financialData: sellerFinancialData, isLoading: sellerDataLoading, error: sellerDataError } = useSellerData();

  // Update local state when centralized data changes
  useEffect(() => {
    if (sellerFinancialData) {
      setFinanceData(sellerFinancialData);
    }
  }, [sellerFinancialData]);

  // Sample financial data
  const [transactions] = useState<Transaction[]>([
    {
      id: 'TXN001',
      description: 'Product Sale - Wireless Headphones',
      amount: 89.99,
      type: 'income',
      status: 'completed',
      date: '2024-01-15',
      category: 'productSales'
    },
    {
      id: 'TXN002',
      description: 'Shipping Cost',
      amount: -12.50,
      type: 'expense',
      status: 'completed',
      date: '2024-01-14',
      category: 'shipping'
    },
    {
      id: 'TXN003',
      description: 'Product Sale - T-Shirt',
      amount: 24.99,
      type: 'income',
      status: 'pending',
      date: '2024-01-13',
      category: 'productSales'
    },
    {
      id: 'TXN004',
      description: 'Marketing Campaign',
      amount: -150.00,
      type: 'expense',
      status: 'completed',
      date: '2024-01-12',
      category: 'marketing'
    },
    {
      id: 'TXN005',
      description: 'Product Sale - Face Moisturizer',
      amount: 45.00,
      type: 'income',
      status: 'completed',
      date: '2024-01-11',
      category: 'productSales'
    }
  ]);

  // Financial stats
  const stats = {
    totalRevenue: 2450.75,
    totalExpenses: 890.25,
    netProfit: 1560.50,
    pendingPayouts: 340.25
  };

  // Chart data
  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [1200, 1900, 3000, 5000, 2000, 3000],
        borderColor: 'rgb(0, 0, 0)',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const expenseBreakdownData = {
    labels: Object.values(currentLang.categories),
    datasets: [
      {
        data: [65, 15, 10, 7, 3],
        backgroundColor: [
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#06B6D4',
        ],
        borderWidth: 0,
      },
    ],
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
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600';
  };

  const normalizeUploadUrl = (raw?: string) => {
    if (!raw) return '';
    let p = String(raw).replace(/\\/g,'/');
    const idx = p.toLowerCase().lastIndexOf('/uploads/');
    if (idx >= 0) p = p.slice(idx);
    if (!p.startsWith('/uploads/')) {
      if (p.startsWith('uploads/')) p = '/' + p; else p = '/uploads/' + p.replace(/^\/+/, '');
    }
    return `${backendBase}${p}`;
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const [paymentMethodsResponse, withdrawalMethodsResponse] = await Promise.all([
          financeApi.getDepositPaymentMethods(),
          financeApi.getWithdrawalMethods()
        ]);
        
        setDepositPaymentMethods(paymentMethodsResponse.paymentMethods || []);
        setWithdrawalMethods(withdrawalMethodsResponse.withdrawalMethods || []);
        
        // Set default selected payment method if available
        if (paymentMethodsResponse.paymentMethods?.length > 0) {
          setSelectedPaymentMethod(paymentMethodsResponse.paymentMethods[0].id);
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    };
    
    const fetchAccounts = async () => {
      try {
        const resp = await financeApi.getWithdrawalAccounts();
        const accounts = resp.accounts || [];
        setWithdrawalAccounts(accounts);
        if (accounts.length > 0) {
          const def = accounts.find((a: any) => a.is_default);
          setSelectedWithdrawalAccountId(def ? def.id : accounts[0].id);
        }
      } catch (e) {
        console.error('Error fetching withdrawal accounts:', e);
      }
    };

    fetchPaymentMethods();
    fetchAccounts();
  }, []);

  // Fetch available balance from server
  useEffect(() => {
    (async () => {
      try {
        const resp = await financeApi.getBalance();
        if (typeof resp.availableBalance === 'number') {
          setAvailableBalance(resp.availableBalance);
        } else if (typeof resp?.available_balance === 'number') {
          setAvailableBalance(resp.available_balance);
        }
      } catch (e) {
        // Non-fatal; keep existing balance
        console.warn('Failed to fetch balance', e);
      }
    })();
  }, []);

  // Fetch deposit and withdrawal transactions for current seller
  useEffect(() => {
    const loadDeposits = async () => {
      setListLoading(l => ({ ...l, deposits: true }));
      try {
        const resp = await financeApi.listMyDeposits();
        setMyDeposits(resp.deposits || []);
      } catch (e) {
        console.error('Failed to load my deposits', e);
      } finally {
        setListLoading(l => ({ ...l, deposits: false }));
      }
    };
    const loadWithdrawals = async () => {
      setListLoading(l => ({ ...l, withdrawals: true }));
      try {
        const resp = await financeApi.getTransactions({ type: 'payout', limit: 50 });
        setMyWithdrawals(resp.transactions || resp || []);
      } catch (e) {
        console.error('Failed to load my withdrawals', e);
      } finally {
        setListLoading(l => ({ ...l, withdrawals: false }));
      }
    };
    loadDeposits();
    loadWithdrawals();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Financial Data...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null; // useEffect will handle redirect
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Financial Data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
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
                <button className="p-2 text-gray-600 hover:text-black">
                  <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
                </button>
                
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
          {/* Tab Navigation */}
          <div className="flex justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-gray-200 inline-flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                {currentLang.overview}
              </button>
              <button
                onClick={() => setActiveTab('deposit')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'deposit'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                {currentLang.deposit}
              </button>
              <button
                onClick={() => setActiveTab('withdrawal')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'withdrawal'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faMinus} className="mr-2" />
                {currentLang.withdrawal}
              </button>
              <button
                onClick={() => setActiveTab('investments')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'investments'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={faPiggyBank} className="mr-2" />
                {currentLang.investments}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Financial Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{currentLang.totalRevenue}</p>
                  <p className="text-2xl font-bold text-green-600">${stats.totalRevenue}</p>
                </div>
                <div className="p-3 bg-green-500 rounded-lg">
                  <FontAwesomeIcon icon={faArrowUp} className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.totalExpenses}</p>
                  <p className="text-2xl font-bold text-red-600">${stats.totalExpenses}</p>
                </div>
                <div className="p-3 bg-red-500 rounded-lg">
                  <FontAwesomeIcon icon={faArrowDown} className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.netProfit}</p>
                  <p className="text-2xl font-bold text-blue-600">${stats.netProfit}</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-lg">
                  <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.pendingPayouts}</p>
                  <p className="text-2xl font-bold text-yellow-600">${stats.pendingPayouts}</p>
                </div>
                <div className="p-3 bg-yellow-500 rounded-lg">
                  <FontAwesomeIcon icon={faWallet} className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="thisMonth">{currentLang.thisMonth}</option>
                  <option value="lastMonth">{currentLang.lastMonth}</option>
                  <option value="thisYear">{currentLang.thisYear}</option>
                  <option value="custom">{currentLang.customRange}</option>
                </select>
              </div>

              <button className="flex items-center px-6 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                {currentLang.downloadReport}
              </button>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">{currentLang.revenueChart}</h3>
              <Line data={revenueChartData} options={chartOptions} />
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">{currentLang.expenseBreakdown}</h3>
              <Doughnut data={expenseBreakdownData} options={doughnutOptions} />
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">{currentLang.recentTransactions}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.transactionId}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.description}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.amount}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.type}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.status}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.date}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{transaction.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getTypeColor(transaction.type)}`}>
                          {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {currentLang[transaction.type as keyof typeof currentLang]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                          {currentLang[transaction.status as keyof typeof currentLang]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </div>
          )}

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <div className="space-y-8">
              {/* Available Balance */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentLang.availableBalance}</h3>
                  <p className="text-3xl font-bold text-green-600">${availableBalance.toLocaleString()}</p>
                </div>
              </div>

          {/* Deposit Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">{currentLang.depositFunds}</h3>
            
            <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{currentLang.enterAmount}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-lg"
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-sm text-gray-600">
                      <span>{currentLang.minimumAmount}: $10</span>
                      <span>{currentLang.maximumAmount}: $50,000</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{currentLang.selectPaymentMethod}</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {depositPaymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            selectedPaymentMethod === method.id ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <FontAwesomeIcon icon={faCreditCard} className="w-6 h-6 mb-2" />
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm opacity-75">{method.processing_time || currentLang.instantTransfer}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected method details (Binance/Bank) */}
                  {selectedPaymentMethod && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      {(() => {
                        const m = depositPaymentMethods.find(pm => pm.id === selectedPaymentMethod);
                        const cfg = (m && m.config) ? (typeof m.config === 'string' ? JSON.parse(m.config) : m.config) : null;
                        if (cfg && cfg.kind === 'binance') {
                          return (
                            <div className="space-y-2">
                              <div className="font-semibold">Binance</div>
                              {cfg.qrImageUrl && (
                                <img src={cfg.qrImageUrl} alt="Binance QR" className="w-40 h-40 object-contain border rounded" />
                              )}
                              {cfg.id && <div className="text-sm text-gray-700">ID: {cfg.id}</div>}
                              {cfg.link && (
                                <a href={cfg.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Open Binance Link</a>
                              )}
                            </div>
                          );
                        }
                        if (cfg && cfg.kind === 'bank') {
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div><span className="font-medium">Account Title:</span> {cfg.accountTitle || '-'}</div>
                              <div><span className="font-medium">Account Number:</span> {cfg.accountNumber || '-'}</div>
                              <div><span className="font-medium">Bank Name:</span> {cfg.bankName || '-'}</div>
                            </div>
                          );
                        }
                        return <div className="text-sm text-gray-600">{m?.description || 'Follow the instructions for this method.'}</div>;
                      })()}
                    </div>
                  )}

                  {/* Reference and Screenshot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reference (optional)</label>
                      <input
                        type="text"
                        value={depositReference}
                        onChange={(e) => setDepositReference(e.target.value)}
                        placeholder="Transaction reference or note"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload Screenshot</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setDepositScreenshot(e.target.files?.[0] || null)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                      {currentLang.cancel}
                    </button>
                    <button 
                      disabled={!depositAmount || parseFloat(depositAmount) < 10 || !selectedPaymentMethod || !depositScreenshot}
                      onClick={async () => {
                        try {
                          if (!depositScreenshot) return;
                          const resp = await financeApi.submitManualDeposit({
                            amount: parseFloat(depositAmount),
                            methodId: selectedPaymentMethod,
                            reference: depositReference || undefined,
                            screenshot: depositScreenshot
                          });
                          setDepositConfirmation({ depositId: resp.depositId, amount: parseFloat(depositAmount) });
                          setShowDepositSuccess(true);
                          setDepositAmount('');
                          setDepositReference('');
                          setDepositScreenshot(null);
                          try { const r = await financeApi.listMyDeposits(); setMyDeposits(r.deposits||[]); } catch {}
                        } catch (e) {
                          console.error('Failed to submit deposit', e);
                          alert('Failed to submit deposit');
                        }
                      }}
                      className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentLang.confirm}
                    </button>
                  </div>
                </div>
              </div>

              {/* My Deposit Submissions */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">My Deposit Submissions</h3>
                  <button onClick={async ()=>{ try{ const r=await financeApi.listMyDeposits(); setMyDeposits(r.deposits||[]);}catch(e){console.error(e);} }} className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50">Refresh</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Screenshot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {listLoading.deposits ? (
                        <tr><td colSpan={6} className="p-4 text-center text-gray-500">Loading...</td></tr>
                      ) : myDeposits.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-gray-500">No deposits found.</td></tr>
                      ) : (
                        myDeposits.map((d:any) => (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-700">{new Date(d.created_at).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">${Number(d.amount).toFixed(2)} {d.currency || 'USD'}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{d.method_name || d.method_id}</td>
                            <td className="px-4 py-2 text-sm text-gray-700" title={d.reference || ''}>{d.reference || '—'}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs rounded-full ${d.status==='approved'?'bg-green-100 text-green-700':d.status==='rejected'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-800'}`}>{d.status}</span>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {d.screenshot_url ? (
                                <a className="text-blue-600 hover:underline" href={normalizeUploadUrl(d.screenshot_url)} target="_blank" rel="noreferrer">Open</a>
                              ) : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Withdrawal Tab */}
          {activeTab === 'withdrawal' && (
            <div className="space-y-8">
              {/* Available Balance */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentLang.availableBalance}</h3>
                  <p className="text-3xl font-bold text-green-600">${availableBalance.toLocaleString()}</p>
                </div>
              </div>

              {/* Withdrawal Form */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{currentLang.withdrawFunds}</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{currentLang.enterAmount}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="0.00"
                        max={availableBalance}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-lg"
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-sm text-gray-600">
                      <span>{currentLang.minimumAmount}: $25</span>
                      <span>Max: ${availableBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{currentLang.selectPaymentMethod}</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {withdrawalMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            selectedPaymentMethod === method.id
                              ? 'border-black bg-black text-white'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <FontAwesomeIcon icon={faCreditCard} className="w-6 h-6 mb-2" />
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm opacity-75">{method.processing_time}</div>
                          {method.fees_percentage > 0 && (
                            <div className="text-xs opacity-75 mt-1">
                              {method.fees_percentage}% fee
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Withdrawal Accounts Management */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium">Withdrawal Accounts</div>
                      <button onClick={() => { setShowAddAccount(true); setNewAccount({ methodId: selectedPaymentMethod, details: {} }); }} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Add Account</button>
                    </div>
                    {withdrawalAccounts.length === 0 ? (
                      <div className="text-sm text-gray-500">No accounts added yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {withdrawalAccounts.map((acc) => (
                          <div key={acc.id} className={`flex items-center justify-between border rounded p-2 ${selectedWithdrawalAccountId === acc.id ? 'border-black' : 'border-gray-200'}`}>
                            <div>
                              <div className="text-sm font-medium">{acc.label || acc.method_name}</div>
                              <div className="text-xs text-gray-600">{(() => {
                                try {
                                  const d = typeof acc.details === 'string' ? JSON.parse(acc.details) : (acc.details || {});
                                  if (d.accountNumber) return `Acct: ${d.accountNumber}`;
                                  if (d.id) return `ID: ${d.id}`;
                                } catch {}
                                return '';
                              })()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setSelectedWithdrawalAccountId(acc.id)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Select</button>
                              <button onClick={async () => {
                                try { await financeApi.deleteWithdrawalAccount(acc.id); setWithdrawalAccounts(withdrawalAccounts.filter(a => a.id !== acc.id)); }
                                catch(e){ console.error(e); alert('Failed'); }
                              }} className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Withdrawal Notice</p>
                        <p>Processing times may vary depending on your payment method. Bank transfers take 1-3 business days.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                      {currentLang.cancel}
                    </button>
                    <button 
                      disabled={!withdrawalAmount || parseFloat(withdrawalAmount) < 25 || parseFloat(withdrawalAmount) > availableBalance || !selectedWithdrawalAccountId}
                      onClick={async () => {
                        try {
                          await financeApi.requestPayoutWithAccount(parseFloat(withdrawalAmount), selectedWithdrawalAccountId);
                          try { const r = await financeApi.getTransactions({ type:'payout', limit:50}); setMyWithdrawals(r.transactions||r||[]);} catch {}
                          alert('Payout request submitted');
                          setWithdrawalAmount('');
                        } catch (e) {
                          console.error('Request payout failed', e);
                          alert('Failed to request payout');
                        }
                      }}
                      className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentLang.confirm}
                    </button>
                  </div>
                </div>
              </div>

              {/* My Withdrawal Requests */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">My Withdrawal Requests</h3>
                  <button onClick={async ()=>{ try{ const r=await financeApi.getTransactions({ type:'payout', limit:50}); setMyWithdrawals(r.transactions||r||[]);}catch(e){console.error(e);} }} className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50">Refresh</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {listLoading.withdrawals ? (
                        <tr><td colSpan={4} className="p-4 text-center text-gray-500">Loading...</td></tr>
                      ) : myWithdrawals.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-gray-500">No withdrawal requests found.</td></tr>
                      ) : (
                        myWithdrawals.map((t:any) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-700">{new Date(t.created_at || t.date).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">${Number(t.amount).toFixed(2)} {t.currency || 'USD'}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs rounded-full ${t.status==='completed'?'bg-green-100 text-green-700':t.status==='failed'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-800'}`}>{t.status}</span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700">{t.reference_id || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Add Withdrawal Account Modal */}
          {showAddAccount && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">Add Withdrawal Account</h4>
                  <button onClick={() => setShowAddAccount(false)} className="text-gray-500 hover:text-black">✕</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select value={newAccount.methodId} onChange={(e) => setNewAccount({...newAccount, methodId: e.target.value})} className="w-full border rounded px-3 py-2">
                      <option value="">Select method</option>
                      {withdrawalMethods.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label (optional)</label>
                    <input value={newAccount.label || ''} onChange={(e) => setNewAccount({...newAccount, label: e.target.value})} className="w-full border rounded px-3 py-2" />
                  </div>
                  {(() => {
                    const cfg = (() => {
                      const m = withdrawalMethods.find((x) => x.id === newAccount.methodId);
                      try { return m && m.config ? (typeof m.config === 'string' ? JSON.parse(m.config) : m.config) : null; } catch { return null; }
                    })();
                    if (cfg?.kind === 'binance') {
                      return (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Binance ID</label>
                            <input className="w-full border rounded px-3 py-2" value={newAccount.details.id || ''} onChange={(e)=> setNewAccount({...newAccount, details: {...newAccount.details, id: e.target.value}})} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Binance Link (optional)</label>
                            <input className="w-full border rounded px-3 py-2" value={newAccount.details.link || ''} onChange={(e)=> setNewAccount({...newAccount, details: {...newAccount.details, link: e.target.value}})} />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Title</label>
                          <input className="w-full border rounded px-3 py-2" value={newAccount.details.accountTitle || ''} onChange={(e)=> setNewAccount({...newAccount, details: {...newAccount.details, accountTitle: e.target.value}})} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                          <input className="w-full border rounded px-3 py-2" value={newAccount.details.accountNumber || ''} onChange={(e)=> setNewAccount({...newAccount, details: {...newAccount.details, accountNumber: e.target.value}})} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                          <input className="w-full border rounded px-3 py-2" value={newAccount.details.bankName || ''} onChange={(e)=> setNewAccount({...newAccount, details: {...newAccount.details, bankName: e.target.value}})} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowAddAccount(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={async ()=>{
                    try {
                      if (!newAccount.methodId) { alert('Select method'); return; }
                      await financeApi.addWithdrawalAccount(newAccount);
                      const resp = await financeApi.getWithdrawalAccounts();
                      setWithdrawalAccounts(resp.accounts || []);
                      setShowAddAccount(false);
                    } catch (e) { console.error(e); alert('Failed to add'); }
                  }} className="px-4 py-2 bg-black text-white rounded">Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Investments Tab */}
          {activeTab === 'investments' && (
            <div className="space-y-8">
              {/* Available Balance */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentLang.availableBalance}</h3>
                  <p className="text-3xl font-bold text-green-600">${availableBalance.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 mt-2">Available for investment</p>
                </div>
              </div>

              {/* Investment Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="text-center">
                    <FontAwesomeIcon icon={faPiggyBank} className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{currentLang.totalInvested}</h3>
                    <p className="text-2xl font-bold text-blue-600">$700</p>
                  </div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="text-center">
                    <FontAwesomeIcon icon={faArrowTrendUp} className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{currentLang.totalEarned}</h3>
                    <p className="text-2xl font-bold text-green-600">$64</p>
                  </div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="text-center">
                    <FontAwesomeIcon icon={faLock} className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{currentLang.activeInvestments}</h3>
                    <p className="text-2xl font-bold text-orange-600">1</p>
                  </div>
                </div>
              </div>

              {/* Fixed-Term Investment Plans */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{currentLang.fixedTermManagement}</h3>
                <p className="text-gray-600 mb-6">Choose from our high-yield investment plans with guaranteed returns</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {investmentPlans.map((plan) => (
                    <div key={plan.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-black transition-all cursor-pointer">
                      <div className="text-center mb-4">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h4>
                        <div className="text-3xl font-bold text-green-600 mb-1">+{plan.returnRate}%</div>
                        <div className="text-sm text-gray-600">{plan.duration} days</div>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{currentLang.minInvestment}:</span>
                          <span className="font-medium">${plan.minInvestment}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{currentLang.duration}:</span>
                          <span className="font-medium">{plan.duration} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{currentLang.returnRate}:</span>
                          <span className="font-medium text-green-600">+{plan.returnRate}%</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="number"
                          placeholder={`Min $${plan.minInvestment}`}
                          min={plan.minInvestment}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                        <button className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                          <FontAwesomeIcon icon={faPiggyBank} className="mr-2" />
                          {currentLang.invest}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Investments */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{currentLang.myInvestments}</h3>
                
                <div className="space-y-4">
                  {investments.map((investment) => (
                    <div key={investment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <FontAwesomeIcon icon={faPiggyBank} className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {investment.plan === '15days' ? currentLang.plan15Days :
                                 investment.plan === '30days' ? currentLang.plan30Days :
                                 currentLang.plan60Days}
                              </h4>
                              <div className="text-sm text-gray-600">
                                Started: {investment.startDate} | Maturity: {investment.maturityDate}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">${investment.amount}</div>
                          <div className="text-sm text-green-600">+${investment.totalReturn} ({investment.returnRate}%)</div>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                            investment.status === 'active' ? 'bg-green-100 text-green-800' :
                            investment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {investment.status === 'active' ? 'Active' :
                             investment.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
        {showDepositSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 border border-gray-200">
              <div className="text-center space-y-3">
                <div className="text-2xl font-bold text-gray-900">Thank you!</div>
                <div className="text-gray-700">Your deposit has been submitted.</div>
                {depositConfirmation?.amount !== undefined && (
                  <div className="text-sm text-gray-600">Amount: ${depositConfirmation.amount?.toLocaleString()}</div>
                )}
                {depositConfirmation?.depositId && (
                  <div className="text-xs text-gray-500">Reference ID: {depositConfirmation.depositId}</div>
                )}
                <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3 text-left">
                  Manual verification is required and can take up to 24 hours. We'll notify you once it's approved.
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setShowDepositSuccess(false)}
                    className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      

    </div>
    /* {showDepositSuccess && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 border border-gray-200">
          <div className="text-center space-y-3">
            <div className="text-2xl font-bold text-gray-900">Thank you!</div>
            <div className="text-gray-700">Your deposit has been submitted.</div>
            {depositConfirmation?.amount !== undefined && (
              <div className="text-sm text-gray-600">Amount: ${depositConfirmation.amount?.toLocaleString()}</div>
            )}
            {depositConfirmation?.depositId && (
              <div className="text-xs text-gray-500">Reference ID: {depositConfirmation.depositId}</div>
            )}
            <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3 text-left">
              Manual verification is required and can take up to 24 hours. We’ll notify you once it’s approved.
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowDepositSuccess(false)}
                className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )} */
  );
};

export default Financial;
