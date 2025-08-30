import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socketService';
import {
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faGlobe,
  faChevronDown,
  faSignInAlt,
  faUserPlus,
  faPhone,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import tiktokLogo from '../assets/tiktok-logo.png';
import tiktokBackground from '../assets/tiktok-background.jpg';

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
    subtitle: 'Welcome Back',
    description: 'Sign in to your TikTok Shop account and continue building your business.',
    emailOrPhone: 'Email or Phone Number',
    password: 'Password',
    signIn: 'Sign In to Your Store',
    forgotPassword: 'Forgot Password?',
    noAccount: 'Don\'t have an account?',
    register: 'Register Now',
    rememberMe: 'Remember me',
    emailOrPhonePlaceholder: 'Enter your email or phone number',
    passwordPlaceholder: 'Enter your password'
  },
  ES: {
    title: 'TIENDA TIKTOK',
    subtitle: 'Bienvenido de Vuelta',
    description: 'Inicia sesión en tu cuenta de TikTok Shop y continúa construyendo tu negocio.',
    emailOrPhone: 'Email o Número de Teléfono',
    password: 'Contraseña',
    signIn: 'Iniciar Sesión en Tu Tienda',
    forgotPassword: '¿Olvidaste tu contraseña?',
    noAccount: '¿No tienes una cuenta?',
    register: 'Regístrate Ahora',
    rememberMe: 'Recuérdame',
    emailOrPhonePlaceholder: 'Ingresa tu email o número de teléfono',
    passwordPlaceholder: 'Ingresa tu contraseña'
  },
  ZH: {
    title: 'TIKTOK商店',
    subtitle: '欢迎回来',
    description: '登录您的TikTok Shop账户，继续发展您的业务。',
    emailOrPhone: '邮箱或手机号',
    password: '密码',
    signIn: '登录您的商店',
    forgotPassword: '忘记密码？',
    noAccount: '还没有账户？',
    register: '立即注册',
    rememberMe: '记住我',
    emailOrPhonePlaceholder: '输入您的邮箱或手机号',
    passwordPlaceholder: '输入您的密码'
  }
};

interface FormData {
  emailOrPhone: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  // Helper function to get dashboard URL based on user role
  const getDashboardUrl = (userData?: any) => {
    // Check if user is admin
    if (userData?.role === 'admin') {
      return '/admin/dashboard';
    }
    
    // For sellers, redirect to their shop dashboard
    const rawShopname = userData?.businessInfo?.storeName || userData?.fullName || 'default';
    // Clean shopname to remove any @ symbols
    const cleanShopname = rawShopname ? rawShopname.replace(/^@+/, '') : rawShopname;
    return `/dashboard/${cleanShopname}`;
  };

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations] || translations.EN;

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    emailOrPhone: '',
    password: '',
    rememberMe: false
  });

  // UI state
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.emailOrPhone.trim()) {
      errors.emailOrPhone = 'Email or phone number is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
      
      // Check if it's neither valid email nor valid phone
      if (!emailRegex.test(formData.emailOrPhone) && !phoneRegex.test(formData.emailOrPhone)) {
        errors.emailOrPhone = 'Please enter a valid email address or phone number';
      }
    }
    
    if (!formData.password) errors.password = 'Password is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardUrl(user));
    }
  }, [isAuthenticated, user, navigate]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the AuthContext login method
      const result = await login(formData.emailOrPhone, formData.password, formData.rememberMe);
      
      // Initialize socket connection with new token
      socketService.reconnectWithToken();
      
      // Redirect to parameterized dashboard
      navigate(getDashboardUrl(result || user));
    } catch (error: any) {
      console.error('Login error:', error);
      setFormErrors({ 
        submit: error.response?.data?.message || 'Login failed. Please check your credentials and try again.' 
      });
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

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
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
            <p className="text-gray-700 max-w-lg mx-auto">
              {currentLang.description}
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Submit Error */}
                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faEyeSlash} className="text-black mr-3" />
                      <span className="text-red-600 font-medium">{formErrors.submit}</span>
                    </div>
                  </div>
                )}

                {/* Email or Phone Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.emailOrPhone} *
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faUser} 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    />
                    <input
                      type="text"
                      name="emailOrPhone"
                      value={formData.emailOrPhone}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all"
                      placeholder={currentLang.emailOrPhonePlaceholder}
                    />
                  </div>
                  {formErrors.emailOrPhone && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.emailOrPhone}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.password} *
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
                      className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all"
                      placeholder={currentLang.passwordPlaceholder}
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
                    <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-black bg-gray-50 border-gray-300 rounded focus:ring-black focus:ring-2"
                    />
                    <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
                      {currentLang.rememberMe}
                    </label>
                  </div>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-black hover:text-gray-700 font-medium"
                  >
                    {currentLang.forgotPassword}
                  </Link>
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
                      Signing In...
                    </div>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSignInAlt} className="mr-2" />
                      {currentLang.signIn}
                    </>
                  )}
                </button>

                {/* Register Link */}
                <div className="text-center mt-6">
                  <p className="text-gray-600">
                    {currentLang.noAccount}{' '}
                    <Link to="/register" className="text-black hover:text-gray-700 font-medium">
                      {currentLang.register}
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-700">
            <p>&copy; 2024 TikTok Shop. All rights reserved.</p>
            <div className="flex justify-center space-x-6 mt-4 text-sm">
              <Link to="/help" className="hover:text-black transition-colors">Help Center</Link>
              <Link to="/contact" className="hover:text-black transition-colors">Contact Support</Link>
              <Link to="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
