import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faLock,
  faStore,
  faMapMarkerAlt,
  faGlobe,
  faPhone,
  faIdCard,
  faImage,
  faUpload,
  faEye,
  faEyeSlash,
  faCrop,
  faCheck,
  faTimes,
  faTicketAlt,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { registrationApi } from '../services/api';
import tiktokLogo from '../assets/tiktok-logo.png';
import tiktokBackground from '../assets/tiktok-background.jpg';

// Country data with phone codes
const countries = [
  { code: 'US', name: 'United States', phone: '+1' },
  { code: 'CA', name: 'Canada', phone: '+1' },
  { code: 'GB', name: 'United Kingdom', phone: '+44' },
  { code: 'AU', name: 'Australia', phone: '+61' },
  { code: 'DE', name: 'Germany', phone: '+49' },
  { code: 'FR', name: 'France', phone: '+33' },
  { code: 'IN', name: 'India', phone: '+91' },
  { code: 'CN', name: 'China', phone: '+86' },
  { code: 'JP', name: 'Japan', phone: '+81' },
  { code: 'KR', name: 'South Korea', phone: '+82' },
  { code: 'SG', name: 'Singapore', phone: '+65' },
  { code: 'MY', name: 'Malaysia', phone: '+60' },
  { code: 'TH', name: 'Thailand', phone: '+66' },
  { code: 'ID', name: 'Indonesia', phone: '+62' },
  { code: 'PH', name: 'Philippines', phone: '+63' },
  { code: 'VN', name: 'Vietnam', phone: '+84' },
];

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
    subtitle: 'seller Registration',
    description: 'Join thousands of successful creators on TikTok Shop. Build your brand, showcase products, and connect with millions of customers worldwide.',
    storeInfo: 'Store Information',
    personalInfo: 'Personal Information',
    storeName: 'Store Name',
    storeAddress: 'Store Address',
    country: 'Country',
    phoneNumber: 'Phone Number',
    fullName: 'Full Name (According to NIC)',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    invitationCode: 'Invitation Code',
    uploadLogo: 'Upload Logo',
    uploadNIC: 'Upload NIC',
    createStore: 'Create My TikTok Shop Store',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign In',
    terms: 'I agree to TikTok Shop\'s Terms of Service and Privacy Policy. I understand that my registration will be reviewed by the admin team and I will be notified via email once approved.'
  },
  ES: {
    title: 'TIENDA TIKTOK',
    subtitle: 'Registro de Vendedor',
    description: 'Únete a miles de creadores exitosos en TikTok Shop. Construye tu marca, muestra productos y conecta con millones de clientes en todo el mundo.',
    storeInfo: 'Información de la Tienda',
    personalInfo: 'Información Personal',
    storeName: 'Nombre de la Tienda',
    storeAddress: 'Dirección de la Tienda',
    country: 'País',
    phoneNumber: 'Número de Teléfono',
    fullName: 'Nombre Completo (Según NIC)',
    email: 'Dirección de Email',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    invitationCode: 'Código de Invitación',
    uploadLogo: 'Subir Logo',
    uploadNIC: 'Subir NIC',
    createStore: 'Crear Mi Tienda TikTok Shop',
    alreadyHaveAccount: '¿Ya tienes una cuenta?',
    signIn: 'Iniciar Sesión',
    terms: 'Acepto los Términos de Servicio y Política de Privacidad de TikTok Shop. Entiendo que mi registro será revisado por el equipo de administración y seré notificado por email una vez aprobado.'
  },
  ZH: {
    title: 'TIKTOK商店',
    subtitle: '商家注册',
    description: '加入TikTok Shop的成功创作者行列。建立您的品牌，展示产品，与全球数百万客户建立联系。',
    storeInfo: '店铺信息',
    personalInfo: '个人信息',
    storeName: '店铺名称',
    storeAddress: '店铺地址',
    country: '国家',
    phoneNumber: '电话号码',
    fullName: '全名（根据身份证）',
    email: '邮箱地址',
    password: '密码',
    confirmPassword: '确认密码',
    invitationCode: '邀请码',
    uploadLogo: '上传Logo',
    uploadNIC: '上传身份证',
    createStore: '创建我的TikTok商店',
    alreadyHaveAccount: '已有账户？',
    signIn: '登录',
    terms: '我同意TikTok Shop的服务条款和隐私政策。我理解我的注册将由管理团队审核，一旦批准将通过邮件通知我。'
  }
};

