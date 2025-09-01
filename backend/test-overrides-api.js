#!/usr/bin/env node

/**
 * Test Admin Overrides API Endpoints
 * 
 * This script tests the admin overrides API to ensure it's working correctly
 * with the snake_case metric names.
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_SELLER_ID = 'test-seller-id'; // Replace with actual seller ID
const TEST_ADMIN_TOKEN = 'test-admin-token'; // Replace with actual admin token

// Test all required metric fields
const REQUIRED_METRICS = [
  'orders_sold',
  'total_sales', 
  'profit_forecast',
  'visitors',
  'shop_followers',
  'shop_rating',
  'credit_score'
];

async function testAdminOverridesAPI() {
  console.log('🧪 Testing Admin Overrides API...\n');
  
  try {
    // Test 1: Get seller overrides
    console.log('1️⃣ Testing GET /api/admin/seller/:sellerId/overrides');
    try {
      const getResponse = await axios.get(`${BASE_URL}/api/admin/seller/${TEST_SELLER_ID}/overrides`, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ GET overrides successful');
      console.log('   Response:', JSON.stringify(getResponse.data, null, 2));
      
      // Check if structuredOverrides contains all required metrics
      if (getResponse.data.structuredOverrides) {
        console.log('\n📊 Checking structuredOverrides format:');
        REQUIRED_METRICS.forEach(metric => {
          const metricData = getResponse.data.structuredOverrides[metric];
          if (metricData) {
            console.log(`   ✅ ${metric}: ${JSON.stringify(metricData)}`);
          } else {
            console.log(`   ❌ ${metric}: Missing`);
          }
        });
      }
      
    } catch (error) {
      console.log('❌ GET overrides failed:', error.response?.data || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Create/Update overrides for each metric
    console.log('2️⃣ Testing POST /api/admin/seller/:sellerId/overrides');
    
    // Test with the new period-specific payload format
    const testPayload = {
      'today_orders_sold': 150,
      'today_total_sales': 2500.50,
      'today_profit_forecast': 500.25,
      'today_visitors': 45,
      'today_shop_followers': 1200,
      'today_shop_rating': 4.8,
      'today_credit_score': 780,
      'last7_orders_sold': 850,
      'last7_total_sales': 12500.75,
      'last7_profit_forecast': 2500.50,
      'last7_visitors': 320,
      'last7_shop_followers': 1250,
      'last7_shop_rating': 4.7,
      'last7_credit_score': 775,
      'total_orders_sold': 5000,
      'total_total_sales': 75000.00,
      'total_profit_forecast': 15000.00,
      'total_visitors': 2500,
      'total_shop_followers': 1500,
      'total_shop_rating': 4.6,
      'total_credit_score': 770
    };
    
    try {
      console.log('🧪 Testing with period-specific payload format');
      console.log('   Payload keys:', Object.keys(testPayload));
      
      const postResponse = await axios.post(`${BASE_URL}/api/admin/seller/${TEST_SELLER_ID}/overrides`, testPayload, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   ✅ Overrides created successfully`);
      console.log(`   Response:`, JSON.stringify(postResponse.data, null, 2));
      
    } catch (error) {
      console.log(`   ❌ Overrides creation failed:`, error.response?.data || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Verify overrides were saved by getting them again
    console.log('3️⃣ Verifying overrides were saved...');
    try {
      const verifyResponse = await axios.get(`${BASE_URL}/api/admin/seller/${TEST_SELLER_ID}/overrides`, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Verification successful');
      console.log('   Overrides count:', verifyResponse.data.overrides?.length || 0);
      
      if (verifyResponse.data.overrides) {
        verifyResponse.data.overrides.forEach(override => {
          console.log(`   - ${override.metric_name}: ${override.override_value}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Verification failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Admin Overrides API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function getTestValue(metric) {
  switch (metric) {
    case 'shop_rating':
      return 4.5;
    case 'credit_score':
      return 750;
    case 'orders_sold':
    case 'total_sales':
    case 'profit_forecast':
    case 'visitors':
    case 'shop_followers':
      return 100;
    default:
      return 50;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Admin Overrides API Test...\n');
  console.log('⚠️  Make sure to:');
  console.log('   1. Update TEST_SELLER_ID with a real seller ID');
  console.log('   2. Update TEST_ADMIN_TOKEN with a real admin JWT token');
  console.log('   3. Ensure the backend server is running on port 5000');
  console.log('   4. Ensure the database is connected and admin_overrides table exists\n');
  
  testAdminOverridesAPI();
}

module.exports = { testAdminOverridesAPI };
