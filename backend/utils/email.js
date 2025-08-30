const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send verification email
const sendVerificationEmail = async (email, fullName, token) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@wstore.com',
      to: email,
      subject: 'Verify Your Email - W-Store',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Welcome to W-Store!</h1>
            <p style="color: #666; font-size: 16px;">Hi ${fullName},</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for registering with W-Store! To complete your registration and activate your account, 
              please click the button below to verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; 
                        border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If the button above doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; font-size: 14px; word-break: break-all;">
              ${verificationUrl}
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with W-Store, you can safely ignore this email.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} W-Store. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}: ${info.messageId}`);
    return info;
    
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}:`, error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, fullName, token) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@wstore.com',
      to: email,
      subject: 'Reset Your Password - W-Store',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Password Reset Request</h1>
            <p style="color: #666; font-size: 16px;">Hi ${fullName},</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your W-Store account. 
              If you made this request, click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; 
                        border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If the button above doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #dc3545; font-size: 14px; word-break: break-all;">
              ${resetUrl}
            </p>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 5px; margin-bottom: 30px;">
            <h3 style="color: #856404; margin-top: 0;">Important Security Notice</h3>
            <ul style="color: #856404; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">
              <li>This password reset link will expire in 1 hour</li>
              <li>If you didn't request a password reset, please ignore this email</li>
              <li>Your current password will remain unchanged</li>
              <li>For security, this link can only be used once</li>
            </ul>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>If you have any questions or concerns, please contact our support team.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} W-Store. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}: ${info.messageId}`);
    return info;
    
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}:`, error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, fullName, role) => {
  try {
    const transporter = createTransporter();
    
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@wstore.com',
      to: email,
      subject: 'Welcome to W-Store!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Welcome to W-Store!</h1>
            <p style="color: #666; font-size: 16px;">Hi ${fullName},</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Congratulations! Your account has been successfully created and verified. 
              You're now ready to start using W-Store.
            </p>
            
            ${role === 'seller' ? `
              <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #155724; margin-top: 0;">Seller Account Activated</h3>
                <p style="color: #155724; font-size: 14px; line-height: 1.5; margin: 0;">
                  As a seller, you can now create your shop, add products, and start selling on our platform. 
                  Visit your dashboard to get started!
                </p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" 
                 style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; 
                        border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
          </div>
          
          <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 5px; margin-bottom: 30px;">
            <h3 style="color: #004085; margin-top: 0;">Getting Started</h3>
            <ul style="color: #004085; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">
              <li>Complete your profile information</li>
              <li>${role === 'seller' ? 'Set up your shop and add products' : 'Browse and purchase products'}</li>
              <li>Explore our features and services</li>
              <li>Contact support if you need help</li>
            </ul>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>We're excited to have you on board!</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} W-Store. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}: ${info.messageId}`);
    return info;
    
  } catch (error) {
    logger.error(`Failed to send welcome email to ${email}:`, error);
    throw error;
  }
};

// Send notification email
const sendNotificationEmail = async (email, fullName, notification) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@wstore.com',
      to: email,
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">W-Store Notification</h1>
            <p style="color: #666; font-size: 16px;">Hi ${fullName},</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">${notification.title}</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              ${notification.message}
            </p>
            
            ${notification.actionButton ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.actionButton.url}" 
                   style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; 
                          border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                  ${notification.actionButton.text}
                </a>
              </div>
            ` : ''}
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} W-Store. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Notification email sent to ${email}: ${info.messageId}`);
    return info;
    
  } catch (error) {
    logger.error(`Failed to send notification email to ${email}:`, error);
    throw error;
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('✅ Email configuration is valid');
    return true;
  } catch (error) {
    logger.error('❌ Email configuration is invalid:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendNotificationEmail,
  testEmailConfig
};
