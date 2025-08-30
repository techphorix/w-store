require('dotenv').config();
const { connectDB, executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const runMigrations = async () => {
  try {
    logger.info('🚀 Starting database migrations...');
    
    // Connect to database first
    await connectDB();
    logger.info('✅ Database connected successfully');
    
    // Create users table (if not exists)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(20) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role ENUM('user', 'seller', 'admin') DEFAULT 'user',
        status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'pending',
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        profile_image VARCHAR(500),
        business_info JSON,
        address JSON,
        preferences JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_email (email),
        INDEX idx_phone (phone_number),
        INDEX idx_role (role),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Users table created');

    // Create categories table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        parent_id VARCHAR(36) NULL,
        image VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_parent (parent_id),
        INDEX idx_active (is_active),
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Categories table created');

    // Create products table (aligned with runtime schema)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        short_description VARCHAR(500),
        price DECIMAL(10,2) NOT NULL,
        compare_price DECIMAL(10,2),
        cost_price DECIMAL(10,2),
        sku VARCHAR(100) UNIQUE,
        barcode VARCHAR(100),
        category_id VARCHAR(36),
        brand VARCHAR(255),
        model VARCHAR(255),
        weight DECIMAL(8,3),
        dimensions JSON,
        images JSON,
        features JSON,
        specifications JSON,
        tags JSON,
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        stock_quantity INT DEFAULT 0,
        low_stock_threshold INT DEFAULT 5,
        track_inventory BOOLEAN DEFAULT TRUE,
        allow_backorders BOOLEAN DEFAULT FALSE,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category_id),
        INDEX idx_active (is_active),
        INDEX idx_featured (is_featured),
        INDEX idx_sku (sku),
        INDEX idx_created_by (created_by),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Products table created');

    // Create product_distributions table (aligned)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS product_distributions (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        seller_id VARCHAR(36) NOT NULL,
        allocated_stock INT DEFAULT 0,
        markup_percentage DECIMAL(5,2) DEFAULT 0,
        seller_price DECIMAL(10,2),
        seller_notes TEXT,
        admin_notes TEXT,
        status ENUM('pending', 'approved', 'rejected', 'active', 'inactive') DEFAULT 'pending',
        views_count INT DEFAULT 0,
        clicks_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_product_seller (product_id, seller_id),
        INDEX idx_product (product_id),
        INDEX idx_seller (seller_id),
        INDEX idx_status (status),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Product distributions table created');

    // Create orders table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id VARCHAR(36) NOT NULL,
        seller_id VARCHAR(36) NOT NULL,
        status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
        total_amount DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        shipping_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        shipping_address JSON,
        billing_address JSON,
        payment_method VARCHAR(50),
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        notes TEXT,
        estimated_delivery DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_number (order_number),
        INDEX idx_customer (customer_id),
        INDEX idx_seller (seller_id),
        INDEX idx_status (status),
        INDEX idx_payment_status (payment_status),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Orders table created');

    // Create order_items table (aligned)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        product_name VARCHAR(255),
        product_sku VARCHAR(100),
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        options JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order (order_id),
        INDEX idx_product (product_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Order items table created');

    // Create notifications table (aligned)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        recipient_id VARCHAR(36) NOT NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON,
        is_read BOOLEAN DEFAULT FALSE,
        priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
        action_button JSON,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP NULL,
        INDEX idx_recipient (recipient_id),
        INDEX idx_type (type),
        INDEX idx_read (is_read),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Notifications table created');

    // Create analytics table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS analytics (
        id VARCHAR(36) PRIMARY KEY,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(36),
        metric_path VARCHAR(255) NOT NULL,
        value DECIMAL(15,2) DEFAULT 0,
        increment INT DEFAULT 0,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_metric (metric_path),
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Analytics table created');

    // Create financial_transactions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type ENUM('sale', 'refund', 'payout', 'fee', 'adjustment') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        description TEXT,
        reference_id VARCHAR(100),
        status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        INDEX idx_user (user_id),
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Financial transactions table created');

    // Create user_sessions table (aligned)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(500) NOT NULL,
        refresh_token VARCHAR(500),
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_token (token(255)),
        INDEX idx_expires (expires_at),
        INDEX idx_active (is_active),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ User sessions table created');

    // Create email_verification_tokens table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_token (token),
        INDEX idx_expires (expires_at),
        INDEX idx_used (is_used),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Email verification tokens table created');

    // Create password_reset_tokens table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_token (token),
        INDEX idx_expires (expires_at),
        INDEX idx_used (is_used),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Password reset tokens table created');

    // Create file_uploads table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id VARCHAR(36) PRIMARY KEY,
        original_name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        size BIGINT NOT NULL,
        path VARCHAR(500) NOT NULL,
        url VARCHAR(500) NOT NULL,
        uploaded_by VARCHAR(36) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
        metadata JSON,
        INDEX idx_uploaded_by (uploaded_by),
        INDEX idx_status (status),
        INDEX idx_uploaded_at (uploaded_at),
        INDEX idx_mimetype (mimetype),
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ File uploads table created');

    // Create seller_fake_stats table for admin analytics control
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS seller_fake_stats (
        id VARCHAR(36) PRIMARY KEY,
        seller_id VARCHAR(36) NOT NULL,
        timeframe ENUM('today', '7days', '30days', 'total') NOT NULL,
        fake_orders INT DEFAULT 0,
        fake_sales DECIMAL(12,2) DEFAULT 0,
        fake_revenue DECIMAL(12,2) DEFAULT 0,
        fake_products INT DEFAULT 0,
        fake_customers INT DEFAULT 0,
        fake_visitors INT DEFAULT 0,
        fake_followers INT DEFAULT 0,
        fake_rating DECIMAL(3,2) DEFAULT 0,
        fake_credit_score INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_seller_timeframe (seller_id, timeframe),
        INDEX idx_seller (seller_id),
        INDEX idx_timeframe (timeframe),
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Seller fake stats table created');

    // Create system_settings table for admin configuration
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(36) PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_key (setting_key),
        INDEX idx_public (is_public)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ System settings table created');

    // Create announcements table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
        target_role ENUM('all', 'user', 'seller', 'admin') DEFAULT 'all',
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_target_role (target_role),
        INDEX idx_is_active (is_active),
        INDEX idx_expires_at (expires_at),
        INDEX idx_created_by (created_by),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Announcements table created');

    // Create audit_logs table for admin actions
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(36),
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_action (action),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Audit logs table created');

    logger.info('🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
