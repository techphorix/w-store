const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

async function clearFakeStats() {
  try {
    logger.info('🗑️ Starting fake stats cleanup...');
    
    // Check if the table exists
    const tableExists = await executeQuery('SHOW TABLES LIKE "seller_fake_stats"');
    if (tableExists.length === 0) {
      logger.info('✅ seller_fake_stats table does not exist - nothing to clear');
      return { success: true, message: 'Table does not exist' };
    }
    
    // Get count before deletion
    const countBefore = await executeQuery('SELECT COUNT(*) as count FROM seller_fake_stats');
    const totalRecords = countBefore[0].count;
    logger.info(`📊 Found ${totalRecords} fake stats records to delete`);
    
    if (totalRecords === 0) {
      logger.info('✅ No fake stats to delete');
      return { success: true, message: 'No records to delete', deletedCount: 0 };
    }
    
    // Delete all fake stats
    const result = await executeQuery('DELETE FROM seller_fake_stats');
    logger.info(`🗑️ Successfully deleted ${result.affectedRows} fake stats records`);
    
    // Verify deletion
    const countAfter = await executeQuery('SELECT COUNT(*) as count FROM seller_fake_stats');
    logger.info(`✅ Verification: ${countAfter[0].count} records remaining`);
    
    // Check admin overrides are still intact
    const adminOverrides = await executeQuery('SELECT COUNT(*) as count FROM admin_overrides');
    logger.info(`📝 Admin overrides intact: ${adminOverrides[0].count} records`);
    
    logger.info('🎉 Fake stats cleanup completed successfully!');
    logger.info('📝 Note: Admin overrides in admin_overrides table are preserved');
    
    return {
      success: true,
      message: 'Fake stats cleared successfully',
      deletedCount: result.affectedRows,
      adminOverridesCount: adminOverrides[0].count
    };
    
  } catch (error) {
    logger.error('❌ Error during fake stats cleanup:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { clearFakeStats };

// Run directly if called from command line
if (require.main === module) {
  // This will only run if the script is called directly
  console.log('⚠️  This script should be run through the server, not directly');
  console.log('💡 Use: node server.js and then call the clear-fake-stats endpoint');
}
