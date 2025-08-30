require('dotenv').config();
const { connectDB, executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const seedDatabase = async () => {
  try {
    logger.info('🌱 Starting database seeding...');
    
    // Connect to database first
    await connectDB();
    
    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    
    await executeQuery(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, phone_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      full_name = VALUES(full_name),
      role = VALUES(role),
      status = VALUES(status)
    `, [adminId, 'admin@wstore.com', adminPasswordHash, 'System Administrator', 'admin', 'active', true, true]);
    
    logger.info('✅ Admin user created');

    // Create additional admin users for testing
    const admin2Id = uuidv4();
    const admin2PasswordHash = await bcrypt.hash('admin123', 12);
    
    await executeQuery(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, phone_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      full_name = VALUES(full_name),
      role = VALUES(role),
      status = VALUES(status)
    `, [admin2Id, 'admin2@wstore.com', admin2PasswordHash, 'Secondary Administrator', 'admin', 'active', true, true]);
    
    logger.info('✅ Secondary admin user created');

    // Create sample categories
    const categories = [
      { id: uuidv4(), name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets' },
      { id: uuidv4(), name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel' },
      { id: uuidv4(), name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement and garden supplies' },
      { id: uuidv4(), name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports equipment and outdoor gear' },
      { id: uuidv4(), name: 'Books & Media', slug: 'books-media', description: 'Books, movies, and music' },
      { id: uuidv4(), name: 'Health & Beauty', slug: 'health-beauty', description: 'Health products and beauty supplies' },
      { id: uuidv4(), name: 'Automotive', slug: 'automotive', description: 'Car parts and accessories' },
      { id: uuidv4(), name: 'Toys & Games', slug: 'toys-games', description: 'Children toys and board games' }
    ];

    for (const category of categories) {
      await executeQuery(`
        INSERT INTO categories (id, name, slug, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description)
      `, [category.id, category.name, category.slug, category.description]);
    }
    
    logger.info('✅ Sample categories created');

    // Create sample sellers
    const sellers = [
      {
        id: uuidv4(),
        email: 'seller1@wstore.com',
        password: 'seller123',
        name: 'Tech Gadgets Store',
        businessType: 'electronics'
      },
      {
        id: uuidv4(),
        email: 'seller2@wstore.com',
        password: 'seller123',
        name: 'Fashion Forward',
        businessType: 'clothing'
      },
      {
        id: uuidv4(),
        email: 'seller3@wstore.com',
        password: 'seller123',
        name: 'Home Essentials',
        businessType: 'home-garden'
      }
    ];

    for (const seller of sellers) {
      const sellerPasswordHash = await bcrypt.hash(seller.password, 12);
      
      await executeQuery(`
        INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, phone_verified, business_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        full_name = VALUES(full_name),
        role = VALUES(role),
        status = VALUES(status),
        business_info = VALUES(business_info)
      `, [seller.id, seller.email, sellerPasswordHash, seller.name, 'seller', 'active', true, true, JSON.stringify({
        business_name: seller.name,
        business_type: seller.businessType,
        tax_id: `TAX${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        credit_score: Math.floor(Math.random() * 100) + 700,
        followers: Math.floor(Math.random() * 1000) + 100,
        rating: (Math.random() * 2 + 3).toFixed(1)
      })]);
    }
    
    logger.info('✅ Sample sellers created');

    // Create sample products for each seller
    const products = [
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        sku: 'WH-001',
        category_id: categories[0].id,
        brand: 'AudioTech',
        price: 99.99,
        stock_quantity: 50,
        images: JSON.stringify(['headphones1.jpg', 'headphones2.jpg']),
        features: JSON.stringify(['Bluetooth 5.0', 'Noise Cancellation', '30h Battery Life']),
        tags: JSON.stringify(['wireless', 'bluetooth', 'headphones', 'audio'])
      },
      {
        name: 'Smart Fitness Watch',
        description: 'Advanced fitness tracking with heart rate monitor',
        sku: 'SFW-002',
        category_id: categories[0].id,
        brand: 'FitTech',
        price: 199.99,
        stock_quantity: 30,
        images: JSON.stringify(['watch1.jpg', 'watch2.jpg']),
        features: JSON.stringify(['Heart Rate Monitor', 'GPS', 'Water Resistant', '7-day Battery']),
        tags: JSON.stringify(['fitness', 'smartwatch', 'health', 'tracking'])
      },
      {
        name: 'Organic Cotton T-Shirt',
        description: 'Comfortable organic cotton t-shirt in various colors',
        sku: 'TS-003',
        category_id: categories[1].id,
        brand: 'EcoWear',
        price: 24.99,
        stock_quantity: 100,
        images: JSON.stringify(['tshirt1.jpg', 'tshirt2.jpg']),
        features: JSON.stringify(['100% Organic Cotton', 'Multiple Colors', 'Sizes XS-XXL']),
        tags: JSON.stringify(['organic', 'cotton', 'tshirt', 'clothing'])
      },
      {
        name: 'Garden Tool Set',
        description: 'Complete set of essential garden tools',
        sku: 'GT-004',
        category_id: categories[2].id,
        brand: 'GardenPro',
        price: 89.99,
        stock_quantity: 25,
        images: JSON.stringify(['tools1.jpg', 'tools2.jpg']),
        features: JSON.stringify(['10-Piece Set', 'Stainless Steel', 'Ergonomic Handles']),
        tags: JSON.stringify(['garden', 'tools', 'outdoor', 'gardening'])
      },
      {
        name: 'Yoga Mat Premium',
        description: 'High-quality non-slip yoga mat for all types of yoga',
        sku: 'YM-005',
        category_id: categories[5].id,
        brand: 'YogaLife',
        price: 39.99,
        stock_quantity: 75,
        images: JSON.stringify(['yogamat1.jpg', 'yogamat2.jpg']),
        features: JSON.stringify(['Non-Slip Surface', '6mm Thickness', 'Eco-Friendly Material']),
        tags: JSON.stringify(['yoga', 'fitness', 'exercise', 'wellness'])
      }
    ];

    // Distribute products among sellers
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const sellerId = sellers[i % sellers.length].id;
      
      const productId = uuidv4();
      await executeQuery(`
        INSERT INTO products (id, name, description, sku, category_id, brand, price, stock_quantity, images, features, tags, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        price = VALUES(price),
        stock_quantity = VALUES(stock_quantity),
        images = VALUES(images),
        features = VALUES(features),
        tags = VALUES(tags)
      `, [productId, product.name, product.description, product.sku, product.category_id, product.brand, product.price, product.stock_quantity, product.images, product.features, product.tags, sellerId]);

      // Create product distribution
      try {
        await executeQuery(`
          INSERT INTO product_distributions (id, product_id, seller_id, seller_price, allocated_stock, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [uuidv4(), productId, sellerId, product.price, product.stock_quantity, 'active']);
      } catch (error) {
        logger.warn(`⚠️ Could not create distribution for ${product.name}: ${error.message}`);
      }
    }
    
    logger.info('✅ Sample products created');

    // Create sample customers
    const customers = [
      {
        email: 'customer1@wstore.com',
        password: 'customer123',
        name: 'John Customer',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA'
        }
      },
      {
        email: 'customer2@wstore.com',
        password: 'customer123',
        name: 'Jane Shopper',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210',
          country: 'USA'
        }
      },
      {
        email: 'customer3@wstore.com',
        password: 'customer123',
        name: 'Mike Buyer',
        address: {
          street: '789 Pine Rd',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
          country: 'USA'
        }
      }
    ];

    for (const customer of customers) {
      const customerPasswordHash = await bcrypt.hash(customer.password, 12);
      
      await executeQuery(`
        INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, phone_verified, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        full_name = VALUES(full_name),
        role = VALUES(role),
        status = VALUES(status),
        address = VALUES(address)
      `, [uuidv4(), customer.email, customerPasswordHash, customer.name, 'user', 'active', true, true, JSON.stringify(customer.address)]);
    }
    
    logger.info('✅ Sample customers created');

    // Create sample orders
    for (let i = 0; i < 10; i++) {
      const orderId = uuidv4();
      const orderNumber = `ORD-${Date.now()}-${i}`;
      const customerId = customers[i % customers.length].id || customers[0].id;
      const sellerId = sellers[i % sellers.length].id;
      const product = products[i % products.length];
      
      const orderAmount = product.price + (Math.random() * 20 + 5); // Add shipping and tax
      
      await executeQuery(`
        INSERT INTO orders (id, order_number, customer_id, seller_id, status, total_amount, subtotal, shipping_amount, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [orderId, orderNumber, customerId, sellerId, 'delivered', orderAmount, product.price, 15.99, 'paid']);
      
      // Create order item
      await executeQuery(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, product_name, product_sku)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), orderId, product.id || products[0].id, Math.floor(Math.random() * 3) + 1, product.price, product.price, product.name, product.sku]);
    }
    
    logger.info('✅ Sample orders created');

    // Create sample notifications
    const sampleNotifications = [
      {
        recipient_id: adminId,
        type: 'system',
        title: 'Welcome to W-Store Admin',
        message: 'Welcome to your new admin dashboard. You can now manage users, products, and monitor system performance.',
        data: JSON.stringify({ action: 'dashboard_tour' }),
        priority: 'normal',
        is_read: false
      },
      {
        recipient_id: adminId,
        type: 'info',
        title: 'System Setup Complete',
        message: 'Your W-Store platform has been successfully initialized with sample data.',
        data: JSON.stringify({ action: 'view_setup' }),
        priority: 'low',
        is_read: false
      },
      {
        recipient_id: adminId,
        type: 'warning',
        title: 'New Seller Registration',
        message: 'A new seller has registered and is awaiting approval.',
        data: JSON.stringify({ action: 'review_seller' }),
        priority: 'normal',
        is_read: false
      }
    ];

    for (const notification of sampleNotifications) {
      await executeQuery(`
        INSERT INTO notifications (id, recipient_id, type, title, message, data, priority, is_read)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        message = VALUES(message),
        data = VALUES(data),
        priority = VALUES(priority)
      `, [
        uuidv4(),
        notification.recipient_id,
        notification.type,
        notification.title,
        notification.message,
        notification.data,
        notification.priority,
        notification.is_read
      ]);
    }

    // Create sample announcements
    const sampleAnnouncements = [
      {
        title: 'Welcome to W-Store!',
        message: 'We are excited to announce the launch of our new e-commerce platform. Start selling and shopping today!',
        priority: 'normal',
        target_role: 'all',
        created_by: adminId
      },
      {
        title: 'Seller Registration Open',
        message: 'New sellers can now register and start selling their products on our platform.',
        priority: 'high',
        target_role: 'seller',
        created_by: adminId
      },
      {
        title: 'System Maintenance Notice',
        message: 'Scheduled maintenance will occur on Sunday from 2-4 AM EST. We apologize for any inconvenience.',
        priority: 'normal',
        target_role: 'all',
        created_by: adminId
      }
    ];

    for (const announcement of sampleAnnouncements) {
      await executeQuery(`
        INSERT INTO announcements (id, title, message, priority, target_role, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        message = VALUES(message),
        priority = VALUES(priority)
      `, [
        uuidv4(),
        announcement.title,
        announcement.message,
        announcement.priority,
        announcement.target_role,
        announcement.created_by
      ]);
    }

    // Create sample system settings
    const systemSettings = [
      {
        setting_key: 'site_name',
        setting_value: 'W-Store',
        setting_type: 'string',
        description: 'Website name',
        is_public: true
      },
      {
        setting_key: 'site_description',
        setting_value: 'E-commerce platform for sellers and customers',
        setting_type: 'string',
        description: 'Website description',
        is_public: true
      },
      {
        setting_key: 'maintenance_mode',
        setting_value: 'false',
        setting_type: 'boolean',
        description: 'Maintenance mode status',
        is_public: false
      },
      {
        setting_key: 'registration_enabled',
        setting_value: 'true',
        setting_type: 'boolean',
        description: 'User registration status',
        is_public: true
      },
      {
        setting_key: 'max_file_size',
        setting_value: '5242880',
        setting_type: 'number',
        description: 'Maximum file upload size in bytes',
        is_public: false
      }
    ];

    for (const setting of systemSettings) {
      await executeQuery(`
        INSERT INTO system_settings (id, setting_key, setting_value, setting_type, description, is_public)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        description = VALUES(description)
      `, [
        uuidv4(),
        setting.setting_key,
        setting.setting_value,
        setting.setting_type,
        setting.description,
        setting.is_public
      ]);
    }

    // Create sample analytics data
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      await executeQuery(`
        INSERT INTO analytics (id, entity_type, entity_id, metric_path, value, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        'user',
        null,
        'daily_registrations',
        Math.floor(Math.random() * 10) + 1,
        date.toISOString().split('T')[0]
      ]);
    }

    logger.info('🎉 Database seeding completed successfully!');
    logger.info('📋 Sample accounts created:');
    logger.info('   👑 Admin: admin@wstore.com / admin123');
    logger.info('   👑 Admin 2: admin2@wstore.com / admin123');
    logger.info('   🏪 Seller 1: seller1@wstore.com / seller123');
    logger.info('   🏪 Seller 2: seller2@wstore.com / seller123');
    logger.info('   🏪 Seller 3: seller3@wstore.com / seller123');
    logger.info('   👤 Customer 1: customer1@wstore.com / customer123');
    logger.info('   👤 Customer 2: customer2@wstore.com / customer123');
    logger.info('   👤 Customer 3: customer3@wstore.com / customer123');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
