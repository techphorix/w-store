#!/usr/bin/env node

/**
 * Cleanup Invalid Admin Overrides
 * 
 * This script removes any admin overrides that are not in the REQUIRED_METRICS list.
 * This helps clean up old or invalid overrides that might be causing issues.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Required metrics that are allowed
const REQUIRED_METRICS = [
  'orders_sold',
  'total_sales', 
  'profit_forecast',
  'visitors',
  'shop_followers',
  'shop_rating',
  'credit_score'
];

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'w_store',
  port: process.env.DB_PORT || 3306
};

async function cleanupInvalidOverrides() {
  let connection;
  
  try {
    console.log('🧹 Starting cleanup of invalid admin overrides...\n');
    
    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully\n');
    
    // Check if admin_overrides table exists
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'admin_overrides'
    `, [dbConfig.database]);
    
    if (tables[0].count === 0) {
      console.log('❌ admin_overrides table does not exist. Nothing to clean up.');
      return;
    }
    
    // Get all current overrides
    console.log('📊 Fetching current overrides...');
    const [overrides] = await connection.execute(`
      SELECT id, seller_id, metric_name, override_value, created_at 
      FROM admin_overrides 
      ORDER BY created_at DESC
    `);
    
    if (overrides.length === 0) {
      console.log('ℹ️ No overrides found. Nothing to clean up.');
      return;
    }
    
    console.log(`📋 Found ${overrides.length} overrides in database:\n`);
    
    // Group overrides by metric name
    const metricCounts = {};
    overrides.forEach(override => {
      metricCounts[override.metric_name] = (metricCounts[override.metric_name] || 0) + 1;
    });
    
    Object.entries(metricCounts).forEach(([metric, count]) => {
      const status = REQUIRED_METRICS.includes(metric) ? '✅' : '❌';
      console.log(`${status} ${metric}: ${count} override(s)`);
    });
    
    // Find invalid metrics
    const invalidMetrics = Object.keys(metricCounts).filter(
      metric => !REQUIRED_METRICS.includes(metric)
    );
    
    if (invalidMetrics.length === 0) {
      console.log('\n🎉 All overrides are valid! No cleanup needed.');
      return;
    }
    
    console.log(`\n⚠️  Found ${invalidMetrics.length} invalid metric(s): ${invalidMetrics.join(', ')}`);
    
    // Count overrides to be deleted
    let totalToDelete = 0;
    invalidMetrics.forEach(metric => {
      totalToDelete += metricCounts[metric];
    });
    
    console.log(`🗑️  Will delete ${totalToDelete} invalid override(s)`);
    
    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\n❓ Proceed with deletion? (y/N): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Cleanup cancelled by user.');
      return;
    }
    
    // Delete invalid overrides
    console.log('\n🗑️  Deleting invalid overrides...');
    
    for (const metric of invalidMetrics) {
      const [result] = await connection.execute(`
        DELETE FROM admin_overrides 
        WHERE metric_name = ?
      `, [metric]);
      
      console.log(`✅ Deleted ${result.affectedRows} override(s) for ${metric}`);
    }
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const [remainingOverrides] = await connection.execute(`
      SELECT metric_name, COUNT(*) as count 
      FROM admin_overrides 
      GROUP BY metric_name
    `);
    
    console.log('\n📊 Remaining overrides after cleanup:');
    remainingOverrides.forEach(row => {
      console.log(`✅ ${row.metric_name}: ${row.count} override(s)`);
    });
    
    console.log('\n🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Database access denied. Please check:');
      console.log('   1. Database credentials in .env file');
      console.log('   2. User permissions for the database');
      console.log('   3. Database is running and accessible');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection refused. Please check:');
      console.log('   1. Database service is running');
      console.log('   2. Database host and port are correct');
      console.log('   3. Firewall settings allow the connection');
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupInvalidOverrides()
    .then(() => {
      console.log('\n✨ Cleanup script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupInvalidOverrides };
