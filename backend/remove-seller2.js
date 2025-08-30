#!/usr/bin/env node

/**
 * Remove Seller 2 from Database
 * 
 * This script removes seller ID: e2c5a8c4-5f6f-4878-91de-9c16f33f0693
 * and all associated data from the database.
 * 
 * Usage: node remove-seller2.js [host] [user] [password] [database]
 * Example: node remove-seller2.js localhost root mypassword wstore_db
 */

const mysql = require('mysql2/promise');

// Get database credentials from command line arguments
const [,, host = 'localhost', user = 'root', password = '', database = 'wstore_db'] = process.argv;

// Seller ID to remove
const SELLER_ID_TO_REMOVE = 'e2c5a8c4-5f6f-4878-91de-9c16f33f0693';

async function removeSeller2() {
  let connection;
  
  try {
    console.log('🗑️  Starting removal of Seller 2...\n');
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
    
    // Start transaction
    await connection.beginTransaction();
    console.log('🔄 Transaction started\n');
    
    // Check what data exists for seller 2
    console.log('🔍 Checking existing data for seller 2...');
    
    const [overrides] = await connection.execute(`
      SELECT COUNT(*) as count FROM admin_overrides WHERE seller_id = ?
    `, [SELLER_ID_TO_REMOVE]);
    
    const [users] = await connection.execute(`
      SELECT id, email, role FROM users WHERE id = ?
    `, [SELLER_ID_TO_REMOVE]);
    
    console.log(`📊 Found ${overrides[0].count} admin overrides for seller 2`);
    if (users.length > 0) {
      console.log(`📊 Found user account: ${users[0].email} (${users[0].role})`);
    }
    
    // Remove admin overrides
    console.log('\n🗑️  Removing admin overrides...');
    const [overridesResult] = await connection.execute(`
      DELETE FROM admin_overrides WHERE seller_id = ?
    `, [SELLER_ID_TO_REMOVE]);
    console.log(`✅ Removed ${overridesResult.affectedRows} admin overrides`);
    
    // Remove orders (if table exists)
    try {
      const [ordersResult] = await connection.execute(`
        DELETE FROM orders WHERE seller_id = ?
      `, [SELLER_ID_TO_REMOVE]);
      console.log(`✅ Removed ${ordersResult.affectedRows} orders`);
    } catch (error) {
      console.log('ℹ️  Orders table not found or no orders to remove');
    }
    
    // Remove products (if table exists)
    try {
      const [productsResult] = await connection.execute(`
        DELETE FROM products WHERE seller_id = ?
      `, [SELLER_ID_TO_REMOVE]);
      console.log(`✅ Removed ${productsResult.affectedRows} products`);
    } catch (error) {
      console.log('ℹ️  Products table not found or no products to remove');
    }
    
    // Remove user account
    console.log('\n🗑️  Removing user account...');
    const [userResult] = await connection.execute(`
      DELETE FROM users WHERE id = ?
    `, [SELLER_ID_TO_REMOVE]);
    console.log(`✅ Removed ${userResult.affectedRows} user account`);
    
    // Verify removal
    console.log('\n🔍 Verifying removal...');
    const [remainingOverrides] = await connection.execute(`
      SELECT COUNT(*) as count FROM admin_overrides WHERE seller_id = ?
    `, [SELLER_ID_TO_REMOVE]);
    
    const [remainingUsers] = await connection.execute(`
      SELECT COUNT(*) as count FROM users WHERE id = ?
    `, [SELLER_ID_TO_REMOVE]);
    
    if (remainingOverrides[0].count === 0 && remainingUsers[0].count === 0) {
      console.log('✅ Seller 2 completely removed from database');
    } else {
      console.log('⚠️  Some data may still exist for seller 2');
    }
    
    // Show remaining data for seller 1
    console.log('\n📊 Remaining data for seller 1:');
    const [seller1Data] = await connection.execute(`
      SELECT metric_name, override_value, created_at 
      FROM admin_overrides 
      WHERE seller_id = 'e7503319-64ce-4bc2-b0bb-8a97a06cb99e' 
      ORDER BY metric_name
    `);
    
    if (seller1Data.length > 0) {
      seller1Data.forEach(override => {
        console.log(`   - ${override.metric_name}: ${override.override_value}`);
      });
    } else {
      console.log('   No admin overrides found for seller 1');
    }
    
    // Commit transaction
    await connection.commit();
    console.log('\n✅ Transaction committed successfully');
    console.log('🎉 Seller 2 removal completed!');
    
  } catch (error) {
    // Rollback on error
    if (connection) {
      await connection.rollback();
      console.log('\n❌ Transaction rolled back due to error');
    }
    
    console.error('❌ Error removing seller 2:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔐 Database access denied. Please check your credentials.');
      console.error('Usage: node remove-seller2.js [host] [user] [password] [database]');
      console.error('Example: node remove-seller2.js localhost root mypassword wstore_db');
    }
    
    throw error;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  removeSeller2()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { removeSeller2 };
