import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { authApi, adminApi } from '../services/api';
import CookieManager from '../utils/cookieManager';
import useSessionActivity from '../hooks/useSessionActivity';
import adminRealtimeService from '../services/adminRealtimeService';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'seller' | 'admin';
  businessInfo?: {
    storeName: string;
    storeDescription?: string;
    businessType: string;
    logo?: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isEmailVerified: boolean;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrPhone: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
  isImpersonating: boolean;
  originalUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Track user activity and refresh cookies automatically
  useSessionActivity({
    enabled: !!user,
    refreshThreshold: 60, // Refresh if less than 1 hour remaining
  });

  // Proactive token refresh to prevent expiration
  useEffect(() => {
    if (!user) return;

    const checkAndRefreshToken = async () => {
      try {
        // Check if token is about to expire (within 1 hour)
        const token = CookieManager.getAuthToken();
        if (!token) return;

        // Decode JWT to check expiration (without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const oneHour = 60 * 60 * 1000;

        if (timeUntilExpiry < oneHour && timeUntilExpiry > 0) {
          console.log('🔄 Token expiring soon, refreshing proactively...');
          const response = await authApi.refreshToken();
          if (response.token) {
            CookieManager.setAuthCookies(response.token, user, CookieManager.isRememberMe());
            console.log('✅ Token refreshed proactively');
          }
        }
      } catch (error) {
        console.warn('⚠️ Proactive token refresh failed:', error);
      }
    };

    // Check every 30 minutes
    const interval = setInterval(checkAndRefreshToken, 30 * 60 * 1000);
    
    // Also check immediately
    checkAndRefreshToken();

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    let isInitialized = false;
    let verificationTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      console.log('🔄 Initializing auth...');
      const token = CookieManager.getAuthToken();
      const savedUser = CookieManager.getUserData();
      
      // Check for impersonation state
      const savedOriginalUser = localStorage.getItem('originalUser');
      const savedIsImpersonating = localStorage.getItem('isImpersonating') === 'true';
      const savedImpersonatedUser = localStorage.getItem('impersonatedUser');
      
      console.log('🍪 Cookie check:', { 
        hasToken: !!token, 
        hasUser: !!savedUser, 
        tokenPreview: token?.substring(0, 10) + '...',
        tokenLength: token?.length || 0,
        userEmail: savedUser?.email,
        userRole: savedUser?.role,
        isImpersonating: savedIsImpersonating,
        hasOriginalUser: !!savedOriginalUser,
        hasImpersonatedUser: !!savedImpersonatedUser
      });
      
      if (token && savedUser) {
        try {
          // Set user from cookie data immediately to avoid flash
          console.log('✅ Setting user from cookies immediately');
          setUser(savedUser);
          
          // Restore impersonation state if it exists
          if (savedIsImpersonating && savedOriginalUser && savedImpersonatedUser) {
            console.log('🎭 Restoring impersonation state');
            setIsImpersonating(true);
            setOriginalUser(JSON.parse(savedOriginalUser));
            
            // Set the impersonated user as the current user
            const impersonatedUser = JSON.parse(savedImpersonatedUser);
            setUser(impersonatedUser);
            
            // Check if we have an impersonation token
            const impersonationToken = localStorage.getItem('impersonationToken');
            if (impersonationToken) {
              console.log('🎭 Found impersonation token, will use for API calls');
            }
            
            console.log('✅ Impersonation state restored:', {
              originalUser: JSON.parse(savedOriginalUser).email,
              impersonatedUser: impersonatedUser.email,
              isImpersonating: true
            });
          }
          
          setLoading(false);
          
          // Verify token is still valid in background (but don't fail if it doesn't work)
          console.log('🔍 Verifying token in background...');
          
          // Add delay to prevent overwhelming the API during app initialization
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Only verify if we haven't already verified recently
          const lastVerification = localStorage.getItem('lastTokenVerification');
          const now = Date.now();
          const verificationCooldown = 5 * 60 * 1000; // 5 minutes
          
          if (!lastVerification || (now - parseInt(lastVerification)) > verificationCooldown) {
            try {
              const userData = await authApi.getCurrentUser();
              
              // The /api/auth/me endpoint returns user data directly, not wrapped in { user: ... }
              // Only update if data actually changed to prevent re-renders
              if (JSON.stringify(userData) !== JSON.stringify(savedUser)) {
                console.log('📝 Updating user data from server');
                setUser(userData);
                CookieManager.updateUserData(userData);
              } else {
                console.log('✅ User data is up to date');
              }
              
              // Update last verification time
              localStorage.setItem('lastTokenVerification', now.toString());
            } catch (verificationError: any) {
              console.warn('⚠️ Token verification failed, but keeping user logged in from cookies:', verificationError);
              
              // Handle rate limiting specifically
              if (verificationError?.response?.status === 429) {
                console.log('Rate limited during token verification, will retry later');
                // Retry after a longer delay for rate limiting
                verificationTimeout = setTimeout(async () => {
                  try {
                    const userData = await authApi.getCurrentUser();
                    if (JSON.stringify(userData) !== JSON.stringify(savedUser)) {
                      setUser(userData);
                      CookieManager.updateUserData(userData);
                    }
                    localStorage.setItem('lastTokenVerification', Date.now().toString());
                  } catch (retryError) {
                    console.warn('Retry failed:', retryError);
                  }
                }, 30000); // Retry after 30 seconds for rate limiting
              }
            }
          } else {
            console.log('⏰ Token verification skipped - last verified recently');
          }
        } catch (error: any) {
          console.warn('⚠️ Token verification failed, but keeping user logged in from cookies:', error);
          
          // Handle rate limiting specifically
          if (error?.response?.status === 429) {
            console.log('Rate limited during token verification, will retry later');
            // Retry after a delay
            setTimeout(async () => {
              try {
                const userData = await authApi.getCurrentUser();
                if (JSON.stringify(userData) !== JSON.stringify(savedUser)) {
                  setUser(userData);
                  CookieManager.updateUserData(userData);
                }
              } catch (retryError) {
                console.warn('Retry failed:', retryError);
              }
            }, 10000); // Retry after 10 seconds
          }
          
          // Only clear if it's a definitive auth error (401)
          if (error?.response?.status === 401) {
            console.log('❌ 401 error - clearing cookies and impersonation state');
            CookieManager.clearAuthCookies();
            localStorage.removeItem('originalUser');
            localStorage.removeItem('isImpersonating');
            localStorage.removeItem('impersonationToken');
            localStorage.removeItem('impersonatedUser');
            setUser(null);
            setOriginalUser(null);
            setIsImpersonating(false);
          }
          setLoading(false);
        }
      } else {
        console.log('❌ No valid cookies found');
        setLoading(false);
      }
    };

    initializeAuth();
    
    // Cleanup function
    return () => {
      if (verificationTimeout) {
        clearTimeout(verificationTimeout);
      }
    };
  }, []);

  const login = async (emailOrPhone: string, password: string, rememberMe = false) => {
    try {
      console.log('🔐 Attempting login...', { emailOrPhone, rememberMe });
      const response = await authApi.login(emailOrPhone, password, rememberMe);
      
      // Handle both response formats (direct response or response.data)
      const responseData = response.data || response;
      const { token, user: userData } = responseData;
      
      if (!token || !userData) {
        throw new Error('Invalid response format from server');
      }
      
      console.log('✅ Login successful, setting cookies...', { 
        tokenPreview: token.substring(0, 10) + '...', 
        userEmail: userData.email,
        rememberMe 
      });
      
      // Set authentication cookies
      CookieManager.setAuthCookies(token, userData, rememberMe);
      
      // Verify cookies were set
      const savedToken = CookieManager.getAuthToken();
      const savedUser = CookieManager.getUserData();
      console.log('🍪 Cookies verification:', { 
        tokenSet: !!savedToken, 
        userSet: !!savedUser,
        cookieExpiration: CookieManager.getCookieExpiration()
      });
      
      setUser(userData);
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🚪 Logging out user...');
    
    try {
      // Disconnect admin realtime service if it's connected
      if (user?.role === 'admin') {
        adminRealtimeService.disconnect();
        console.log('🔌 Disconnected admin realtime service');
      }
      
      // Call backend logout API to invalidate session
      await authApi.logout();
      console.log('✅ Backend logout successful');
    } catch (error) {
      console.warn('⚠️ Backend logout failed, but continuing with frontend cleanup:', error);
      // Continue with frontend cleanup even if backend logout fails
    }
    
    // Clear all authentication cookies
    CookieManager.clearAuthCookies();
    
    // Also clear localStorage as fallback for any existing data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('originalUser');
    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('impersonatedUser');
    
    console.log('🧹 Cleared all auth data');
    setUser(null);
    setOriginalUser(null);
    setIsImpersonating(false);
    window.location.href = '/login';
  };

  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      
      // Update user cookie
      CookieManager.updateUserData(updatedUser);
      
      // Also update localStorage as fallback
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  }, [user]);

  const impersonateUser = useCallback(async (userId: string) => {
    try {
      console.log('🎭 Starting impersonation for user:', userId);
      
      // Only admins can impersonate
      if (!user || user.role !== 'admin') {
        throw new Error('Only admins can impersonate users');
      }

      // Store original admin user
      setOriginalUser(user);
      setIsImpersonating(true);

      // Persist impersonation state to localStorage
      localStorage.setItem('originalUser', JSON.stringify(user));
      localStorage.setItem('isImpersonating', 'true');

      // Forward optional generator params saved from banner
      const ordersParam = localStorage.getItem('impersonationOrders');
      const seedParam = localStorage.getItem('impersonationSeed');
      // Get the target user data from admin API (pass-through params if present)
      const response = await adminApi.impersonateUser(userId, {
        orders: ordersParam ? Math.max(1, Math.min(5000, parseInt(ordersParam))) : undefined,
        seed: seedParam || undefined
      });

      // Validate we received a real impersonation token before proceeding
      if (!response || typeof response.impersonationToken !== 'string' || response.impersonationToken.trim() === '') {
        console.error('Impersonation response missing token. Aborting impersonation.');
        throw new Error('Impersonation failed: missing token');
      }

      // Store the impersonation token for future API calls (only after validation)
      localStorage.setItem('impersonationToken', response.impersonationToken);

      // Set the impersonated user
      setUser(response.user);
      
      // Store the impersonated user info for persistence
      localStorage.setItem('impersonatedUser', JSON.stringify(response.user));
      
      // Update cookies with impersonated user
      CookieManager.updateUserData(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      console.log('✅ Impersonation started successfully');
      console.log('📋 Impersonation state saved:', {
        originalUser: user.email,
        impersonatedUser: response.user.email,
        hasToken: !!response.impersonationToken,
        localStorageKeys: {
          originalUser: !!localStorage.getItem('originalUser'),
          isImpersonating: !!localStorage.getItem('isImpersonating'),
          impersonationToken: !!localStorage.getItem('impersonationToken'),
          impersonatedUser: !!localStorage.getItem('impersonatedUser')
        }
      });
    } catch (error) {
      console.error('❌ Impersonation failed:', error);
      // Reset impersonation state on error
      setIsImpersonating(false);
      setOriginalUser(null);
      localStorage.removeItem('originalUser');
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('impersonationToken');
      localStorage.removeItem('impersonatedUser');
      throw error;
    }
  }, [user]);

  const stopImpersonation = useCallback(() => {
    if (originalUser && isImpersonating) {
      console.log('🎭 Stopping impersonation, returning to admin user');
      console.log('📋 Clearing impersonation state:', {
        originalUser: originalUser.email,
        currentUser: user?.email,
        localStorageKeys: {
          originalUser: !!localStorage.getItem('originalUser'),
          isImpersonating: !!localStorage.getItem('isImpersonating'),
          impersonationToken: !!localStorage.getItem('impersonationToken'),
          impersonatedUser: !!localStorage.getItem('impersonatedUser')
        }
      });
      
      setUser(originalUser);
      setOriginalUser(null);
      setIsImpersonating(false);
      
      // Clear impersonation state from localStorage
      localStorage.removeItem('originalUser');
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('impersonationToken');
      localStorage.removeItem('impersonatedUser');
      
      // Update cookies back to original admin user
      CookieManager.updateUserData(originalUser);
      localStorage.setItem('user', JSON.stringify(originalUser));
      
      console.log('✅ Impersonation stopped, state cleared');
    }
  }, [originalUser, isImpersonating, user]);

  const value: AuthContextType = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    impersonateUser,
    stopImpersonation,
    isImpersonating,
    originalUser,
    hasAdminPrivileges: user?.role === 'admin' || (isImpersonating && originalUser?.role === 'admin')
  }), [user, loading, login, logout, updateUser, impersonateUser, stopImpersonation, isImpersonating, originalUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