interface FormData {
  storeName: string;
  storeAddress: string;
  country: string;
  phoneNumber: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  invitationCode: string;
}

interface FormErrors {
  [key: string]: string;
}

const sellerRegistration = () => {
  const navigate = useNavigate();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const nicInputRef = useRef<HTMLInputElement>(null);

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations] || translations.EN;

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    storeName: '',
    storeAddress: '',
    country: 'US',
    phoneNumber: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    invitationCode: ''
  });

  // UI state
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showLogoCropModal, setShowLogoCropModal] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState<string>('');

  // NIC upload state
  const [nicFile, setNicFile] = useState<File | null>(null);
  const [nicPreview, setNicPreview] = useState<string>('');
  const [showNicCropModal, setShowNicCropModal] = useState(false);
  const [tempNicUrl, setTempNicUrl] = useState<string>('');

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle country selection
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      setFormData(prev => ({ ...prev, country: countryCode }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.storeName.trim()) errors.storeName = 'Store name is required';
    if (!formData.storeAddress.trim()) errors.storeAddress = 'Store address is required';
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    if (!formData.invitationCode.trim()) errors.invitationCode = 'Invitation code is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // File validation
    if (!logoFile) errors.logoFile = 'Store logo is required';
    if (!nicFile) errors.nicFile = 'NIC document is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setTempLogoUrl(url);
        setShowLogoCropModal(true);
      } else {
        setFormErrors(prev => ({ ...prev, logoFile: 'Please select an image file' }));
      }
    }
  };

  // Handle logo crop complete
  const handleLogoCropComplete = (croppedFile: File) => {
    setLogoFile(croppedFile);
    const previewUrl = URL.createObjectURL(croppedFile);
    setLogoPreview(previewUrl);
    setShowLogoCropModal(false);
    
    if (tempLogoUrl) {
      URL.revokeObjectURL(tempLogoUrl);
      setTempLogoUrl('');
    }
    
    if (formErrors.logoFile) {
      setFormErrors(prev => ({ ...prev, logoFile: '' }));
    }
  };

  // Handle NIC upload
  const handleNicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setTempNicUrl(url);
        setShowNicCropModal(true);
      } else if (file.type === 'application/pdf') {
        // Handle PDF directly
        setNicFile(file);
        setNicPreview('PDF Document');
        if (formErrors.nicFile) {
          setFormErrors(prev => ({ ...prev, nicFile: '' }));
        }
      } else {
        setFormErrors(prev => ({ ...prev, nicFile: 'Please select an image or PDF file' }));
      }
    }
  };

  // Handle NIC crop complete
  const handleNicCropComplete = (croppedFile: File) => {
    setNicFile(croppedFile);
    const previewUrl = URL.createObjectURL(croppedFile);
    setNicPreview(previewUrl);
    setShowNicCropModal(false);
    
    if (tempNicUrl) {
      URL.revokeObjectURL(tempNicUrl);
      setTempNicUrl('');
    }
    
    if (formErrors.nicFile) {
      setFormErrors(prev => ({ ...prev, nicFile: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('storeName', formData.storeName);
      submitData.append('storeAddress', formData.storeAddress);
      submitData.append('country', formData.country);
      submitData.append('phoneNumber', `${selectedCountry.phone}${formData.phoneNumber}`);
      submitData.append('fullName', formData.fullName);
      submitData.append('email', formData.email);
      submitData.append('password', formData.password);
      submitData.append('invitationCode', formData.invitationCode);
      
      if (logoFile) submitData.append('logo', logoFile);
      if (nicFile) submitData.append('nicDocument', nicFile);

      // Make API call
      const response = await registrationApi.registerSeller(submitData);
      
      if (response.success) {
        // Store seller ID for success page
        localStorage.setItem('registrationSellerId', response.data.sellerId);
        localStorage.setItem('registrationEmail', response.data.email);
        
        // Redirect to success page
        navigate('/registration-success');
      } else {
        setFormErrors({ submit: response.message || 'Registration failed. Please try again.' });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setFormErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      
      {/* Optional overlay for better text readability */}
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

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with TikTok branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            {/* Official TikTok Logo from assets */}
            <img
              src={tiktokLogo}
              alt="TikTok Logo"
              className="w-16 h-16 mr-4"
            />
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                {currentLang.title}
              </h1>
              <p className="text-gray-700 text-lg">{currentLang.subtitle}</p>
            </div>
          </div>
          <p className="text-gray-700 max-w-2xl mx-auto">
            {currentLang.description}
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-8 lg:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Submit Error */}
              {formErrors.submit && (
                <div className="bg-[#FE2C55]/10 border border-pink-400/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faTimes} className="text-black mr-3" />
                    <span className="text-pink-500 font-medium">{formErrors.submit}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Store Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3">
                    <FontAwesomeIcon icon={faStore} className="text-black mr-2" />
                    {currentLang.storeInfo}
                  </h3>

                  {/* Store Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {currentLang.storeName} *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faStore} 
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                      />
                      <input
                        type="text"
                        name="storeName"
                        value={formData.storeName}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all"
                        placeholder="Enter your store name"
                      />
                    </div>
                    {formErrors.storeName && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.storeName}</p>
                    )}
                  </div>

                  {/* Store Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Store Logo *
                    </label>
                    <div className="flex items-start space-x-4">
                      {/* Logo Preview */}
                      <div className="w-24 h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <FontAwesomeIcon icon={faImage} className="text-black text-2xl" />
                        )}
                      </div>
                      {/* Upload Button */}
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="w-full px-4 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-all transform hover:scale-[1.02] shadow-lg"
                        >
                          <FontAwesomeIcon icon={faUpload} className="mr-2" />
                          {currentLang.uploadLogo}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          Recommended: 500x500px, JPG/PNG, Max 5MB
                        </p>
                      </div>
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {formErrors.logoFile && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.logoFile}</p>
                    )}
                  </div>

                  {/* Store Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Store Address *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faMapMarkerAlt} 
                        className="absolute left-4 top-4 text-gray-400" 
                      />
                      <textarea
                        name="storeAddress"
                        value={formData.storeAddress}
                        onChange={(e) => handleInputChange(e as any)}
                        rows={3}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all resize-none"
                        placeholder="Enter your complete store address"
                      />
                    </div>
                    {formErrors.storeAddress && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.storeAddress}</p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faGlobe} 
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                      />
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleCountryChange}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all appearance-none"
                      >
                        {countries.map((country) => (
                          <option key={country.code} value={country.code} className="bg-white">
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="flex space-x-3">
                      <div className="w-24 px-3 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-800 text-center">
                        {selectedCountry.phone}
                      </div>
                      <div className="flex-1 relative">
                        <FontAwesomeIcon 
                          icon={faPhone} 
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                        />
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    {formErrors.phoneNumber && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.phoneNumber}</p>
                    )}
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3">
                    <FontAwesomeIcon icon={faUser} className="text-black mr-2" />
                    {currentLang.personalInfo}
                  </h3>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name (According to NIC) *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faUser} 
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                      />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all"
                        placeholder="Enter your full name"
                      />
                    </div>
                    {formErrors.fullName && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.fullName}</p>
                    )}
                  </div>

                  {/* NIC Document Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NIC Document *
                    </label>
                    <div className="flex items-start space-x-4">
                      {/* NIC Preview */}
                      <div className="w-24 h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                        {nicPreview ? (
                          nicPreview === 'PDF Document' ? (
                            <div className="text-center">
                              <FontAwesomeIcon icon={faIdCard} className="text-black text-2xl mb-1" />
                              <p className="text-xs text-gray-500">PDF</p>
                            </div>
                          ) : (
                            <img src={nicPreview} alt="NIC preview" className="w-full h-full object-cover rounded-lg" />
                          )
                        ) : (
                          <FontAwesomeIcon icon={faIdCard} className="text-black text-2xl" />
                        )}
                      </div>
                      {/* Upload Button */}
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => nicInputRef.current?.click()}
                          className="w-full px-4 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-all transform hover:scale-[1.02] shadow-lg"
                        >
                          <FontAwesomeIcon icon={faUpload} className="mr-2" />
                          {currentLang.uploadNIC}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          Accepted: JPG, PNG, PDF, Max 10MB
                        </p>
                      </div>
                    </div>
                    <input
                      ref={nicInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleNicUpload}
                      className="hidden"
                    />
                    {formErrors.nicFile && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.nicFile}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faEnvelope} 
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                      />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all"
                        placeholder="Enter your email address"
                      />
                    </div>
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faLock} 
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all"
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faLock} 
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                      />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Invitation Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invitation Code *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faTicketAlt} 
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                      />
                      <input
                        type="text"
                        name="invitationCode"
                        value={formData.invitationCode}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 focus:bg-white transition-all"
                        placeholder="Enter your invitation code"
                      />
                    </div>
                    {formErrors.invitationCode && (
                      <p className="mt-1 text-sm text-pink-500">{formErrors.invitationCode}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Don't have a code? Contact our support team.
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms and Submit */}
              <div className="border-t border-gray-200 pt-8">
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="terms"
                      className="mt-1 w-5 h-5 text-pink-500 bg-gray-50 border-gray-300 rounded focus:ring-[#FE2C55] focus:ring-2"
                      required
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                      I agree to TikTok Shop's{' '}
                      <Link to="/terms" className="text-cyan-500 hover:text-pink-500 underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-cyan-500 hover:text-pink-500 underline">
                        Privacy Policy
                      </Link>
                      . I understand that my registration will be reviewed by the admin team and I will be notified via email once approved.
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-black text-white font-bold text-lg rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] disabled:transform-none shadow-lg"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      Creating Your TikTok Shop...
                    </div>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="mr-2" />
                      {currentLang.createStore}
                    </>
                  )}
                </button>

                <div className="text-center mt-6">
                  <p className="text-gray-600">
                    {currentLang.alreadyHaveAccount}{' '}
                    <Link to="/login" className="text-cyan-500 hover:text-pink-500 font-medium">
                      {currentLang.signIn}
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>&copy; 2024 TikTok Shop. All rights reserved.</p>
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <Link to="/help" className="hover:text-cyan-500 transition-colors">Help Center</Link>
            <Link to="/contact" className="hover:text-cyan-500 transition-colors">Contact Support</Link>
            <Link to="/seller-guide" className="hover:text-cyan-500 transition-colors">Seller Guide</Link>
          </div>
        </div>
      </div>

      {/* Logo Crop Modal */}
      {showLogoCropModal && (
        <ImageCropModal
          imageUrl={tempLogoUrl}
          onCropComplete={handleLogoCropComplete}
          onCancel={() => {
            setShowLogoCropModal(false);
            if (tempLogoUrl) {
              URL.revokeObjectURL(tempLogoUrl);
              setTempLogoUrl('');
            }
          }}
          aspectRatio={1}
          title="Crop Store Logo"
        />
      )}

      {/* NIC Crop Modal */}
      {showNicCropModal && (
        <ImageCropModal
          imageUrl={tempNicUrl}
          onCropComplete={handleNicCropComplete}
          onCancel={() => {
            setShowNicCropModal(false);
            if (tempNicUrl) {
              URL.revokeObjectURL(tempNicUrl);
              setTempNicUrl('');
            }
          }}
          aspectRatio={16/10}
          title="Crop NIC Document"
        />
      )}
    </div>
  );
};

// Image Crop Modal Component with light theme
interface ImageCropModalProps {
  imageUrl: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio: number;
  title: string;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
  aspectRatio,
  title
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCrop = async () => {
    if (!canvasRef.current) return;
    
    setIsProcessing(true);
    
    // Simulate cropping process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a simple cropped version (in real implementation, you'd use a proper cropping library)
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400 / aspectRatio;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          onCropComplete(file);
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.9);
    };
    
    img.src = imageUrl;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <p className="text-gray-600 mt-1">Adjust the crop area and click save</p>
        </div>
        
        <div className="p-6">
          <div className="relative bg-gray-100 rounded-xl overflow-hidden mb-6">
            <img 
              src={imageUrl} 
              alt="Crop preview" 
              className="w-full h-80 object-contain"
            />
            <div className="absolute inset-4 border-2 border-pink-400 border-dashed rounded-lg pointer-events-none"></div>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCrop}
              disabled={isProcessing}
              className="flex-1 px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCrop} className="mr-2" />
                  Save Cropped Image
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default sellerRegistration;