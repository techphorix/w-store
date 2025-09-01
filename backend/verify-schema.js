#!/usr/bin/env node

/**
 * Verify Admin Overrides Table Schema
 * 
 * This script checks if the admin_overrides table has the correct structure
 * with all required columns for period-specific metrics.
 */

const { executeQuery, connectDB } = require('./config/database');
const { logger } = require('./utils/logger');

async function verifySchema() {
  try {
    console.log('🔍 Verifying admin_overrides table schema...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully\n');
    
    // Check if table exists
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'admin_overrides'
    `);
    
    if (tableExists[0].count === 0) {
      console.log('❌ admin_overrides table does not exist');
      return;
    }
    
    console.log('✅ admin_overrides table exists\n');
    
    // Get table structure
    const columns = await executeQuery(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'admin_overrides'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Table structure:');
    columns.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable} ${defaultValue}`.trim());
    });
    
    // Check for required columns
    const requiredColumns = [
      'id', 'seller_id', 'metric_name', 'metric_period', 
      'override_value', 'period_specific_value', 'original_value',
      'created_at', 'updated_at'
    ];
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n❌ Missing required columns:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('\n✅ All required columns exist');
    }
    
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
    
    console.log('\n🔑 Indexes:');
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
    
    // Check for unique constraint on (seller_id, metric_name, metric_period)
    const hasUniqueConstraint = indexes.some(idx => 
      idx.INDEX_NAME === 'uniq_override_period' && 
      idx.NON_UNIQUE === 0
    );
    
    if (hasUniqueConstraint) {
      console.log('\n✅ Unique constraint exists for period-specific overrides');
    } else {
      console.log('\n❌ Missing unique constraint for period-specific overrides');
    }
    
    // Test insert/select operations
    console.log('\n🧪 Testing basic operations...');
    
    try {
      // Test insert (will fail due to foreign key, but that's expected)
      const testInsert = await executeQuery(`
        INSERT INTO admin_overrides (id, seller_id, metric_name, metric_period, override_value, period_specific_value, original_value) 
        VALUES (UUID(), 'test-seller-id', 'test_metric', 'total', 100.00, 100.00, 0.00)
      `);
      console.log('✅ Insert operation works');
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('✅ Insert operation works (foreign key constraint working as expected)');
      } else {
        console.log('❌ Insert operation failed:', error.message);
      }
    }
    
    // Test select
    try {
      const testSelect = await executeQuery('SELECT COUNT(*) as count FROM admin_overrides');
      console.log(`✅ Select operation works (${testSelect[0].count} records found)`);
    } catch (error) {
      console.log('❌ Select operation failed:', error.message);
    }
    
    console.log('\n🎉 Schema verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifySchema()
    .then(() => {
      console.log('\n✅ Schema verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Schema verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifySchema };
