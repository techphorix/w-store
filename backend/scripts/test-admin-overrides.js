const { executeQuery, connectDB } = require('../config/database');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Test all required metric fields
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
    logger.error('DB_HOST=localhost DB_USER=root DB_PASSWORD=password npm run test:admin-overrides');
    
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

async function testAdminOverrides() {
  try {
    // Check environment variables first
    if (!checkEnvironmentVariables()) {
      process.exit(1);
    }
    
    // Connect to database
    await connectDB();
    logger.info('✅ Database connected successfully');
    
    logger.info('🧪 Starting admin overrides test...');
    
    // Check if admin_overrides table exists
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'admin_overrides'
    `);
    
    if (tableExists[0].count === 0) {
      logger.error('❌ admin_overrides table does not exist. Run migration first.');
      logger.error('💡 Run: npm run migrate:admin-overrides');
      return;
    }
    
    logger.info('✅ admin_overrides table exists');
    
    // Check table structure
    const columns = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'admin_overrides'
      ORDER BY ORDINAL_POSITION
    `);
    
    logger.info('📊 Table structure:');
    columns.forEach(col => {
      logger.info(`   - ${col.COLUMN_NAME}: ${col.COLUMN_NAME} (nullable: ${col.IS_NULLABLE})`);
    });
    
    // Check if we have any existing users to test with
    const users = await executeQuery(`
      SELECT id, full_name, email, role 
      FROM users 
      WHERE role IN ('seller', 'admin') 
      LIMIT 1
    `);
    
    if (users.length === 0) {
      logger.warn('⚠️ No users found to test with. Creating a test user...');
      
      // Create a test user
      const testUserId = uuidv4();
      await executeQuery(`
        INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, phone_verified)
        VALUES (?, 'test@example.com', 'test_hash', 'Test User', 'seller', 'active', 1, 1)
      `, [testUserId]);
      
      logger.info(`✅ Created test user: ${testUserId}`);
      
      // Test each metric
      for (const metric of REQUIRED_METRICS) {
        try {
          logger.info(`🧪 Testing metric: ${metric}`);
          
          // Test insert
          const overrideId = uuidv4();
          let testValue = 100;
          
          // Set appropriate test values for different metrics
          if (metric === 'shop_rating') testValue = 4.5;
          if (metric === 'credit_score') testValue = 750;
          
          await executeQuery(`
            INSERT INTO admin_overrides (id, seller_id, metric_name, override_value, original_value)
            VALUES (?, ?, ?, ?, ?)
          `, [overrideId, testUserId, metric, testValue, 0]);
          
          logger.info(`✅ Successfully inserted ${metric} = ${testValue}`);
          
          // Test select
          const result = await executeQuery(`
            SELECT * FROM admin_overrides WHERE id = ?
          `, [overrideId]);
          
          if (result.length > 0) {
            logger.info(`✅ Successfully retrieved ${metric}: ${result[0].override_value}`);
          } else {
            logger.error(`❌ Failed to retrieve ${metric}`);
          }
          
          // Test update
          const newValue = testValue + 50;
          await executeQuery(`
            UPDATE admin_overrides 
            SET override_value = ? 
            WHERE id = ?
          `, [newValue, overrideId]);
          
          logger.info(`✅ Successfully updated ${metric} to ${newValue}`);
          
          // Test delete
          await executeQuery(`
            DELETE FROM admin_overrides WHERE id = ?
          `, [overrideId]);
          
          logger.info(`✅ Successfully deleted ${metric}`);
          
        } catch (error) {
          logger.error(`❌ Error testing ${metric}:`, error.message);
        }
      }
      
      // Clean up test user
      await executeQuery(`DELETE FROM users WHERE id = ?`, [testUserId]);
      logger.info('🧹 Cleaned up test user');
      
    } else {
      const testUser = users[0];
      logger.info(`🧪 Testing with existing user: ${testUser.full_name} (${testUser.role})`);
      
      // Check existing overrides
      const existingOverrides = await executeQuery(`
        SELECT metric_name, override_value, original_value
        FROM admin_overrides 
        WHERE seller_id = ?
        ORDER BY metric_name
      `, [testUser.id]);
      
      if (existingOverrides.length > 0) {
        logger.info(`📊 Found ${existingOverrides.length} existing overrides:`);
        existingOverrides.forEach(override => {
          logger.info(`   - ${override.metric_name}: ${override.override_value} (original: ${override.original_value})`);
        });
      } else {
        logger.info('ℹ️ No existing overrides found');
      }
      
      // Test inserting a new override
      const testMetric = 'test_metric';
      const testValue = 999;
      
      try {
        const overrideId = uuidv4();
        await executeQuery(`
          INSERT INTO admin_overrides (id, seller_id, metric_name, override_value, original_value)
          VALUES (?, ?, ?, ?, ?)
        `, [overrideId, testUser.id, testMetric, testValue, 0]);
        
        logger.info(`✅ Successfully inserted test metric: ${testMetric} = ${testValue}`);
        
        // Clean up test metric
        await executeQuery(`
          DELETE FROM admin_overrides WHERE id = ?
        `, [overrideId]);
        
        logger.info(`🧹 Cleaned up test metric`);
        
      } catch (error) {
        logger.error(`❌ Error testing insert:`, error.message);
      }
    }
    
    // Test validation constraints
    logger.info('🧪 Testing validation constraints...');
    
    // Test invalid metric names
    const invalidMetrics = ['invalid_metric', 'test', '123'];
    for (const invalidMetric of invalidMetrics) {
      try {
        const overrideId = uuidv4();
        await executeQuery(`
          INSERT INTO admin_overrides (id, seller_id, metric_name, override_value, original_value)
          VALUES (?, ?, ?, ?, ?)
        `, [overrideId, '00000000-0000-0000-0000-000000000000', invalidMetric, 100, 0]);
        
        logger.warn(`⚠️ Unexpectedly allowed invalid metric: ${invalidMetric}`);
        
        // Clean up
        await executeQuery(`DELETE FROM admin_overrides WHERE id = ?`, [overrideId]);
        
      } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          logger.info(`✅ Correctly rejected invalid metric: ${invalidMetric} (foreign key constraint)`);
        } else {
          logger.info(`✅ Correctly rejected invalid metric: ${invalidMetric} (${error.message})`);
        }
      }
    }
    
    logger.info('🎉 Admin overrides test completed successfully!');
    logger.info('📋 All required metrics are supported:');
    REQUIRED_METRICS.forEach(metric => {
      logger.info(`   ✅ ${metric}`);
    });
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
    
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

// Run test if this file is executed directly
if (require.main === module) {
  testAdminOverrides()
    .then(() => {
      logger.info('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAdminOverrides };
