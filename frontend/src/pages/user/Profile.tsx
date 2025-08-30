import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { useSellerData } from '../../contexts/SellerDataContext';
import { authApi } from '../../services/api';
import {
  faGlobe,
  faChevronDown,
  faBell,
  faUser,
  faCog,
  faSignOutAlt,
  faUserCircle,
  faCamera,
  faEdit,
  faSave,
  faTimes,
  faArrowLeft,
  faStore,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCalendar,
  faIdCard,
  faKey,
  faShield,
  faEye,
  faEyeSlash,
  faUpload,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faSms,
  faLock,
  faWallet,
  faCheck
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
    subtitle: 'Profile Settings',
    backToDashboard: 'Back to Dashboard',
    personalInfo: 'Personal Information',
    businessInfo: 'Business Information',
    accountSecurity: 'Account Security',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    uploadPhoto: 'Upload Photo',
    changePhoto: 'Change Photo',
    fullName: 'Full Name',
    email: 'Email Address',
    phoneNumber: 'Phone Number',
    dateOfBirth: 'Date of Birth',
    address: 'Address',
    city: 'City',
    state: 'State',
    zipCode: 'ZIP Code',
    country: 'Country',
    storeName: 'Store Name',
    storeDescription: 'Store Description',
    businessType: 'Business Type',
    taxId: 'Tax ID',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    changePassword: 'Change Password',
    changeLoginPassword: 'Change Login Password',
    changeFundsPassword: 'Change Funds Password',
    setPaymentPassword: 'Set Payment Password',
    phoneVerification: 'Phone Verification',
    emailVerification: 'Email Verification',
    verifyPhone: 'Verify Phone',
    verifyEmail: 'Verify Email',
    sendOTP: 'Send OTP',
    enterOTP: 'Enter OTP Code',
    resendOTP: 'Resend OTP',
    verified: 'Verified',
    notVerified: 'Not Verified',
    paymentPassword: 'Payment Password',
    fundsPassword: 'Funds Password',
    twoFactorAuth: 'Two-Factor Authentication',
    enable: 'Enable',
    disable: 'Disable',
    emailNotifications: 'Email Notifications',
    smsNotifications: 'SMS Notifications',
    pushNotifications: 'Push Notifications',
    marketingEmails: 'Marketing Emails',
    orderUpdates: 'Order Updates',
    securityAlerts: 'Security Alerts',
    accountInfo: 'Account Information',
    memberSince: 'Member Since',
    lastLogin: 'Last Login',
    accountStatus: 'Account Status',
    pending: 'Pending Verification',
    suspended: 'Suspended',
    businessTypes: {
      individual: 'Individual',
      business: 'Business',
      corporation: 'Corporation',
      partnership: 'Partnership'
    },
    countries: {
      us: 'United States',
      ca: 'Canada',
      uk: 'United Kingdom',
      au: 'Australia',
      de: 'Germany',
      fr: 'France',
      jp: 'Japan',
      cn: 'China'
    }
  },
  ES: {
    title: 'TIENDA TIKTOK',
    subtitle: 'Configuración del Perfil',
    backToDashboard: 'Volver al Panel',
    personalInfo: 'Información Personal',
    businessInfo: 'Información del Negocio',
    accountSecurity: 'Seguridad de la Cuenta',
    notifications: 'Notificaciones',
    profile: 'Perfil',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    editProfile: 'Editar Perfil',
    saveChanges: 'Guardar Cambios',
    cancel: 'Cancelar',
    uploadPhoto: 'Subir Foto',
    changePhoto: 'Cambiar Foto',
    fullName: 'Nombre Completo',
    email: 'Correo Electrónico',
    phoneNumber: 'Número de Teléfono',
    dateOfBirth: 'Fecha de Nacimiento',
    address: 'Dirección',
    city: 'Ciudad',
    state: 'Estado',
    zipCode: 'Código Postal',
    country: 'País',
    storeName: 'Nombre de la Tienda',
    storeDescription: 'Descripción de la Tienda',
    businessType: 'Tipo de Negocio',
    taxId: 'ID Fiscal',
    currentPassword: 'Contraseña Actual',
    newPassword: 'Nueva Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    changePassword: 'Cambiar Contraseña',
    changeLoginPassword: 'Cambiar Contraseña de Acceso',
    changeFundsPassword: 'Cambiar Contraseña de Fondos',
    setPaymentPassword: 'Establecer Contraseña de Pago',
    phoneVerification: 'Verificación de Teléfono',
    emailVerification: 'Verificación de Email',
    verifyPhone: 'Verificar Teléfono',
    verifyEmail: 'Verificar Email',
    sendOTP: 'Enviar OTP',
    enterOTP: 'Ingresar Código OTP',
    resendOTP: 'Reenviar OTP',
    verified: 'Verificado',
    notVerified: 'No Verificado',
    paymentPassword: 'Contraseña de Pago',
    fundsPassword: 'Contraseña de Fondos',
    twoFactorAuth: 'Autenticación de Dos Factores',
    enable: 'Habilitar',
    disable: 'Deshabilitar',
    emailNotifications: 'Notificaciones por Email',
    smsNotifications: 'Notificaciones SMS',
    pushNotifications: 'Notificaciones Push',
    marketingEmails: 'Emails de Marketing',
    orderUpdates: 'Actualizaciones de Pedidos',
    securityAlerts: 'Alertas de Seguridad',
    accountInfo: 'Información de la Cuenta',
    memberSince: 'Miembro Desde',
    lastLogin: 'Último Acceso',
    accountStatus: 'Estado de la Cuenta',
    pending: 'Verificación Pendiente',
    suspended: 'Suspendido',
    businessTypes: {
      individual: 'Individual',
      business: 'Negocio',
      corporation: 'Corporación',
      partnership: 'Sociedad'
    },
    countries: {
      us: 'Estados Unidos',
      ca: 'Canadá',
      uk: 'Reino Unido',
      au: 'Australia',
      de: 'Alemania',
      fr: 'Francia',
      jp: 'Japón',
      cn: 'China'
    }
  },
  ZH: {
    title: 'TIKTOK商店',
    subtitle: '个人资料设置',
    backToDashboard: '返回仪表板',
    personalInfo: '个人信息',
    businessInfo: '商业信息',
    accountSecurity: '账户安全',
    notifications: '通知',
    profile: '个人资料',
    settings: '设置',
    logout: '退出',
    editProfile: '编辑个人资料',
    saveChanges: '保存更改',
    cancel: '取消',
    uploadPhoto: '上传照片',
    changePhoto: '更换照片',
    fullName: '全名',
    email: '电子邮箱',
    phoneNumber: '电话号码',
    dateOfBirth: '出生日期',
    address: '地址',
    city: '城市',
    state: '省/州',
    zipCode: '邮编',
    country: '国家',
    storeName: '店铺名称',
    storeDescription: '店铺描述',
    businessType: '业务类型',
    taxId: '税务编号',
    currentPassword: '当前密码',
    newPassword: '新密码',
    confirmPassword: '确认密码',
    changePassword: '更改密码',
    changeLoginPassword: '更改登录密码',
    changeFundsPassword: '更改资金密码',
    setPaymentPassword: '设置支付密码',
    phoneVerification: '手机验证',
    emailVerification: '邮箱验证',
    verifyPhone: '验证手机',
    verifyEmail: '验证邮箱',
    sendOTP: '发送验证码',
    enterOTP: '输入验证码',
    resendOTP: '重新发送',
    verified: '已验证',
    notVerified: '未验证',
    paymentPassword: '支付密码',
    fundsPassword: '资金密码',
    twoFactorAuth: '双重验证',
    enable: '启用',
    disable: '禁用',
    emailNotifications: '邮件通知',
    smsNotifications: '短信通知',
    pushNotifications: '推送通知',
    marketingEmails: '营销邮件',
    orderUpdates: '订单更新',
    securityAlerts: '安全警报',
    accountInfo: '账户信息',
    memberSince: '注册时间',
    lastLogin: '最后登录',
    accountStatus: '账户状态',
    pending: '待验证',
    suspended: '已暂停',
    businessTypes: {
      individual: '个人',
      business: '企业',
      corporation: '公司',
      partnership: '合伙'
    },
    countries: {
      us: '美国',
      ca: '加拿大',
      uk: '英国',
      au: '澳大利亚',
      de: '德国',
      fr: '法国',
      jp: '日本',
      cn: '中国'
    }
  }
};

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  storeName: string;
  storeDescription: string;
  businessType: string;
  taxId: string;
  profilePhoto: string;
  memberSince: string;
  lastLogin: string;
  accountStatus: 'verified' | 'pending' | 'suspended';
  phoneVerified: boolean;
  emailVerified: boolean;
  hasPaymentPassword: boolean;
  hasFundsPassword: boolean;
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const { shopname } = useParams<{ shopname: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get user from auth context for fallback
  const { user, logout } = useAuth();
  
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
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showPaymentPasswordSetup, setShowPaymentPasswordSetup] = useState(false);
  const [showFundsPasswordChange, setShowFundsPasswordChange] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Form state - Initialize with user data from AuthContext
  const [profile, setProfile] = useState<UserProfile>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    dateOfBirth: user?.dateOfBirth || '',
    address: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'us',
    storeName: user?.businessInfo?.storeName || '',
    storeDescription: user?.businessInfo?.storeDescription || '',
    businessType: user?.businessInfo?.businessType || 'individual',
    taxId: user?.businessInfo?.taxId || '',
    profilePhoto: user?.profilePhoto || '',
    memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
    lastLogin: user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '',
    accountStatus: user?.isActive ? 'verified' : 'pending',
    phoneVerified: false, // Add this field to User interface if needed
    emailVerified: user?.isEmailVerified || false,
    hasPaymentPassword: user?.hasPaymentPassword || false,
    hasFundsPassword: user?.hasFundsPassword || false,
    twoFactorEnabled: user?.twoFactorEnabled || false,
    emailNotifications: user?.emailNotifications || true,
    smsNotifications: user?.smsNotifications || false,
    pushNotifications: user?.pushNotifications || true,
    marketingEmails: user?.marketingEmails || false
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [paymentPasswordData, setPaymentPasswordData] = useState({
    newPaymentPassword: '',
    confirmPaymentPassword: ''
  });

  const [fundsPasswordData, setFundsPasswordData] = useState({
    currentFundsPassword: '',
    newFundsPassword: '',
    confirmFundsPassword: ''
  });

  const [verificationData, setVerificationData] = useState({
    phoneOtp: '',
    emailOtp: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setProfile(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleFundsPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFundsPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleVerificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVerificationData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfile(prev => ({ ...prev, profilePhoto: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      // Create FormData for profile update
      const formData = new FormData();
      formData.append('fullName', profile.fullName);
      formData.append('phoneNumber', profile.phoneNumber);
      formData.append('dateOfBirth', profile.dateOfBirth);
      formData.append('address', JSON.stringify({
        street: profile.address,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        country: profile.country
      }));
      formData.append('businessInfo', JSON.stringify({
        storeName: profile.storeName,
        storeDescription: profile.storeDescription,
        businessType: profile.businessType,
        taxId: profile.taxId
      }));
      
      // Call the API to update profile
      const response = await authApi.updateProfile(formData);
      console.log('Profile updated successfully:', response);
      setIsEditing(false);
      // Show success message
    } catch (error) {
      console.error('Failed to update profile:', error);
      // Show error message
    }
  };

  const handlePasswordUpdate = () => {
    // Simulate API call
    console.log('Updating password:', passwordData);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    // Show success message
  };

  const handlePaymentPasswordSetup = () => {
    // Simulate API call
    console.log('Setting payment password:', paymentPasswordData);
    setProfile(prev => ({ ...prev, hasPaymentPassword: true }));
    setPaymentPasswordData({ newPaymentPassword: '', confirmPaymentPassword: '' });
    setShowPaymentPasswordSetup(false);
    // Show success message
  };

  const handleFundsPasswordUpdate = () => {
    // Simulate API call
    console.log('Updating funds password:', fundsPasswordData);
    setProfile(prev => ({ ...prev, hasFundsPassword: true }));
    setFundsPasswordData({ currentFundsPassword: '', newFundsPassword: '', confirmFundsPassword: '' });
    setShowFundsPasswordChange(false);
    // Show success message
  };

  const sendPhoneOTP = () => {
    // Simulate API call
    console.log('Sending phone OTP to:', profile.phoneNumber);
    setOtpSent(true);
    setOtpTimer(60);
    setShowPhoneVerification(true);
    // Start countdown
    const interval = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendEmailOTP = () => {
    // Simulate API call
    console.log('Sending email OTP to:', profile.email);
    setOtpSent(true);
    setOtpTimer(60);
    setShowEmailVerification(true);
    // Start countdown
    const interval = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const verifyPhone = () => {
    // Simulate API call
    console.log('Verifying phone with OTP:', verificationData.phoneOtp);
    setProfile(prev => ({ ...prev, phoneVerified: true }));
    setShowPhoneVerification(false);
    setVerificationData(prev => ({ ...prev, phoneOtp: '' }));
    // Show success message
  };

  const verifyEmail = () => {
    // Simulate API call
    console.log('Verifying email with OTP:', verificationData.emailOtp);
    setProfile(prev => ({ ...prev, emailVerified: true }));
    setShowEmailVerification(false);
    setVerificationData(prev => ({ ...prev, emailOtp: '' }));
    // Show success message
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Update profile when user data changes
  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth || '',
        address: user.address?.street || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        zipCode: user.address?.zipCode || '',
        country: user.address?.country || 'us',
        storeName: user.businessInfo?.storeName || '',
        storeDescription: user.businessInfo?.storeDescription || '',
        businessType: user.businessInfo?.businessType || 'individual',
        taxId: user.businessInfo?.taxId || '',
        profilePhoto: user.profilePhoto || '',
        memberSince: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '',
        accountStatus: user.isActive ? 'verified' : 'pending',
        phoneVerified: false, // Add this field to User interface if needed
        emailVerified: user.isEmailVerified || false,
        hasPaymentPassword: user.hasPaymentPassword || false,
        hasFundsPassword: user.hasFundsPassword || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        emailNotifications: user.emailNotifications || true,
        smsNotifications: user.smsNotifications || false,
        pushNotifications: user.pushNotifications || true,
        marketingEmails: user.marketingEmails || false
      });
    }
    setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Profile...</p>
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Profile Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
                {/* Profile Photo */}
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      {profile.profilePhoto ? (
                        <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <FontAwesomeIcon icon={faUserCircle} className="text-gray-400 text-6xl" />
                      )}
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                      >
                        <FontAwesomeIcon icon={faCamera} className="w-3 h-3" />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{profile.fullName}</h3>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getStatusColor(profile.accountStatus)}`}>
                    {currentLang[profile.accountStatus as keyof typeof currentLang]}
                  </span>
                </div>

                {/* Account Info */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{currentLang.memberSince}</p>
                    <p className="text-sm text-gray-600">{profile.memberSince}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{currentLang.lastLogin}</p>
                    <p className="text-sm text-gray-600">{profile.lastLogin}</p>
                  </div>
                </div>

                {/* Edit Button */}
                <div className="mt-6">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <FontAwesomeIcon icon={faEdit} className="mr-2" />
                      {currentLang.editProfile}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={handleSave}
                        className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                        {currentLang.saveChanges}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <FontAwesomeIcon icon={faTimes} className="mr-2" />
                        {currentLang.cancel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    <button
                      onClick={() => setActiveTab('personal')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'personal'
                          ? 'border-black text-black'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FontAwesomeIcon icon={faUser} className="mr-2" />
                      {currentLang.personalInfo}
                    </button>
                    <button
                      onClick={() => setActiveTab('business')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'business'
                          ? 'border-black text-black'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FontAwesomeIcon icon={faStore} className="mr-2" />
                      {currentLang.businessInfo}
                    </button>
                    <button
                      onClick={() => setActiveTab('security')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'security'
                          ? 'border-black text-black'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FontAwesomeIcon icon={faShield} className="mr-2" />
                      {currentLang.accountSecurity}
                    </button>
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'notifications'
                          ? 'border-black text-black'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FontAwesomeIcon icon={faBell} className="mr-2" />
                      {currentLang.notifications}
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  {/* Personal Information Tab */}
                  {activeTab === 'personal' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FontAwesomeIcon icon={faUser} className="mr-2" />
                            {currentLang.fullName}
                          </label>
                          <input
                            type="text"
                            name="fullName"
                            value={profile.fullName}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            required
                            minLength={2}
                            maxLength={100}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                            placeholder="Enter your full name"
                          />
                          {isEditing && (
                            <p className="text-xs text-gray-500 mt-1">
                              Must be between 2-100 characters
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                            {currentLang.email}
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              name="email"
                              value={profile.email}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {profile.emailVerified ? (
                                <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                              ) : (
                                <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs ${profile.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                              {profile.emailVerified ? currentLang.verified : currentLang.notVerified}
                            </span>
                            {!profile.emailVerified && (
                              <button
                                onClick={sendEmailOTP}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {currentLang.verifyEmail}
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FontAwesomeIcon icon={faPhone} className="mr-2" />
                            {currentLang.phoneNumber}
                          </label>
                          <div className="relative">
                            <input
                              type="tel"
                              name="phoneNumber"
                              value={profile.phoneNumber}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {profile.phoneVerified ? (
                                <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                              ) : (
                                <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs ${profile.phoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                              {profile.phoneVerified ? currentLang.verified : currentLang.notVerified}
                            </span>
                            {!profile.phoneVerified && (
                              <button
                                onClick={sendPhoneOTP}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {currentLang.verifyPhone}
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                            {currentLang.dateOfBirth}
                          </label>
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={profile.dateOfBirth}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                            {currentLang.address}
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={profile.address}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {currentLang.city}
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={profile.city}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {currentLang.state}
                          </label>
                          <input
                            type="text"
                            name="state"
                            value={profile.state}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {currentLang.zipCode}
                          </label>
                          <input
                            type="text"
                            name="zipCode"
                            value={profile.zipCode}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {currentLang.country}
                          </label>
                          <select
                            name="country"
                            value={profile.country}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          >
                            {Object.entries(currentLang.countries).map(([key, value]) => (
                              <option key={key} value={key}>{value}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business Information Tab */}
                  {activeTab === 'business' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FontAwesomeIcon icon={faStore} className="mr-2" />
                            {currentLang.storeName}
                          </label>
                          <input
                            type="text"
                            name="storeName"
                            value={profile.storeName}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {currentLang.businessType}
                          </label>
                          <select
                            name="businessType"
                            value={profile.businessType}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          >
                            {Object.entries(currentLang.businessTypes).map(([key, value]) => (
                              <option key={key} value={key}>{value}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FontAwesomeIcon icon={faIdCard} className="mr-2" />
                            {currentLang.taxId}
                          </label>
                          <input
                            type="text"
                            name="taxId"
                            value={profile.taxId}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {currentLang.storeDescription}
                          </label>
                          <textarea
                            name="storeDescription"
                            value={profile.storeDescription}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Tab */}
                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      {/* Change Login Password */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          <FontAwesomeIcon icon={faKey} className="mr-2" />
                          {currentLang.changeLoginPassword}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {currentLang.currentPassword}
                            </label>
                            <div className="relative">
                              <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                              >
                                <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {currentLang.newPassword}
                            </label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                placeholder="Enter new password"
                                minLength={8}
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                              >
                                <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {currentLang.confirmPassword}
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                placeholder="Confirm new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                              >
                                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handlePasswordUpdate}
                          className="mt-4 px-6 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                          disabled={!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                        >
                          {currentLang.changeLoginPassword}
                        </button>
                      </div>

                      {/* Payment Password */}
                      <div className="bg-blue-50 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            <FontAwesomeIcon icon={faWallet} className="mr-2" />
                            {currentLang.paymentPassword}
                          </h3>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            profile.hasPaymentPassword 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {profile.hasPaymentPassword ? 'Set' : 'Not Set'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Set a payment password for secure transactions and purchases.
                        </p>
                        <button
                          onClick={() => setShowPaymentPasswordSetup(!showPaymentPasswordSetup)}
                          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {profile.hasPaymentPassword ? 'Change Payment Password' : currentLang.setPaymentPassword}
                        </button>
                      </div>

                      {/* Funds Password */}
                      <div className="bg-purple-50 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            <FontAwesomeIcon icon={faLock} className="mr-2" />
                            {currentLang.fundsPassword}
                          </h3>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            profile.hasFundsPassword 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {profile.hasFundsPassword ? 'Set' : 'Not Set'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Set a funds password to secure your wallet and fund transfers.
                        </p>
                        <button
                          onClick={() => setShowFundsPasswordChange(!showFundsPasswordChange)}
                          className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          {profile.hasFundsPassword ? currentLang.changeFundsPassword : 'Set Funds Password'}
                        </button>
                      </div>

                      {/* Two-Factor Authentication */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{currentLang.twoFactorAuth}</h4>
                          <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                        <button
                          onClick={() => setProfile(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            profile.twoFactorEnabled
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {profile.twoFactorEnabled ? currentLang.disable : currentLang.enable}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notifications Tab */}
                  {activeTab === 'notifications' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{currentLang.emailNotifications}</h4>
                            <p className="text-sm text-gray-500">Receive notifications via email</p>
                          </div>
                          <input
                            type="checkbox"
                            name="emailNotifications"
                            checked={profile.emailNotifications}
                            onChange={handleInputChange}
                            className="w-5 h-5 text-black bg-gray-50 border-gray-300 rounded focus:ring-black focus:ring-2"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{currentLang.smsNotifications}</h4>
                            <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                          </div>
                          <input
                            type="checkbox"
                            name="smsNotifications"
                            checked={profile.smsNotifications}
                            onChange={handleInputChange}
                            className="w-5 h-5 text-black bg-gray-50 border-gray-300 rounded focus:ring-black focus:ring-2"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{currentLang.pushNotifications}</h4>
                            <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                          </div>
                          <input
                            type="checkbox"
                            name="pushNotifications"
                            checked={profile.pushNotifications}
                            onChange={handleInputChange}
                            className="w-5 h-5 text-black bg-gray-50 border-gray-300 rounded focus:ring-black focus:ring-2"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{currentLang.marketingEmails}</h4>
                            <p className="text-sm text-gray-500">Receive marketing and promotional emails</p>
                          </div>
                          <input
                            type="checkbox"
                            name="marketingEmails"
                            checked={profile.marketingEmails}
                            onChange={handleInputChange}
                            className="w-5 h-5 text-black bg-gray-50 border-gray-300 rounded focus:ring-black focus:ring-2"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Phone Verification Modal */}
        {showPhoneVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  <FontAwesomeIcon icon={faSms} className="mr-2" />
                  {currentLang.phoneVerification}
                </h3>
                <button
                  onClick={() => setShowPhoneVerification(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                We've sent a verification code to {profile.phoneNumber}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.enterOTP}
                  </label>
                  <input
                    type="text"
                    name="phoneOtp"
                    value={verificationData.phoneOtp}
                    onChange={handleVerificationChange}
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-center text-lg tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={sendPhoneOTP}
                    disabled={otpTimer > 0}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    {otpTimer > 0 ? `${currentLang.resendOTP} (${otpTimer}s)` : currentLang.resendOTP}
                  </button>
                  <button
                    onClick={verifyPhone}
                    disabled={verificationData.phoneOtp.length !== 6}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
                  >
                    {currentLang.verifyPhone}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Verification Modal */}
        {showEmailVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  {currentLang.emailVerification}
                </h3>
                <button
                  onClick={() => setShowEmailVerification(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                We've sent a verification code to {profile.email}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.enterOTP}
                  </label>
                  <input
                    type="text"
                    name="emailOtp"
                    value={verificationData.emailOtp}
                    onChange={handleVerificationChange}
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-center text-lg tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={sendEmailOTP}
                    disabled={otpTimer > 0}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    {otpTimer > 0 ? `${currentLang.resendOTP} (${otpTimer}s)` : currentLang.resendOTP}
                  </button>
                  <button
                    onClick={verifyEmail}
                    disabled={verificationData.emailOtp.length !== 6}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
                  >
                    {currentLang.verifyEmail}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Password Setup Modal */}
        {showPaymentPasswordSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  <FontAwesomeIcon icon={faWallet} className="mr-2" />
                  {profile.hasPaymentPassword ? 'Change Payment Password' : currentLang.setPaymentPassword}
                </h3>
                <button
                  onClick={() => setShowPaymentPasswordSetup(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Payment Password
                  </label>
                  <input
                    type="password"
                    name="newPaymentPassword"
                    value={paymentPasswordData.newPaymentPassword}
                    onChange={handlePaymentPasswordChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Enter 6-digit payment password"
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Payment Password
                  </label>
                  <input
                    type="password"
                    name="confirmPaymentPassword"
                    value={paymentPasswordData.confirmPaymentPassword}
                    onChange={handlePaymentPasswordChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Confirm payment password"
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Payment password must be 6 digits and will be used for secure transactions.
                </p>
                <button
                  onClick={handlePaymentPasswordSetup}
                  disabled={
                    paymentPasswordData.newPaymentPassword.length !== 6 ||
                    paymentPasswordData.newPaymentPassword !== paymentPasswordData.confirmPaymentPassword
                  }
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                >
                  {profile.hasPaymentPassword ? 'Update Payment Password' : 'Set Payment Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Funds Password Change Modal */}
        {showFundsPasswordChange && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  <FontAwesomeIcon icon={faLock} className="mr-2" />
                  {profile.hasFundsPassword ? currentLang.changeFundsPassword : 'Set Funds Password'}
                </h3>
                <button
                  onClick={() => setShowFundsPasswordChange(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="space-y-4">
                {profile.hasFundsPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Funds Password
                    </label>
                    <input
                      type="password"
                      name="currentFundsPassword"
                      value={fundsPasswordData.currentFundsPassword}
                      onChange={handleFundsPasswordChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Enter current funds password"
                      maxLength={6}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Funds Password
                  </label>
                  <input
                    type="password"
                    name="newFundsPassword"
                    value={fundsPasswordData.newFundsPassword}
                    onChange={handleFundsPasswordChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Enter 6-digit funds password"
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Funds Password
                  </label>
                  <input
                    type="password"
                    name="confirmFundsPassword"
                    value={fundsPasswordData.confirmFundsPassword}
                    onChange={handleFundsPasswordChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Confirm funds password"
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Funds password must be 6 digits and will be used for wallet operations.
                </p>
                <button
                  onClick={handleFundsPasswordUpdate}
                  disabled={
                    fundsPasswordData.newFundsPassword.length !== 6 ||
                    fundsPasswordData.newFundsPassword !== fundsPasswordData.confirmFundsPassword ||
                    (profile.hasFundsPassword && !fundsPasswordData.currentFundsPassword)
                  }
                  className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300"
                >
                  {profile.hasFundsPassword ? 'Update Funds Password' : 'Set Funds Password'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
