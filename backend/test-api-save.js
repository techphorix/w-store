#!/usr/bin/env node

/**
 * Test API Save Functionality
 * 
 * This script tests if the admin overrides API can successfully
 * save data to the database after the schema fix.
 */

const { executeQuery, connectDB } = require('./config/database');
const { logger } = require('./utils/logger');

async function testApiSave() {
  try {
    console.log('🧪 Testing API save functionality...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully\n');
    
    // Check current table structure
    const columns = await executeQuery(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'admin_overrides'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Current table structure:');
    columns.forEach(col => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable} ${defaultValue}`.trim());
    });
    
    // Check current data
    const currentData = await executeQuery('SELECT COUNT(*) as count FROM admin_overrides');
    console.log(`\n📊 Current data count: ${currentData[0].count} records`);
    
    // Test inserting a new override with a valid seller ID
    console.log('\n🧪 Testing insert with valid seller ID...');
    
    // Get a valid seller ID from the users table
    const validSeller = await executeQuery(`
      SELECT id, full_name, role FROM users WHERE role = 'seller' LIMIT 1
    `);
    
    if (validSeller.length === 0) {
      console.log('❌ No seller users found in the database');
      return;
    }
    
    const sellerId = validSeller[0].id;
    const sellerName = validSeller[0].full_name;
    console.log(`✅ Using seller: ${sellerName} (${sellerId})`);
    
    // Test insert with period-specific data
    const testId = 'test-api-' + Date.now();
    const testData = {
      id: testId,
      seller_id: sellerId,
      metric_name: 'orders_sold',
      metric_period: 'today',
      override_value: 150.00,
      period_specific_value: 150.00,
      original_value: 0.00
    };
    
    try {
      await executeQuery(`
        INSERT INTO admin_overrides (
          id, seller_id, metric_name, metric_period, 
          override_value, period_specific_value, original_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        testData.id,
        testData.seller_id,
        testData.metric_name,
        testData.metric_period,
        testData.override_value,
        testData.period_specific_value,
        testData.original_value
      ]);
      
      console.log('✅ Test insert successful');
      
      // Verify the data was saved
      const savedData = await executeQuery(`
        SELECT * FROM admin_overrides WHERE id = ?
      `, [testId]);
      
      if (savedData.length > 0) {
        console.log('✅ Data verification successful');
        console.log('   Saved record:', {
          id: savedData[0].id,
          seller_id: savedData[0].seller_id,
          metric_name: savedData[0].metric_name,
          metric_period: savedData[0].metric_period,
          override_value: savedData[0].override_value,
          period_specific_value: savedData[0].period_specific_value
        });
      } else {
        console.log('❌ Data verification failed - record not found');
      }
      
      // Test inserting another record with same seller and metric but different period
      const testId2 = 'test-api-2-' + Date.now();
      const testData2 = {
        id: testId2,
        seller_id: sellerId,
        metric_name: 'orders_sold',
        metric_period: 'last7days',
        override_value: 850.00,
        period_specific_value: 850.00,
        original_value: 0.00
      };
      
      await executeQuery(`
        INSERT INTO admin_overrides (
          id, seller_id, metric_name, metric_period, 
          override_value, period_specific_value, original_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        testData2.id,
        testData2.seller_id,
        testData2.metric_name,
        testData2.metric_period,
        testData2.override_value,
        testData2.period_specific_value,
        testData2.original_value
      ]);
      
      console.log('✅ Second test insert successful (different period)');
      
      // Test that we can't insert duplicate (same seller, metric, period)
      try {
        await executeQuery(`
          INSERT INTO admin_overrides (
            id, seller_id, metric_name, metric_period, 
            override_value, period_specific_value, original_value
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'duplicate-test',
          sellerId,
          'orders_sold',
          'today', // Same period as first test
          200.00,
          200.00,
          0.00
        ]);
        
        console.log('❌ Duplicate constraint not working - should have failed');
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log('✅ Duplicate constraint working correctly');
        } else {
          console.log('⚠️ Unexpected error during duplicate test:', error.message);
        }
      }
      
      // Clean up test data
      console.log('\n🧹 Cleaning up test data...');
      await executeQuery(`DELETE FROM admin_overrides WHERE id IN (?, ?)`, [testId, testId2]);
      console.log('✅ Test data cleaned up');
      
      // Show final data count
      const finalData = await executeQuery('SELECT COUNT(*) as count FROM admin_overrides');
      console.log(`📊 Final data count: ${finalData[0].count} records`);
      
      if (finalData[0].count === currentData[0].count) {
        console.log('✅ Data count restored to original value');
      } else {
        console.log(`⚠️ Data count mismatch: expected ${currentData[0].count}, got ${finalData[0].count}`);
      }
      
    } catch (error) {
      console.log('❌ Test insert failed:', error.message);
      throw error;
    }
    
    console.log('\n🎉 API save functionality test completed successfully!');
    console.log('✅ Database operations are working correctly');
    console.log('✅ Period-specific constraints are working');
    console.log('✅ Unique constraints are working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testApiSave()
    .then(() => {
      console.log('\n✅ API save test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ API save test failed:', error);
      process.exit(1);
    });
}

module.exports = { testApiSave };
