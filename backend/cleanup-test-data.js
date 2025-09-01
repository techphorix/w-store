#!/usr/bin/env node

/**
 * Cleanup Test Data
 * 
 * This script removes test data from the admin_overrides table
 * that would prevent the table recreation from working.
 */

const { executeQuery, connectDB } = require('./config/database');
const { logger } = require('./utils/logger');

async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up test data from admin_overrides table...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully\n');
    
    // Find test records (records with non-existent seller IDs)
    const testRecords = await executeQuery(`
      SELECT ao.id, ao.seller_id, ao.metric_name, ao.metric_period
      FROM admin_overrides ao
      LEFT JOIN users u ON ao.seller_id = u.id
      WHERE u.id IS NULL
    `);
    
    if (testRecords.length === 0) {
      console.log('✅ No test data found to clean up');
      return;
    }
    
    console.log(`📋 Found ${testRecords.length} test records to remove:`);
    testRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}, Seller: ${record.seller_id}, Metric: ${record.metric_name}, Period: ${record.metric_period}`);
    });
    
    // Remove test records
    console.log('\n🗑️ Removing test records...');
    for (const record of testRecords) {
      await executeQuery('DELETE FROM admin_overrides WHERE id = ?', [record.id]);
      console.log(`   ✅ Removed test record: ${record.id}`);
    }
    
    // Verify cleanup
    const remainingTestRecords = await executeQuery(`
      SELECT ao.id, ao.seller_id, ao.metric_name, ao.metric_period
      FROM admin_overrides ao
      LEFT JOIN users u ON ao.seller_id = u.id
      WHERE u.id IS NULL
    `);
    
    if (remainingTestRecords.length === 0) {
      console.log('\n✅ All test data successfully cleaned up');
    } else {
      console.log(`\n⚠️ ${remainingTestRecords.length} test records still remain`);
    }
    
    // Show remaining valid records
    const validRecords = await executeQuery(`
      SELECT ao.id, ao.seller_id, ao.metric_name, ao.metric_period, u.full_name
      FROM admin_overrides ao
      JOIN users u ON ao.seller_id = u.id
      ORDER BY ao.seller_id, ao.metric_name, ao.metric_period
    `);
    
    console.log(`\n📊 Remaining valid records: ${validRecords.length}`);
    if (validRecords.length > 0) {
      console.log('📋 Sample of valid records:');
      validRecords.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.full_name} | ${record.metric_name} | ${record.metric_period}`);
      });
      if (validRecords.length > 5) {
        console.log(`   ... and ${validRecords.length - 5} more records`);
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('\n✅ Test data cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test data cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTestData };
