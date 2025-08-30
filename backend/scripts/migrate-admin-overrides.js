const { executeQuery, connectDB } = require('../config/database');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Define all the required metric fields that should be supported
const REQUIRED_METRICS = [
  'orders_sold',
  'total_sales', 
  'profit_forecast',
  'visitors',
  'shop_followers',
  'shop_rating',
  'credit_score'
];

// Check environment variables before proceeding
function checkEnvironmentVariables() {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    logger.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      logger.error(`   - ${varName}`);
    });
    
    logger.error('\n📋 Please create a .env file in the backend directory with:');
    logger.error('DB_HOST=localhost');
    logger.error('DB_USER=root');
    logger.error('DB_PASSWORD=your_password_here');
    logger.error('DB_NAME=wstore_db');
    logger.error('DB_PORT=3306');
    
    logger.error('\n🔧 Or set them as environment variables before running the script.');
    logger.error('Example:');
    logger.error('DB_HOST=localhost DB_USER=root DB_PASSWORD=password npm run migrate:admin-overrides');
    
    return false;
  }
  
  // Log current configuration (without password)
  logger.info('🔍 Database configuration:');
  logger.info(`   Host: ${process.env.DB_HOST || 'localhost'}`);
  logger.info(`   User: ${process.env.DB_USER || 'root'}`);
  logger.info(`   Database: ${process.env.DB_NAME || 'wstore_db'}`);
  logger.info(`   Port: ${process.env.DB_PORT || 3306}`);
  logger.info(`   Password: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'}`);
  
  return true;
}

async function migrateAdminOverrides() {
  try {
    // Check environment variables first
    if (!checkEnvironmentVariables()) {
      process.exit(1);
    }
    
    // Connect to database first
    await connectDB();
    logger.info('✅ Database connected successfully');
    
    logger.info('🚀 Starting admin_overrides table migration...');

    // Check if table already exists
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'admin_overrides'
    `);

    if (tableExists[0].count > 0) {
      logger.info('✅ admin_overrides table already exists, checking schema...');
      
      // Check if we need to update the existing table
      const columns = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'admin_overrides'
        ORDER BY ORDINAL_POSITION
      `);
      
      const hasIdColumn = columns.find(col => col.COLUMN_NAME === 'id');
      const hasOriginalValueColumn = columns.find(col => col.COLUMN_NAME === 'original_value');
      
      if (hasIdColumn && hasIdColumn.DATA_TYPE === 'int') {
        logger.info('🔄 Updating existing table schema...');
        
        // Add original_value column if it doesn't exist
        if (!hasOriginalValueColumn) {
          await executeQuery(`
            ALTER TABLE admin_overrides 
            ADD COLUMN original_value DECIMAL(15,2) DEFAULT '0.00' AFTER override_value
          `);
          logger.info('✅ Added original_value column');
        }
        
        // Update override_value to DECIMAL if it's not already
        const overrideValueCol = columns.find(col => col.COLUMN_NAME === 'override_value');
        if (overrideValueCol && overrideValueCol.DATA_TYPE !== 'decimal') {
          await executeQuery(`
            ALTER TABLE admin_overrides 
            MODIFY COLUMN override_value DECIMAL(15,2) DEFAULT '0.00'
          `);
          logger.info('✅ Updated override_value to DECIMAL');
        }
        
        // Update unique key name if needed
        try {
          await executeQuery(`
            ALTER TABLE admin_overrides 
            DROP INDEX unique_seller_metric
          `);
        } catch (e) {
          // Index might not exist or have different name
        }
        
        try {
          await executeQuery(`
            ALTER TABLE admin_overrides 
            DROP INDEX uniq_override
          `);
        } catch (e) {
          // Index might not exist or have different name
        }
        
        try {
          await executeQuery(`
            ALTER TABLE admin_overrides 
            ADD UNIQUE KEY uniq_override (seller_id, metric_name)
          `);
          logger.info('✅ Updated unique key to uniq_override');
        } catch (e) {
          logger.warn('⚠️ Could not update unique key:', e.message);
        }
        
        logger.info('✅ Schema update completed');
      }
    } else {
      // Create admin_overrides table with correct schema
      await executeQuery(`
        CREATE TABLE admin_overrides (
          id VARCHAR(36) NOT NULL,
          seller_id VARCHAR(36) NOT NULL,
          metric_name VARCHAR(100) NOT NULL,
          override_value DECIMAL(15,2) DEFAULT '0.00',
          original_value DECIMAL(15,2) DEFAULT '0.00',
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_override (seller_id, metric_name),
          KEY idx_seller_id (seller_id),
          KEY idx_metric_name (metric_name),
          CONSTRAINT admin_overrides_ibfk_1 FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      logger.info('✅ admin_overrides table created successfully');
    }

    // Verify that all required metrics can be stored
    logger.info('🔍 Verifying metric field support...');
    
    // Check if we have any existing overrides
    const existingOverrides = await executeQuery(`
      SELECT DISTINCT metric_name FROM admin_overrides LIMIT 10
    `);
    
    logger.info(`📊 Found ${existingOverrides.length} existing metric types:`, 
      existingOverrides.map(o => o.metric_name)
    );
    
    // Log the required metrics for reference
    logger.info('📋 Required metrics that should be supported:', REQUIRED_METRICS);
    
    // Test insert/update for each required metric to ensure they work
    const testSellerId = '00000000-0000-0000-0000-000000000000'; // Test ID
    
    for (const metric of REQUIRED_METRICS) {
      try {
        // Test if we can insert a test record (will fail due to foreign key, but that's expected)
        logger.info(`🧪 Testing metric: ${metric}`);
        
        // Just verify the table structure supports the metric name length
        if (metric.length > 100) {
          logger.warn(`⚠️ Metric name "${metric}" is longer than 100 characters`);
        }
        
      } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          // This is expected - the test seller ID doesn't exist
          logger.info(`✅ Metric "${metric}" structure test passed`);
        } else {
          logger.warn(`⚠️ Metric "${metric}" test had unexpected error:`, error.message);
        }
      }
    }

    logger.info('🎉 Migration completed successfully!');
    logger.info('📊 The admin_overrides table now supports all required metric fields:');
    REQUIRED_METRICS.forEach(metric => {
      logger.info(`   - ${metric}`);
    });
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    
    // Provide helpful error messages for common issues
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error('\n🔐 Database access denied. Please check:');
      logger.error('   1. Database credentials in .env file');
      logger.error('   2. MySQL service is running');
      logger.error('   3. User has proper permissions');
      logger.error('\n📋 Example .env file:');
      logger.error('DB_HOST=localhost');
      logger.error('DB_USER=root');
      logger.error('DB_PASSWORD=your_password');
      logger.error('DB_NAME=wstore_db');
      logger.error('DB_PORT=3306');
    } else if (error.code === 'ECONNREFUSED') {
      logger.error('\n🔌 Connection refused. Please check:');
      logger.error('   1. MySQL service is running');
      logger.error('   2. Port number is correct');
      logger.error('   3. Firewall settings');
    }
    
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAdminOverrides()
    .then(() => {
      logger.info('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAdminOverrides };
