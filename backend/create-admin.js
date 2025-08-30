require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./utils/logger');

async function createAdminUser() {
  console.log('👑 Creating admin user...');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wstore_db',
    port: parseInt(process.env.DB_PORT) || 3306
  };

  try {
    // Test connection
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Check if users table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "users"');
    if (tables.length === 0) {
      console.log('❌ Users table does not exist. Please run the database setup first.');
      return;
    }

    // Check if admin user already exists
    const [adminUsers] = await connection.execute('SELECT id, email, full_name FROM users WHERE role = "admin"');
    
    if (adminUsers.length > 0) {
      console.log('✅ Admin user already exists:');
      adminUsers.forEach(admin => {
        console.log(`  - ${admin.email} (${admin.full_name})`);
      });
      return;
    }

    // Create admin user
    const adminId = uuidv4();
    const adminEmail = 'admin@wstore.com';
    const adminPassword = 'admin123'; // Change this in production!
    const adminName = 'System Administrator';
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Insert admin user
    await connection.execute(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, phone_verified, created_at, updated_at) 
      VALUES (?, ?, ?, ?, 'admin', 'active', TRUE, FALSE, NOW(), NOW())
    `, [adminId, adminEmail, passwordHash, adminName]);

    console.log('✅ Admin user created successfully!');
    console.log('📋 Admin credentials:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');

    await connection.end();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Run the script
createAdminUser();
