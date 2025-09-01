#!/usr/bin/env node

/**
 * Check Admin Overrides Table Data
 * 
 * This script checks what data exists in the admin_overrides table
 * and identifies any conflicts that would prevent the schema update.
 */

const { executeQuery, connectDB } = require('./config/database');
const { logger } = require('./utils/logger');

async function checkAdminOverridesData() {
  try {
    console.log('🔍 Checking admin_overrides table data...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully\n');
    
    // Get all data from the table
    const allData = await executeQuery(`
      SELECT 
        id, 
        seller_id, 
        metric_name, 
        metric_period, 
        override_value, 
        period_specific_value, 
        original_value,
        created_at,
        updated_at
      FROM admin_overrides 
      ORDER BY seller_id, metric_name, metric_period
    `);
    
    console.log(`📊 Found ${allData.length} records in admin_overrides table\n`);
    
    if (allData.length === 0) {
      console.log('✅ Table is empty, no conflicts to resolve');
      return;
    }
    
    // Group data by seller_id and metric_name to find duplicates
    const groupedData = {};
    allData.forEach(record => {
      const key = `${record.seller_id}-${record.metric_name}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(record);
    });
    
    // Check for conflicts
    const conflicts = [];
    Object.entries(groupedData).forEach(([key, records]) => {
      if (records.length > 1) {
        // Check if there are multiple records with the same period
        const periodCounts = {};
        records.forEach(record => {
          const period = record.metric_period || 'total';
          periodCounts[period] = (periodCounts[period] || 0) + 1;
        });
        
        const duplicatePeriods = Object.entries(periodCounts)
          .filter(([period, count]) => count > 1)
          .map(([period, count]) => ({ period, count }));
        
        if (duplicatePeriods.length > 0) {
          conflicts.push({
            key,
            records,
            duplicatePeriods
          });
        }
      }
    });
    
    if (conflicts.length === 0) {
      console.log('✅ No conflicts found - table can be updated safely');
      
      // Show sample data
      console.log('\n📋 Sample data:');
      allData.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.seller_id} | ${record.metric_name} | ${record.metric_period} | ${record.override_value}`);
      });
      
      if (allData.length > 5) {
        console.log(`   ... and ${allData.length - 5} more records`);
      }
      
    } else {
      console.log(`❌ Found ${conflicts.length} conflicts that need to be resolved:\n`);
      
      conflicts.forEach((conflict, index) => {
        console.log(`Conflict ${index + 1}: ${conflict.key}`);
        console.log(`   Duplicate periods: ${conflict.duplicatePeriods.map(p => `${p.period} (${p.count} records)`).join(', ')}`);
        console.log('   Records:');
        conflict.records.forEach(record => {
          console.log(`     - ID: ${record.id}, Period: ${record.metric_period || 'total'}, Value: ${record.override_value}`);
        });
        console.log('');
      });
      
      console.log('⚠️ These conflicts must be resolved before updating the schema');
      console.log('   Options:');
      console.log('   1. Delete duplicate records');
      console.log('   2. Update duplicate records to have different periods');
      console.log('   3. Drop and recreate the table');
    }
    
    // Show data distribution
    console.log('\n📊 Data distribution:');
    const sellerCount = new Set(allData.map(r => r.seller_id)).size;
    const metricCount = new Set(allData.map(r => r.metric_name)).size;
    const periodCount = new Set(allData.map(r => r.metric_period || 'total')).size;
    
    console.log(`   Sellers: ${sellerCount}`);
    console.log(`   Metrics: ${metricCount}`);
    console.log(`   Periods: ${periodCount}`);
    
    // Show periods used
    const periods = {};
    allData.forEach(record => {
      const period = record.metric_period || 'total';
      periods[period] = (periods[period] || 0) + 1;
    });
    
    console.log('\n📅 Periods used:');
    Object.entries(periods).forEach(([period, count]) => {
      console.log(`   ${period}: ${count} records`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    throw error;
  }
}

// Run check if this file is executed directly
if (require.main === module) {
  checkAdminOverridesData()
    .then(() => {
      console.log('\n✅ Data check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Data check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkAdminOverridesData };
