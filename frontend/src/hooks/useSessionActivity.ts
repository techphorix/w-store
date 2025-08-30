import { useEffect, useCallback } from 'react';
import CookieManager from '../utils/cookieManager';

interface UseSessionActivityOptions {
  enabled?: boolean;
  refreshThreshold?: number; // Minutes before expiration to refresh
  activityEvents?: string[];
}

/**
 * Hook to track user activity and refresh authentication cookies
 * This helps maintain active sessions while the user is actively using the app
 */
export const useSessionActivity = (options: UseSessionActivityOptions = {}) => {
  const {
    enabled = true,
    refreshThreshold = 60, // Refresh if less than 1 hour remaining
    activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  } = options;

  const checkAndRefreshSession = useCallback(() => {
    if (!enabled || !CookieManager.isAuthenticated()) {
      return;
    }

    const expiration = CookieManager.getCookieExpiration();
    if (!expiration) return;

    const now = new Date();
    const timeUntilExpiration = expiration.getTime() - now.getTime();
    const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);

    // If less than threshold minutes remaining, refresh the cookies
    if (minutesUntilExpiration < refreshThreshold && minutesUntilExpiration > 0) {
      console.log('Refreshing session cookies due to user activity');
      CookieManager.refreshCookies();
    }
  }, [enabled, refreshThreshold]);

  const handleActivity = useCallback(() => {
    // Debounce activity checks to avoid excessive calls
    const timeoutId = setTimeout(checkAndRefreshSession, 1000);
    return () => clearTimeout(timeoutId);
  }, [checkAndRefreshSession]);

  useEffect(() => {
    if (!enabled) return;

    // Add event listeners for user activity
    const cleanupFunctions: (() => void)[] = [];

    activityEvents.forEach(event => {
      const cleanup = handleActivity();
      document.addEventListener(event, handleActivity, { passive: true });
      
      cleanupFunctions.push(() => {
        document.removeEventListener(event, handleActivity);
        cleanup();
      });
    });

    // Also check session on mount
    checkAndRefreshSession();

    // Cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [enabled, activityEvents, handleActivity, checkAndRefreshSession]);

  return {
    refreshSession: checkAndRefreshSession,
    isAuthenticated: CookieManager.isAuthenticated(),
    cookieExpiration: CookieManager.getCookieExpiration()
  };
};

export default useSessionActivity;
