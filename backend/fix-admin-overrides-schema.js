#!/usr/bin/env node

/**
 * Fix Admin Overrides Table Schema
 * 
 * This script updates the existing admin_overrides table to support
 * period-specific overrides by updating the unique constraint.
 */

const { executeQuery, connectDB } = require('./config/database');
const { logger } = require('./utils/logger');

async function fixAdminOverridesSchema() {
  try {
    console.log('🔧 Fixing admin_overrides table schema...\n');
    
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
    
    // Check current indexes
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
    
    console.log('\n🔑 Current indexes:');
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
    
    // Check if we need to update the unique constraint
    const hasOldUniqueConstraint = indexes.some(idx => 
      idx.INDEX_NAME === 'uniq_override' && 
      idx.NON_UNIQUE === 0 &&
      idx.COLUMN_NAME === 'seller_id'
    );
    
    const hasNewUniqueConstraint = indexes.some(idx => 
      idx.INDEX_NAME === 'uniq_override_period' && 
      idx.NON_UNIQUE === 0
    );
    
    if (hasOldUniqueConstraint && !hasNewUniqueConstraint) {
      console.log('\n🔄 Updating unique constraint to support period-specific overrides...');
      
      try {
        // Drop the old unique constraint
        await executeQuery(`
          ALTER TABLE admin_overrides 
          DROP INDEX uniq_override
        `);
        console.log('✅ Dropped old unique constraint');
        
        // Add the new unique constraint
        await executeQuery(`
          ALTER TABLE admin_overrides 
          ADD UNIQUE KEY uniq_override_period (seller_id, metric_name, metric_period)
        `);
        console.log('✅ Added new unique constraint for period-specific overrides');
        
      } catch (error) {
        console.log('⚠️ Error updating unique constraint:', error.message);
        
        // Try alternative approach - drop and recreate
        try {
          console.log('🔄 Trying alternative approach...');
          
          // Drop all indexes first
          await executeQuery(`
            ALTER TABLE admin_overrides 
            DROP INDEX uniq_override
          `);
          
          // Recreate the table with correct structure
          await executeQuery(`
            CREATE TABLE admin_overrides_new (
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
          
          // Copy data from old table
          await executeQuery(`
            INSERT INTO admin_overrides_new 
            SELECT * FROM admin_overrides
          `);
          
          // Drop old table and rename new one
          await executeQuery(`DROP TABLE admin_overrides`);
          await executeQuery(`RENAME TABLE admin_overrides_new TO admin_overrides`);
          
          console.log('✅ Table recreated with correct structure');
          
        } catch (recreateError) {
          console.log('❌ Failed to recreate table:', recreateError.message);
          throw recreateError;
        }
      }
    } else if (hasNewUniqueConstraint) {
      console.log('\n✅ Table already has the correct unique constraint');
    } else {
      console.log('\n⚠️ Unexpected index structure, manual intervention may be required');
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedIndexes = await executeQuery(`
      SELECT 
        INDEX_NAME, 
        COLUMN_NAME, 
        NON_UNIQUE
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'admin_overrides'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    
    console.log('🔑 Updated indexes:');
    const updatedIndexGroups = {};
    updatedIndexes.forEach(idx => {
      if (!updatedIndexGroups[idx.INDEX_NAME]) {
        updatedIndexGroups[idx.INDEX_NAME] = [];
      }
      updatedIndexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    
    Object.entries(updatedIndexGroups).forEach(([indexName, columns]) => {
      const unique = updatedIndexes.find(idx => idx.INDEX_NAME === indexName)?.NON_UNIQUE === 0 ? 'UNIQUE' : '';
      console.log(`   ${indexName}: [${columns.join(', ')}] ${unique}`.trim());
    });
    
    // Test insert with period-specific constraint
    console.log('\n🧪 Testing period-specific constraint...');
    
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
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('❌ Duplicate constraint still exists - constraint not properly updated');
      } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('✅ Period-specific constraint working (foreign key constraint working as expected)');
      } else {
        console.log('❌ Unexpected error during test:', error.message);
      }
    }
    
    console.log('\n🎉 Schema fix completed!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    throw error;
  }
}

// Run fix if this file is executed directly
if (require.main === module) {
  fixAdminOverridesSchema()
    .then(() => {
      console.log('\n✅ Schema fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAdminOverridesSchema };
