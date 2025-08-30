const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

// Helper function to convert Date objects to MySQL DATETIME format
const toMySQLDateTime = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof date === 'string') {
    // Try to parse the string and convert it
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 19).replace('T', ' ');
    }
  }
  return date;
};

// Database configuration function - called when needed to ensure env vars are loaded
const getDbConfig = () => {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wstore_db',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    // Add MySQL2 specific options for better parameter handling
    typeCast: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    // Set timezone to UTC to avoid datetime conversion issues
    timezone: 'Z'
  };
  
  // Debug logging (commented out for production)
  // console.log('🔍 Database config:', {
  //   host: config.host,
  //   user: config.user,
  //   password: config.password ? '***SET***' : 'NOT SET',
  //   database: config.database,
  //   port: config.port
  // });
  
  return config;
};

// Create connection pool
let pool;

// Connect to database
const connectDB = async () => {
  try {
    // Get database configuration at runtime to ensure env vars are loaded
    const dbConfig = getDbConfig();
    
    // First, try to connect without database to create it if it doesn't exist
    const tempConfig = { ...dbConfig };
    delete tempConfig.database;
    
    const tempConnection = await mysql.createConnection(tempConfig);
    
    // Create database if it doesn't exist
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();
    
    // Now connect to the specific database
    pool = mysql.createPool(dbConfig);
    
    // Test the connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    logger.info('✅ MySQL database connected successfully');
    
    // Initialize database tables
    await initializeTables();
    
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Initialize database tables
const initializeTables = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Users table
    await connection.execute(`
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

    // Categories table
    await connection.execute(`
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
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
        INDEX idx_slug (slug),
        INDEX idx_parent (parent_id),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Products table
    await connection.execute(`
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
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_category (category_id),
        INDEX idx_active (is_active),
        INDEX idx_featured (is_featured),
        INDEX idx_sku (sku),
        INDEX idx_created_by (created_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Product distributions table
    await connection.execute(`
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
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_seller (product_id, seller_id),
        INDEX idx_product (product_id),
        INDEX idx_seller (seller_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Orders table
    await connection.execute(`
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
        payment_method VARCHAR(100),
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        shipping_address JSON,
        billing_address JSON,
        customer_notes TEXT,
        admin_notes TEXT,
        tracking_number VARCHAR(100),
        estimated_delivery DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_customer (customer_id),
        INDEX idx_seller (seller_id),
        INDEX idx_status (status),
        INDEX idx_order_number (order_number),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Order items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_sku VARCHAR(100),
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        options JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_order (order_id),
        INDEX idx_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Notifications table
    await connection.execute(`
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
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_recipient (recipient_id),
        INDEX idx_type (type),
        INDEX idx_read (is_read),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Analytics table
    await connection.execute(`
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

    // Financial transactions table
    await connection.execute(`
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // User sessions table
    await connection.execute(`
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_token (token(255)),
        INDEX idx_expires (expires_at),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Email verification tokens table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_token (token),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Password reset tokens table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_token (token),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // File uploads table
    await connection.execute(`
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
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_uploaded_by (uploaded_by),
        INDEX idx_status (status),
        INDEX idx_uploaded_at (uploaded_at),
        INDEX idx_mimetype (mimetype)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Fake data configurations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS fake_data_configs (
        id VARCHAR(36) PRIMARY KEY,
        seller_id VARCHAR(36) NOT NULL,
        seller_name VARCHAR(255) NOT NULL,
        analytics JSON NOT NULL,
        metadata JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_seller_id (seller_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create fake stats table for admin overrides
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS seller_fake_stats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          seller_id VARCHAR(255) NOT NULL,
          timeframe ENUM('today', '7days', '30days', 'total') NOT NULL,
          fake_orders INT DEFAULT 0,
          fake_sales DECIMAL(10,2) DEFAULT 0.00,
          fake_revenue DECIMAL(10,2) DEFAULT 0.00,
          fake_products INT DEFAULT 0,
          fake_customers INT DEFAULT 0,
          fake_visitors INT DEFAULT 0,
          fake_followers INT DEFAULT 0,
          fake_rating DECIMAL(3,2) DEFAULT 0.00,
          fake_credit_score INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_seller_timeframe (seller_id, timeframe),
          INDEX idx_seller_id (seller_id),
          INDEX idx_timeframe (timeframe)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      logger.info('✅ Seller fake stats table created');
    } catch (error) {
      logger.error('❌ Error creating seller fake stats table:', error);
    }

    connection.release();
    logger.info('✅ Database tables initialized successfully');
    
  } catch (error) {
    logger.error('❌ Failed to initialize database tables:', error);
    throw error;
  }
};

// Get database connection
const getConnection = async () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return pool.getConnection();
};

// Execute query with connection management
const executeQuery = async (query, params = []) => {
  let connection;
  try {
    // Check if pool exists
    if (!pool) {
      throw new Error('Database pool not initialized. Call connectDB() first.');
    }
    
    connection = await getConnection();
    
    // Test connection before executing query
    await connection.ping();
    
    // Preprocess parameters to ensure proper types for MySQL
    const processedParams = params.map((param, index) => {
      // Handle null/undefined values
      if (param === null || param === undefined) {
        return null;
      }
      
      // Handle Date objects - convert to MySQL DATETIME format
      if (param instanceof Date || (typeof param === 'string' && param.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))) {
        return toMySQLDateTime(param);
      }
      
      // Ensure numbers are properly typed for LIMIT/OFFSET
      if (typeof param === 'number') {
        return param;
      }
      
      // Convert string numbers to actual numbers for LIMIT/OFFSET
      if (typeof param === 'string' && !isNaN(param) && param.trim() !== '') {
        const num = parseInt(param, 10);
        if (!isNaN(num)) {
          return num;
        }
      }
      
      // Ensure boolean values are properly handled
      if (typeof param === 'boolean') {
        return param ? 1 : 0;
      }
      
      // Handle JSON objects/arrays
      if (typeof param === 'object' && param !== null) {
        return JSON.stringify(param);
      }
      
      return param;
    });
    
    // Log the query and params for debugging
    logger.info(`Executing query: ${query}`, { 
      originalParams: params,
      processedParams,
      paramTypes: processedParams.map(p => ({ value: p, type: typeof p, isNaN: typeof p === 'number' ? isNaN(p) : false })),
      paramCount: processedParams.length,
      queryParamCount: (query.match(/\?/g) || []).length
    });
    
    // Validate parameter count before execution
    const queryParamCount = (query.match(/\?/g) || []).length;
    if (queryParamCount !== processedParams.length) {
      throw new Error(`Parameter count mismatch: query expects ${queryParamCount} parameters, but ${processedParams.length} were provided`);
    }
    
    // Try execute first, fallback to query if there are parameter binding issues
    try {
      const [rows] = await connection.execute(query, processedParams);
      return rows;
    } catch (executeError) {
      // If execute fails with parameter binding issues, try query instead
      if (executeError.code === 'ER_WRONG_ARGUMENTS' || executeError.message.includes('mysqld_stmt_execute')) {
        logger.warn('Execute failed, falling back to query:', { error: executeError.message, query });
        const [rows] = await connection.query(query, processedParams);
        return rows;
      }
      throw executeError;
    }
  } catch (error) {
    logger.error('Query execution failed:', {
      error: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      query,
      originalParams: params
    });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Execute transaction
const executeTransaction = async (queries) => {
  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params = [] } of queries) {
      // Preprocess parameters for each query in the transaction
      const processedParams = params.map(param => {
        // Handle null/undefined values
        if (param === null || param === undefined) {
          return null;
        }
        
        // Handle Date objects - convert to MySQL DATETIME format
        if (param instanceof Date || (typeof param === 'string' && param.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))) {
          return toMySQLDateTime(param);
        }
        
        if (typeof param === 'string' && !isNaN(param) && param.trim() !== '') {
          const num = parseInt(param, 10);
          if (!isNaN(num)) {
            return num;
          }
        }
        if (typeof param === 'boolean') {
          return param ? 1 : 0;
        }
        
        // Handle JSON objects/arrays
        if (typeof param === 'object' && param !== null) {
          return JSON.stringify(param);
        }
        
        return param;
      });
      
      // Try execute first, fallback to query if there are parameter binding issues
      try {
        const [rows] = await connection.execute(query, processedParams);
        results.push(rows);
      } catch (executeError) {
        // If execute fails with parameter binding issues, try query instead
        if (executeError.code === 'ER_WRONG_ARGUMENTS' || executeError.message.includes('mysqld_stmt_execute')) {
          logger.warn('Execute failed in transaction, falling back to query:', { error: executeError.message, query });
          const [rows] = await connection.query(query, processedParams);
          results.push(rows);
        } else {
          throw executeError;
        }
      }
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    logger.error('Transaction failed:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Close database connection
const closeDB = async () => {
  if (pool) {
    await pool.end();
    logger.info('✅ Database connection closed');
  }
};

module.exports = {
  connectDB,
  getConnection,
  executeQuery,
  executeTransaction,
  closeDB,
  pool,
  toMySQLDateTime
};
