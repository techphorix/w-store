import Cookies from 'js-cookie';

// Centralized cookie configuration
export const COOKIE_CONFIG = {
  TOKEN_NAME: 'token', // Changed from 'auth_token' to match backend expectation
  USER_NAME: 'user_data',
  REMEMBER_NAME: 'remember_me',
  DEFAULT_EXPIRES: 7, // 7 days
  REMEMBER_EXPIRES: 30, // 30 days
  SECURE: false, // Set to false for development (localhost), true for production
  SAME_SITE: 'lax' as const, // Changed from 'strict' to 'lax' for better compatibility
  DOMAIN: undefined, // Don't set domain for localhost development
  PATH: '/' // Ensure cookies are available across the entire app
};

export class CookieManager {
  // Cache to reduce repeated cookie reads
  private static tokenCache: { value: string | undefined; timestamp: number } | null = null;
  private static userCache: { value: any | null; timestamp: number } | null = null;
  private static readonly CACHE_DURATION = 1000; // 1 second cache

  /**
   * Clear internal cache
   */
  private static clearCache() {
    this.tokenCache = null;
    this.userCache = null;
  }

  /**
   * Get default cookie options
   */
  private static getDefaultOptions(expires?: number) {
    return {
      expires: expires || COOKIE_CONFIG.DEFAULT_EXPIRES,
      secure: COOKIE_CONFIG.SECURE,
      sameSite: COOKIE_CONFIG.SAME_SITE,
      domain: COOKIE_CONFIG.DOMAIN,
      path: COOKIE_CONFIG.PATH // Ensure path is set
    };
  }

  /**
   * Set authentication cookies
   */
  static setAuthCookies(token: string, user: any, rememberMe: boolean = false) {
    const expires = rememberMe ? COOKIE_CONFIG.REMEMBER_EXPIRES : COOKIE_CONFIG.DEFAULT_EXPIRES;
    const options = this.getDefaultOptions(expires);

    console.log('🍪 Setting auth cookies:', { 
      tokenPreview: token.substring(0, 10) + '...',
      userEmail: user.email,
      rememberMe,
      expires: expires + ' days'
    });

    Cookies.set(COOKIE_CONFIG.TOKEN_NAME, token, options);
    Cookies.set(COOKIE_CONFIG.USER_NAME, JSON.stringify(user), options);
    Cookies.set(COOKIE_CONFIG.REMEMBER_NAME, rememberMe.toString(), options);
    
    // Clear cache after setting new cookies
    this.clearCache();
    
    console.log('✅ Auth cookies set successfully');
  }

  /**
   * Get authentication token
   */
  static getAuthToken(): string | undefined {
    const now = Date.now();
    
    // Return cached value if still valid
    if (this.tokenCache && (now - this.tokenCache.timestamp) < this.CACHE_DURATION) {
      return this.tokenCache.value;
    }
    
    const token = Cookies.get(COOKIE_CONFIG.TOKEN_NAME);
    
    // Enhanced debugging and validation
    console.log('🍪 Getting auth token:', { 
      tokenName: COOKIE_CONFIG.TOKEN_NAME,
      tokenExists: !!token,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'null',
      tokenLength: token ? token.length : 0,
      tokenType: typeof token,
      isString: typeof token === 'string',
      isEmpty: token === '',
      isWhitespace: token ? /^\s*$/.test(token) : true
    });
    
    // Validate token format
    let validToken = token;
    if (token && typeof token === 'string') {
      const trimmed = token.trim();
      if (trimmed.length === 0) {
        console.warn('⚠️ Token is empty or whitespace only');
        validToken = undefined;
      } else if (trimmed.length < 10) {
        console.warn('⚠️ Token seems too short:', trimmed.length);
        validToken = undefined;
      } else {
        validToken = trimmed;
        console.log('✅ Token validation passed');
      }
    } else if (token) {
      console.warn('⚠️ Token is not a string:', typeof token);
      validToken = undefined;
    }
    
    // Cache the result
    this.tokenCache = { value: validToken, timestamp: now };
    
    return validToken;
  }

