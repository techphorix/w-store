require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDashboardDataSources() {
  console.log('🔍 Checking all dashboard data sources...');
  
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
    console.log('✅ Connected to database successfully\n');

    // 1. Check seller_fake_stats table
    console.log('📊 1. Checking seller_fake_stats table:');
    try {
      const [fakeStats] = await connection.execute('SELECT COUNT(*) as count FROM seller_fake_stats');
      console.log(`   - Records: ${fakeStats[0].count}`);
      
      if (fakeStats[0].count > 0) {
        const [sampleFakeStats] = await connection.execute('SELECT * FROM seller_fake_stats LIMIT 3');
        console.log('   - Sample data:', sampleFakeStats);
      }
    } catch (error) {
      console.log(`   - Error: ${error.message}`);
    }

    // 2. Check admin_overrides table
    console.log('\n📊 2. Checking admin_overrides table:');
    try {
      const [adminOverrides] = await connection.execute('SELECT COUNT(*) as count FROM admin_overrides');
      console.log(`   - Records: ${adminOverrides[0].count}`);
      
      if (adminOverrides[0].count > 0) {
        const [sampleOverrides] = await connection.execute('SELECT * FROM admin_overrides LIMIT 3');
        console.log('   - Sample data:', sampleOverrides);
      }
    } catch (error) {
      console.log(`   - Error: ${error.message}`);
    }

    // 3. Check orders table
    console.log('\n📊 3. Checking orders table:');
    try {
      const [orders] = await connection.execute('SELECT COUNT(*) as count FROM orders');
      console.log(`   - Records: ${orders[0].count}`);
      
      if (orders[0].count > 0) {
        const [sampleOrders] = await connection.execute('SELECT id, seller_id, total_amount, created_at FROM orders LIMIT 3');
        console.log('   - Sample data:', sampleOrders);
      }
    } catch (error) {
      console.log(`   - Error: ${error.message}`);
    }

    // 4. Check products table
    console.log('\n📊 4. Checking products table:');
    try {
      const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
      console.log(`   - Records: ${products[0].count}`);
      
      if (products[0].count > 0) {
        const [sampleProducts] = await connection.execute('SELECT id, name, created_by, is_active FROM products LIMIT 3');
        console.log('   - Sample data:', sampleProducts);
      }
    } catch (error) {
      console.log(`   - Error: ${error.message}`);
    }

    // 5. Check users table for business_info
    console.log('\n📊 5. Checking users table business_info:');
    try {
      const [usersWithBusinessInfo] = await connection.execute(`
        SELECT id, email, role, business_info 
        FROM users 
        WHERE business_info IS NOT NULL AND business_info != '{}'
        LIMIT 3
      `);
      console.log(`   - Users with business_info: ${usersWithBusinessInfo.length}`);
      
      if (usersWithBusinessInfo.length > 0) {
        usersWithBusinessInfo.forEach(user => {
          try {
            const businessInfo = JSON.parse(user.business_info);
            if (businessInfo.analytics) {
              console.log(`   - User ${user.email} has analytics:`, businessInfo.analytics);
            }
          } catch (e) {
            console.log(`   - User ${user.email} has invalid JSON in business_info`);
          }
        });
      }
    } catch (error) {
      console.log(`   - Error: ${error.message}`);
    }

    // 6. Check analytics table
    console.log('\n📊 6. Checking analytics table:');
    try {
      const [analytics] = await connection.execute('SELECT COUNT(*) as count FROM analytics');
      console.log(`   - Records: ${analytics[0].count}`);
      
      if (analytics[0].count > 0) {
        const [sampleAnalytics] = await connection.execute('SELECT * FROM analytics LIMIT 3');
        console.log('   - Sample data:', sampleAnalytics);
      }
    } catch (error) {
      console.log(`   - Error: ${error.message}`);
    }

    console.log('\n🎯 SUMMARY:');
    console.log('The dashboard data could be coming from:');
    console.log('1. seller_fake_stats (fake data)');
    console.log('2. admin_overrides (admin-edited values)');
    console.log('3. Real calculated data (orders, products)');
    console.log('4. business_info JSON in users table');
    console.log('5. Hardcoded defaults in the code');

    await connection.end();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error checking data sources:', error);
  }
}

// Run the check
checkDashboardDataSources()
  .then(() => {
    console.log('\n✅ Data source check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Data source check failed:', error);
    process.exit(1);
  });
