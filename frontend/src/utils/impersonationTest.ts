/**
 * Test utility for impersonation state persistence
 * This helps verify that impersonation state is properly saved and restored
 */

export const testImpersonationPersistence = () => {
  console.group('🧪 Testing Impersonation Persistence');
  
  // Check localStorage state
  const originalUser = localStorage.getItem('originalUser');
  const isImpersonating = localStorage.getItem('isImpersonating');
  const impersonationToken = localStorage.getItem('impersonationToken');
  const impersonatedUser = localStorage.getItem('impersonatedUser');
  
  console.log('📋 Current localStorage state:', {
    originalUser: originalUser ? JSON.parse(originalUser).email : null,
    isImpersonating: isImpersonating === 'true',
    hasImpersonationToken: !!impersonationToken,
    impersonatedUser: impersonatedUser ? JSON.parse(impersonatedUser).email : null
  });
  
  // Check if state is consistent
  const hasOriginalUser = !!originalUser;
  const hasImpersonatedUser = !!impersonatedUser;
  const hasToken = !!impersonationToken;
  const isActive = isImpersonating === 'true';
  
  if (isActive && !hasOriginalUser) {
    console.error('❌ Impersonation active but no original user found');
  }
  
  if (isActive && !hasImpersonatedUser) {
    console.error('❌ Impersonation active but no impersonated user found');
  }
  
  if (isActive && !hasToken) {
    console.error('❌ Impersonation active but no token found');
  }
  
  if (isActive && hasOriginalUser && hasImpersonatedUser && hasToken) {
    console.log('✅ Impersonation state is complete and consistent');
  }
  
  console.groupEnd();
  
  return {
    isActive,
    hasOriginalUser,
    hasImpersonatedUser,
    hasToken,
    isConsistent: isActive && hasOriginalUser && hasImpersonatedUser && hasToken
  };
};

export const clearImpersonationState = () => {
  console.log('🧹 Clearing all impersonation state');
  localStorage.removeItem('originalUser');
  localStorage.removeItem('isImpersonating');
  localStorage.removeItem('impersonationToken');
  localStorage.removeItem('impersonatedUser');
  console.log('✅ Impersonation state cleared');
};

export const simulatePageRefresh = () => {
  console.log('🔄 Simulating page refresh - impersonation state should persist');
  const state = testImpersonationPersistence();
  
  if (state.isConsistent) {
    console.log('✅ State would persist correctly after refresh');
  } else {
    console.log('❌ State would NOT persist correctly after refresh');
  }
  
  return state;
};