  /**
   * Get user data
   */
  static getUserData(): any | null {
    const now = Date.now();
    
    // Return cached value if still valid
    if (this.userCache && (now - this.userCache.timestamp) < this.CACHE_DURATION) {
      return this.userCache.value;
    }
    
    const userData = Cookies.get(COOKIE_CONFIG.USER_NAME);
    let parsed = null;
    
    if (userData) {
      try {
        parsed = JSON.parse(userData);
      } catch (error) {
        console.error('❌ Failed to parse user data from cookie:', error);
        parsed = null;
      }
    }
    
    // Cache the result
    this.userCache = { value: parsed, timestamp: now };
    
    return parsed;
  }

  /**
   * Check if "Remember Me" was selected
   */
  static isRememberMe(): boolean {
    return Cookies.get(COOKIE_CONFIG.REMEMBER_NAME) === 'true';
  }

  /**
   * Clear all authentication cookies
   */
  static clearAuthCookies() {
    Cookies.remove(COOKIE_CONFIG.TOKEN_NAME);
    Cookies.remove(COOKIE_CONFIG.USER_NAME);
    Cookies.remove(COOKIE_CONFIG.REMEMBER_NAME);
    
    // Also clear legacy cookie names
    Cookies.remove('auth_token'); // Old token name
    
    // Clear cache when cookies are removed
    this.clearCache();
  }

  /**
   * Update user data cookie
   */
  static updateUserData(userData: any) {
    const rememberMe = this.isRememberMe();
    const expires = rememberMe ? COOKIE_CONFIG.REMEMBER_EXPIRES : COOKIE_CONFIG.DEFAULT_EXPIRES;
    const options = this.getDefaultOptions(expires);
    
    Cookies.set(COOKIE_CONFIG.USER_NAME, JSON.stringify(userData), options);
    
    // Clear cache after updating cookie
    this.clearCache();
  }

  /**
   * Check if user is authenticated (has valid cookies)
   */
  static isAuthenticated(): boolean {
    const token = this.getAuthToken();
    const userData = this.getUserData();
    return !!(token && userData);
  }

  /**
   * Refresh cookie expiration (useful for activity-based session extension)
   */
  static refreshCookies() {
    const token = this.getAuthToken();
    const userData = this.getUserData();
    const rememberMe = this.isRememberMe();

    if (token && userData) {
      this.setAuthCookies(token, userData, rememberMe);
    }
  }

  /**
   * Get cookie expiration date
   */
  static getCookieExpiration(): Date | null {
    const rememberMe = this.isRememberMe();
    const days = rememberMe ? COOKIE_CONFIG.REMEMBER_EXPIRES : COOKIE_CONFIG.DEFAULT_EXPIRES;
    
    if (this.isAuthenticated()) {
      const now = new Date();
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
    
    return null;
  }

  /**
   * Force clear ALL cookies (for debugging)
   */
  static forceCleanup() {
    console.log('🧹 Force cleaning all auth cookies...');
    
    // Clear current cookies
    this.clearAuthCookies();
    
    // Clear localStorage fallbacks
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear any potential domain variations
    const domains = [undefined, window.location.hostname, `.${window.location.hostname}`];
    const cookieNames = ['token', 'auth_token', 'user_data', 'remember_me'];
    
    for (const domain of domains) {
      for (const name of cookieNames) {
        try {
          Cookies.remove(name, { domain });
          Cookies.remove(name, { domain, path: '/' });
        } catch (e) {
          // Ignore errors
        }
      }
    }
    
    console.log('✅ Force cleanup completed');
    
    // Reload the page to start fresh
    window.location.reload();
  }
}

// Make it available globally for debugging in development
if (import.meta.env.DEV) {
  (window as any).CookieManager = CookieManager;
}

export default CookieManager;
