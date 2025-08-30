#!/usr/bin/env node

/**
 * Quick Recreate Admin Overrides
 * 
 * Usage: node quick-recreate-overrides.js [host] [user] [password] [database]
 * Example: node quick-recreate-overrides.js localhost root mypassword wstore_db
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Get database credentials from command line arguments
const [,, host = 'localhost', user = 'root', password = '', database = 'wstore_db'] = process.argv;

// Configuration
const SELLER_ID = 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e';
const OVERRIDE_VALUES = {
  'orders_sold': 110,
  'total_sales': 1110,
  'profit_forecast': 111140,
  'visitors': 445420,
  'shop_followers': 100,
  'shop_rating': 4.2,
  'credit_score': 300
};

async function quickRecreateOverrides() {
  let connection;
  
  try {
    console.log('🚀 Quick Recreate Admin Overrides\n');
    console.log('📊 Database Configuration:');
    console.log(`   Host: ${host}`);
    console.log(`   User: ${user}`);
    console.log(`   Database: ${database}`);
    console.log(`   Password: ${password ? '***SET***' : 'NOT SET'}\n`);
    
    // Create connection
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: 3306
    });
    
    console.log('✅ Database connected successfully\n');
    
    // Check if admin_overrides table exists
    console.log('🔍 Checking admin_overrides table...');
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name = 'admin_overrides'
    `, [database]);
    
    if (tables[0].count === 0) {
      console.log('❌ admin_overrides table does not exist!');
      console.log('Please run the migration script first: npm run migrate:admin-overrides');
      return;
    }
    
    console.log('✅ admin_overrides table exists\n');
    
    // Check if seller exists
    console.log('🔍 Checking if seller exists...');
    const [sellers] = await connection.execute(`
      SELECT id, email FROM users WHERE id = ?
    `, [SELLER_ID]);
    
    if (sellers.length === 0) {
      console.log('❌ Seller not found with ID:', SELLER_ID);
      console.log('Please update the SELLER_ID in this script to a valid seller ID');
      return;
    }
    
    console.log('✅ Seller found:', sellers[0].email);
    console.log('   ID:', SELLER_ID, '\n');
    
    // Clear existing overrides for this seller
    console.log('🧹 Clearing existing overrides...');
    await connection.execute(`
      DELETE FROM admin_overrides WHERE seller_id = ?
    `, [SELLER_ID]);
    console.log('✅ Existing overrides cleared\n');
    
    // Insert new overrides
    console.log('📝 Inserting new admin overrides...');
    
    for (const [metricName, value] of Object.entries(OVERRIDE_VALUES)) {
      const overrideId = uuidv4();
      
      try {
        await connection.execute(`
          INSERT INTO admin_overrides (
            id, seller_id, metric_name, override_value, original_value, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `, [overrideId, SELLER_ID, metricName, value, 0]);
        
        console.log(`✅ Inserted: ${metricName} = ${value}`);
      } catch (error) {
        console.log(`❌ Failed to insert ${metricName}:`, error.message);
      }
    }
    
    // Verify the inserts
    console.log('\n🔍 Verifying inserted overrides...');
    const [insertedOverrides] = await connection.execute(`
      SELECT metric_name, override_value, created_at 
      FROM admin_overrides 
      WHERE seller_id = ? 
      ORDER BY metric_name
    `, [SELLER_ID]);
    
    console.log(`\n📊 Successfully created ${insertedOverrides.length} overrides:`);
    insertedOverrides.forEach(override => {
      console.log(`   - ${override.metric_name}: ${override.override_value}`);
    });
    
    console.log('\n🎉 Admin overrides recreation completed successfully!');
    console.log('🔄 Now refresh your seller dashboard to see the values');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔐 Database access denied. Please check your credentials.');
      console.error('Usage: node quick-recreate-overrides.js [host] [user] [password] [database]');
      console.error('Example: node quick-recreate-overrides.js localhost root mypassword wstore_db');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔌 Connection refused. Please check if MySQL is running.');
    }
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
quickRecreateOverrides();
