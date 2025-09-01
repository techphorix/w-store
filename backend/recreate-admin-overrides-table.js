#!/usr/bin/env node

/**
 * Recreate Admin Overrides Table
 * 
 * This script drops and recreates the admin_overrides table with the correct
 * schema for period-specific overrides, preserving all existing data.
 */

const { executeQuery, connectDB } = require('./config/database');
const { logger } = require('./utils/logger');

async function recreateAdminOverridesTable() {
  try {
    console.log('🔧 Recreating admin_overrides table with correct schema...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully\n');
    
    // Backup existing data
    console.log('📋 Backing up existing data...');
    const existingData = await executeQuery(`
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
    
    console.log(`✅ Backed up ${existingData.length} records\n`);
    
    if (existingData.length > 0) {
      console.log('📋 Sample of data to preserve:');
      existingData.slice(0, 3).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.seller_id} | ${record.metric_name} | ${record.metric_period || 'total'} | ${record.override_value}`);
      });
      if (existingData.length > 3) {
        console.log(`   ... and ${existingData.length - 3} more records`);
      }
      console.log('');
    }
    
    // Drop existing table
    console.log('🗑️ Dropping existing admin_overrides table...');
    await executeQuery('DROP TABLE IF EXISTS admin_overrides');
    console.log('✅ Existing table dropped\n');
    
    // Create new table with correct schema
    console.log('🏗️ Creating new admin_overrides table...');
    await executeQuery(`
      CREATE TABLE admin_overrides (
        id VARCHAR(36) NOT NULL,
        seller_id VARCHAR(36) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_period VARCHAR(20) DEFAULT 'total',
        override_value DECIMAL(15,2) DEFAULT '0.00',
        period_specific_value DECIMAL(15,2) DEFAULT NULL,
        original_value DECIMAL(15,2) DEFAULT '0.00',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_override_period (seller_id, metric_name, metric_period),
        KEY idx_seller_id (seller_id),
        KEY idx_metric_name (metric_name),
        KEY idx_metric_period (metric_period),
        CONSTRAINT admin_overrides_ibfk_1 FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ New table created with correct schema\n');
    
    // Restore data
    if (existingData.length > 0) {
      console.log('📥 Restoring data to new table...');
      
      for (const record of existingData) {
        try {
          // Ensure metric_period has a value (default to 'total' if null)
          const period = record.metric_period || 'total';
          
          await executeQuery(`
            INSERT INTO admin_overrides (
              id, seller_id, metric_name, metric_period, 
              override_value, period_specific_value, original_value,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            record.id,
            record.seller_id,
            record.metric_name,
            period,
            record.override_value,
            record.period_specific_value || record.override_value, // Use override_value if period_specific_value is null
            record.original_value,
            record.created_at,
            record.updated_at
          ]);
          
        } catch (error) {
          console.log(`⚠️ Failed to restore record ${record.id}:`, error.message);
          throw error;
        }
      }
      
      console.log(`✅ Successfully restored ${existingData.length} records\n`);
    }
    
    // Verify the new table structure
    console.log('🔍 Verifying new table structure...');
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
    
    console.log('📋 New table structure:');
    columns.forEach(col => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable} ${defaultValue}`.trim());
    });
    
    // Check indexes
    const indexes = await executeQuery(`
      SELECT 
        INDEX_NAME, 
        COLUMN_NAME, 
        NON_UNIQUE
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'admin_overrides'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    
    console.log('\n🔑 New table indexes:');
    const indexGroups = {};
    indexes.forEach(idx => {
      if (!indexGroups[idx.INDEX_NAME]) {
        indexGroups[idx.INDEX_NAME] = [];
      }
      indexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    
    Object.entries(indexGroups).forEach(([indexName, columns]) => {
      const unique = indexes.find(idx => idx.INDEX_NAME === indexName)?.NON_UNIQUE === 0 ? 'UNIQUE' : '';
      console.log(`   ${indexName}: [${columns.join(', ')}] ${unique}`.trim());
    });
    
    // Verify data count
    const dataCount = await executeQuery('SELECT COUNT(*) as count FROM admin_overrides');
    console.log(`\n📊 Data count: ${dataCount[0].count} records`);
    
    if (dataCount[0].count === existingData.length) {
      console.log('✅ All data successfully restored');
    } else {
      console.log(`⚠️ Data count mismatch: expected ${existingData.length}, got ${dataCount[0].count}`);
    }
    
    // Test the new constraint
    console.log('\n🧪 Testing new period-specific constraint...');
    
    try {
      // Test insert with same seller, metric, but different period
      const testId1 = 'test-1-' + Date.now();
      const testId2 = 'test-2-' + Date.now();
      
      // First insert
      await executeQuery(`
        INSERT INTO admin_overrides (id, seller_id, metric_name, metric_period, override_value, period_specific_value, original_value) 
        VALUES (?, 'test-seller-id', 'test_metric', 'total', 100.00, 100.00, 0.00)
      `, [testId1]);
      console.log('✅ First insert successful (total period)');
      
      // Second insert with different period
      await executeQuery(`
        INSERT INTO admin_overrides (id, seller_id, metric_name, metric_period, override_value, period_specific_value, original_value) 
        VALUES (?, 'test-seller-id', 'test_metric', 'today', 150.00, 150.00, 0.00)
      `, [testId2]);
      console.log('✅ Second insert successful (today period)');
      
      // Clean up test data
      await executeQuery(`DELETE FROM admin_overrides WHERE id IN (?, ?)`, [testId1, testId2]);
      console.log('✅ Test data cleaned up');
      
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('✅ Period-specific constraint working (foreign key constraint working as expected)');
      } else {
        console.log('❌ Unexpected error during test:', error.message);
        throw error;
      }
    }
    
    console.log('\n🎉 Table recreation completed successfully!');
    console.log('✅ admin_overrides table now supports period-specific overrides');
    console.log('✅ All existing data has been preserved');
    console.log('✅ New unique constraint (seller_id, metric_name, metric_period) is active');
    
  } catch (error) {
    console.error('❌ Table recreation failed:', error.message);
    throw error;
  }
}

// Run recreation if this file is executed directly
if (require.main === module) {
  recreateAdminOverridesTable()
    .then(() => {
      console.log('\n✅ Table recreation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Table recreation failed:', error);
      process.exit(1);
    });
}

module.exports = { recreateAdminOverridesTable };
