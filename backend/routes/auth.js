const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticateToken, requireVerifiedEmail } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/profiles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters long'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('role').optional().isIn(['seller']).withMessage('Invalid role specified')
];

const validateLogin = [
  body('emailOrPhone').notEmpty().withMessage('Email or phone number is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
];

// Register new user
router.post('/register', upload.single('profileImage'), validateRegistration, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password, fullName, phoneNumber, role = 'seller', businessInfo } = req.body;
  const profileImage = req.file;

  // Check if user already exists
  const existingUser = await executeQuery(
    'SELECT id FROM users WHERE email = ? OR phone_number = ?',
    [email, phoneNumber]
  );

  if (existingUser.length > 0) {
    return res.status(400).json({
      error: true,
      message: 'User with this email or phone number already exists'
    });
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userId = uuidv4();
  const userData = {
    id: userId,
    email,
    password_hash: passwordHash,
    full_name: fullName,
    phone_number: phoneNumber,
    role,
    status: role === 'seller' ? 'pending' : 'active',
    email_verified: false,
    profile_image: profileImage ? `/uploads/profiles/${profileImage.filename}` : null,
    business_info: businessInfo ? JSON.stringify(businessInfo) : null,
    created_at: new Date(),
    updated_at: new Date()
  };

  await executeQuery(
    'INSERT INTO users (id, email, password_hash, full_name, phone_number, role, status, email_verified, profile_image, business_info, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    Object.values(userData)
  );

  // Create email verification token
  const verificationToken = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await executeQuery(
    'INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [uuidv4(), userId, verificationToken, expiresAt]
  );

  // Send verification email
  try {
    await sendVerificationEmail(email, fullName, verificationToken);
  } catch (emailError) {
    logger.error('Failed to send verification email:', emailError);
    // Don't fail registration if email fails
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Remove sensitive data from response
  delete userData.password_hash;

  logger.info(`New user registered: ${email} (${role})`);

  res.status(201).json({
    error: false,
    message: 'User registered successfully',
    user: userData,
    token,
    requiresVerification: role === 'seller'
  });
}));

// Login user
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { emailOrPhone, password, rememberMe = false } = req.body;

  // Find user by email or phone
  const user = await executeQuery(
    'SELECT * FROM users WHERE email = ? OR phone_number = ?',
    [emailOrPhone, emailOrPhone]
  );

  if (user.length === 0) {
    return res.status(401).json({
      error: true,
      message: 'Invalid credentials'
    });
  }

  const userData = user[0];

  // Check if account is active
  if (userData.status !== 'active') {
    return res.status(401).json({
      error: true,
      message: `Account is ${userData.status}. Please contact support.`
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, userData.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({
      error: true,
      message: 'Invalid credentials'
    });
  }

  // Generate JWT token
  const tokenExpiry = rememberMe ? '30d' : '7d';
  const token = jwt.sign(
    { userId: userData.id, email: userData.email, role: userData.role },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpiry }
  );

  // Update last login
  await executeQuery(
    'UPDATE users SET last_login = ? WHERE id = ?',
    [new Date(), userData.id]
  );

  // Store session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);

  await executeQuery(
    'INSERT INTO user_sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [sessionId, userData.id, token, expiresAt, req.ip, req.get('User-Agent')]
  );

  // Remove sensitive data from response
  delete userData.password_hash;

  // Transform field names to match frontend interface (camelCase)
  const transformedUser = {
    _id: userData.id,
    fullName: userData.full_name,
    email: userData.email,
    phoneNumber: userData.phone_number,
    role: userData.role,
    businessInfo: userData.business_info,
    address: userData.address,
    isEmailVerified: userData.email_verified,
    isActive: userData.status === 'active',
    profileImage: userData.profile_image,
    preferences: userData.preferences,
    createdAt: userData.created_at,
    lastLogin: userData.last_login
  };

  logger.info(`User logged in: ${userData.email}`);

  res.json({
    error: false,
    message: 'Login successful',
    user: transformedUser,
    token,
    expiresIn: tokenExpiry
  });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  // Check if this is an impersonated user
  const isImpersonated = req.user?.isImpersonated || false;
  const originalAdminId = req.user?.originalAdminId || null;
  
  console.log('🔍 /auth/me endpoint called:', {
    userId: req.userId,
    userRole: req.user?.role,
    isImpersonated,
    originalAdminId
  });

  // Get complete user data including all fields needed for impersonation
  const user = await executeQuery(
    'SELECT id, email, phone_number, full_name, role, status, email_verified, phone_verified, profile_image, business_info, address, preferences, created_at, last_login, date_of_birth, profile_photo, is_active, has_payment_password, has_funds_password, two_factor_enabled, email_notifications, sms_notifications, push_notifications, marketing_emails FROM users WHERE id = ?',
    [req.userId]
  );

  if (user.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'User not found'
    });
  }

  const userData = user[0];
  
  // Parse JSON fields
  if (userData.business_info) {
    try {
      userData.business_info = JSON.parse(userData.business_info);
    } catch (e) {
      userData.business_info = {};
    }
  }
  if (userData.address) {
    try {
      userData.address = JSON.parse(userData.address);
    } catch (e) {
      userData.address = {};
    }
  }
  if (userData.preferences) {
    try {
      userData.preferences = JSON.parse(userData.preferences);
    } catch (e) {
      userData.preferences = {};
    }
  }

  // Transform field names to match frontend interface (camelCase)
  const transformedUser = {
    _id: userData.id,
    id: userData.id,
    fullName: userData.full_name,
    email: userData.email,
    phoneNumber: userData.phone_number,
    role: userData.role,
    status: userData.status,
    businessInfo: userData.business_info,
    address: userData.address,
    isEmailVerified: userData.email_verified,
    isPhoneVerified: userData.phone_verified,
    isActive: userData.is_active || userData.status === 'active',
    profileImage: userData.profile_image,
    profilePhoto: userData.profile_photo,
    preferences: userData.preferences,
    createdAt: userData.created_at,
    lastLogin: userData.last_login,
    dateOfBirth: userData.date_of_birth,
    hasPaymentPassword: userData.has_payment_password || false,
    hasFundsPassword: userData.has_funds_password || false,
    twoFactorEnabled: userData.two_factor_enabled || false,
    emailNotifications: userData.email_notifications !== null ? userData.email_notifications : true,
    smsNotifications: userData.sms_notifications || false,
    pushNotifications: userData.push_notifications !== null ? userData.push_notifications : true,
    marketingEmails: userData.marketing_emails || false
  };

  // Add impersonation info if applicable
  if (isImpersonated) {
    transformedUser.isImpersonated = true;
    transformedUser.originalAdminId = originalAdminId;
    console.log('🎭 Returning impersonated user data:', {
      impersonatedUserId: transformedUser._id,
      impersonatedUserEmail: transformedUser.email,
      impersonatedUserRole: transformedUser.role
    });
  }

  res.json({
    error: false,
    user: transformedUser
  });
}));

