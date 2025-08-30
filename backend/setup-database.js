#!/usr/bin/env node

/**
 * Database Setup Script for W-Store
 * 
 * This script helps you set up the database connection for the admin overrides system.
 * Run this before running migrations or tests.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 W-Store Database Setup');
console.log('==========================\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupDatabase() {
  try {
    console.log('📋 Please provide your MySQL database credentials:\n');
    
    const host = await question('Database host (default: localhost): ') || 'localhost';
    const port = await question('Database port (default: 3306): ') || '3306';
    const user = await question('Database user (default: root): ') || 'root';
    const password = await question('Database password: ');
    const database = await question('Database name (default: wstore_db): ') || 'wstore_db';
    
    console.log('\n🔍 Database Configuration Summary:');
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   User: ${user}`);
    console.log(`   Password: ${password ? '***SET***' : 'NOT SET'}`);
    console.log(`   Database: ${database}\n`);
    
    const confirm = await question('Is this correct? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
    
    // Create .env file content
    const envContent = `# Database Configuration
DB_HOST=${host}
DB_USER=${user}
DB_PASSWORD=${password}
DB_NAME=${database}
DB_PORT=${port}

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
`;
    
    // Write .env file
    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ .env file created successfully!');
    console.log(`📁 Location: ${envPath}\n`);
    
    console.log('🔧 Next steps:');
    console.log('   1. Run the migration: npm run migrate:admin-overrides');
    console.log('   2. Test the system: npm run test:admin-overrides');
    console.log('   3. Start the server: npm run dev\n');
    
    console.log('💡 Note: Make sure your MySQL service is running and accessible.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
