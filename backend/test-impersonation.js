const jwt = require('jsonwebtoken');

// Test impersonation token generation and validation
const testImpersonation = () => {
  console.log('🧪 Testing impersonation token flow...');
  
  // Simulate admin user
  const adminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin'
  };
  
  // Simulate seller user to impersonate
  const sellerUser = {
    id: 'seller-456',
    email: 'seller@example.com',
    role: 'seller'
  };
  
  // Generate impersonation token (same as admin route)
  const impersonationToken = jwt.sign(
    {
      userId: sellerUser.id,
      originalAdminId: adminUser.id,
      isImpersonation: true,
      role: sellerUser.role
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1h' }
  );
  
  console.log('✅ Impersonation token generated:', {
    tokenPreview: impersonationToken.substring(0, 20) + '...',
    tokenLength: impersonationToken.length
  });
  
  // Verify the token
  try {
    const decoded = jwt.verify(impersonationToken, process.env.JWT_SECRET || 'your-secret-key');
    console.log('✅ Token verified successfully:', {
      userId: decoded.userId,
      originalAdminId: decoded.originalAdminId,
      isImpersonation: decoded.isImpersonation,
      role: decoded.role,
      exp: decoded.exp
    });
    
    if (decoded.isImpersonation) {
      console.log('🎭 Impersonation token detected correctly');
    } else {
      console.log('❌ Impersonation flag not set');
    }
    
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
  }
  
  // Test token expiration
  const expiredToken = jwt.sign(
    {
      userId: sellerUser.id,
      originalAdminId: adminUser.id,
      isImpersonation: true,
      role: sellerUser.role
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1s' }
  );
  
  console.log('\n⏰ Testing expired token...');
  
  // Wait for token to expire
  setTimeout(() => {
    try {
      const decodedExpired = jwt.verify(expiredToken, process.env.JWT_SECRET || 'your-secret-key');
      console.log('❌ Expired token should have failed validation');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('✅ Expired token correctly rejected');
      } else {
        console.log('❌ Unexpected error with expired token:', error.message);
      }
    }
  }, 2000);
};

// Run the test
testImpersonation();