// Update profile
router.put('/profile', authenticateToken, upload.single('profileImage'), asyncHandler(async (req, res) => {
  const { fullName, phoneNumber, businessInfo, address, preferences } = req.body;
  const profileImage = req.file;

  const updates = [];
  const params = [];

  if (fullName) {
    updates.push('full_name = ?');
    params.push(fullName);
  }

  if (phoneNumber) {
    updates.push('phone_number = ?');
    params.push(phoneNumber);
  }

  if (businessInfo) {
    updates.push('business_info = ?');
    params.push(JSON.stringify(businessInfo));
  }

  if (address) {
    updates.push('address = ?');
    params.push(JSON.stringify(address));
  }

  if (preferences) {
    updates.push('preferences = ?');
    params.push(JSON.stringify(preferences));
  }

  if (profileImage) {
    updates.push('profile_image = ?');
    params.push(`/uploads/profiles/${profileImage.filename}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: true,
      message: 'No fields to update'
    });
  }

  updates.push('updated_at = ?');
  params.push(new Date());
  params.push(req.userId);

  await executeQuery(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info(`Profile updated for user: ${req.userId}`);

  res.json({
    error: false,
    message: 'Profile updated successfully'
  });
}));

// Change password
router.post('/change-password', authenticateToken, validatePasswordChange, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get current user
  const user = await executeQuery(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.userId]
  );

  if (user.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'User not found'
    });
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user[0].password_hash);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      error: true,
      message: 'Current password is incorrect'
    });
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await executeQuery(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [newPasswordHash, new Date(), req.userId]
  );

  // Invalidate all sessions
  await executeQuery(
    'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
    [req.userId]
  );

  logger.info(`Password changed for user: ${req.userId}`);

  res.json({
    error: false,
    message: 'Password changed successfully. Please login again.'
  });
}));

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email } = req.body;

  // Check if user exists
  const user = await executeQuery(
    'SELECT id, full_name FROM users WHERE email = ? AND status = "active"',
    [email]
  );

  if (user.length === 0) {
    // Don't reveal if user exists or not
    return res.json({
      error: false,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }

  const userData = user[0];

  // Create password reset token
  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await executeQuery(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [uuidv4(), userData.id, resetToken, expiresAt]
  );

  // Send password reset email
  try {
    await sendPasswordResetEmail(email, userData.full_name, resetToken);
  } catch (emailError) {
    logger.error('Failed to send password reset email:', emailError);
    return res.status(500).json({
      error: true,
      message: 'Failed to send password reset email. Please try again.'
    });
  }

  logger.info(`Password reset requested for user: ${email}`);

  res.json({
    error: false,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
}));

// Reset password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { token, password } = req.body;

  // Find valid reset token
  const resetToken = await executeQuery(
    'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
    [token]
  );

  if (resetToken.length === 0) {
    return res.status(400).json({
      error: true,
      message: 'Invalid or expired reset token'
    });
  }

  const tokenData = resetToken[0];

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newPasswordHash = await bcrypt.hash(password, saltRounds);

  // Update password
  await executeQuery(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [newPasswordHash, new Date(), tokenData.user_id]
  );

  // Delete used token
  await executeQuery(
    'DELETE FROM password_reset_tokens WHERE token = ?',
    [token]
  );

  // Invalidate all sessions
  await executeQuery(
    'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
    [tokenData.user_id]
  );

  logger.info(`Password reset completed for user: ${tokenData.user_id}`);

  res.json({
    error: false,
    message: 'Password reset successfully. Please login with your new password.'
  });
}));

// Verify email
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { token } = req.body;

  // Find valid verification token
  const verificationToken = await executeQuery(
    'SELECT user_id, expires_at FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()',
    [token]
  );

  if (verificationToken.length === 0) {
    return res.status(400).json({
      error: true,
      message: 'Invalid or expired verification token'
    });
  }

  const tokenData = verificationToken[0];

  // Update user verification status
  await executeQuery(
    'UPDATE users SET email_verified = TRUE, status = "active", updated_at = ? WHERE id = ?',
    [new Date(), tokenData.user_id]
  );

  // Delete used token
  await executeQuery(
    'DELETE FROM email_verification_tokens WHERE token = ?',
    [token]
  );

  logger.info(`Email verified for user: ${tokenData.user_id}`);

  res.json({
    error: false,
    message: 'Email verified successfully. Your account is now active.'
  });
}));

// Logout
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // Invalidate current session
  await executeQuery(
    'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND token = ?',
    [req.userId, req.headers.authorization?.split(' ')[1]]
  );

  logger.info(`User logged out: ${req.userId}`);

  res.json({
    error: false,
    message: 'Logged out successfully'
  });
}));

// Refresh token (optional - for longer sessions)
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  try {
    console.log('🔍 Token refresh requested for user:', req.userId);
    
    // Check if the current session is still valid
    const currentSession = await executeQuery(
      'SELECT * FROM user_sessions WHERE user_id = ? AND token = ? AND is_active = TRUE AND expires_at > NOW()',
      [req.userId, req.headers.authorization?.split(' ')[1]]
    );

    if (currentSession.length === 0) {
      console.log('❌ No valid session found for token refresh');
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired session'
      });
    }

    console.log('✅ Valid session found, generating new token');

    // Generate new token
    const newToken = jwt.sign(
      { userId: req.userId, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update session with new token
    try {
      await executeQuery(
        'UPDATE user_sessions SET token = ? WHERE id = ?',
        [newToken, currentSession[0].id]
      );
    } catch (updateError) {
      console.log('⚠️ Failed to update session token, but continuing:', updateError.message);
      // Continue even if update fails - the token is still valid
    }

    console.log('✅ Token refreshed successfully for user:', req.userId);

    res.json({
      error: false,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    
    // Check if it's a database connection issue
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: true,
        message: 'Database connection failed. Please try again later.'
      });
    }
    
    // Check if it's a table structure issue
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('⚠️ user_sessions table not found, skipping session validation');
      
      // Generate new token without session validation
      const newToken = jwt.sign(
        { userId: req.userId, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      return res.json({
        error: false,
        token: newToken,
        message: 'Token refreshed successfully (session validation skipped)'
      });
    }
    
    // Check if it's a rate limiting issue
    if (error.status === 429) {
      return res.status(429).json({
        error: true,
        message: 'Too many refresh attempts. Please wait before trying again.',
        retryAfter: error.headers?.['retry-after'] || 60
      });
    }
    
    res.status(500).json({
      error: true,
      message: 'Failed to refresh token',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Validate token and session (debug endpoint)
router.get('/validate', authenticateToken, asyncHandler(async (req, res) => {
  try {
    console.log('🔍 Token validation requested for user:', req.userId);
    
    // Get current session details
    const session = await executeQuery(
      'SELECT * FROM user_sessions WHERE user_id = ? AND token = ? AND is_active = TRUE',
      [req.userId, req.headers.authorization?.split(' ')[1]]
    );

    const tokenInfo = {
      userId: req.userId,
      user: req.user,
      hasValidSession: !!session && session.length > 0,
      sessionDetails: session[0] || null,
      tokenHeader: req.headers.authorization?.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Token validation successful:', tokenInfo);

    res.json({
      error: false,
      message: 'Token validation successful',
      tokenInfo
    });
  } catch (error) {
    console.error('❌ Token validation error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to validate token'
    });
  }
}));

module.exports = router;
