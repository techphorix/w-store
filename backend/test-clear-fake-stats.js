const fetch = require('node-fetch');

async function testClearFakeStats() {
  try {
    console.log('🧪 Testing clear all fake stats endpoint...');
    
    // You'll need to get a valid admin token first
    // This is just a test script - you should call this from your admin panel
    
    const response = await fetch('http://localhost:5000/api/admin/fake-stats/clear-all', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success:', result);
    } else {
      const error = await response.json();
      console.log('❌ Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Instructions for use
console.log('📋 INSTRUCTIONS:');
console.log('1. Start your server: node server.js');
console.log('2. Get an admin token from your admin panel');
console.log('3. Replace YOUR_ADMIN_TOKEN_HERE with the actual token');
console.log('4. Run this script: node test-clear-fake-stats.js');
console.log('');
console.log('💡 OR use your admin panel to call the endpoint directly');
console.log('🌐 Endpoint: DELETE /api/admin/fake-stats/clear-all');
console.log('');

// Only run if you have a valid token
if (process.argv.includes('--run')) {
  testClearFakeStats();
} else {
  console.log('⚠️  Script not executed. Add --run flag to execute.');
}
