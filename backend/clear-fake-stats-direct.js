require('dotenv').config();
const mysql = require('mysql2/promise');

async function clearFakeStatsDirect() {
  console.log('🗑️ Starting direct fake stats cleanup...');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wstore_db',
    port: parseInt(process.env.DB_PORT) || 3306
  };

  try {
    // Connect to database
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Check if the table exists
    const [tableExists] = await connection.execute('SHOW TABLES LIKE "seller_fake_stats"');
    if (tableExists.length === 0) {
      console.log('✅ seller_fake_stats table does not exist - nothing to clear');
      await connection.end();
      return;
    }
    
    // Get count before deletion
    const [countBefore] = await connection.execute('SELECT COUNT(*) as count FROM seller_fake_stats');
    const totalRecords = countBefore[0].count;
    console.log(`📊 Found ${totalRecords} fake stats records to delete`);
    
    if (totalRecords === 0) {
      console.log('✅ No fake stats to delete');
      await connection.end();
      return;
    }
    
    // Delete all fake stats
    const [result] = await connection.execute('DELETE FROM seller_fake_stats');
    console.log(`🗑️ Successfully deleted ${result.affectedRows} fake stats records`);
    
    // Verify deletion
    const [countAfter] = await connection.execute('SELECT COUNT(*) as count FROM seller_fake_stats');
    console.log(`✅ Verification: ${countAfter[0].count} records remaining`);
    
    // Check admin overrides are still intact
    const [adminOverrides] = await connection.execute('SELECT COUNT(*) as count FROM admin_overrides');
    console.log(`📝 Admin overrides intact: ${adminOverrides[0].count} records`);
    
    console.log('🎉 Fake stats cleanup completed successfully!');
    console.log('📝 Note: Admin overrides in admin_overrides table are preserved');
    
    await connection.end();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error during fake stats cleanup:', error);
  }
}

// Run the cleanup
clearFakeStatsDirect()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
