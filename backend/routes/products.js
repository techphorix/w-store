const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, query } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticateToken, requireAdminOrSeller, requireOwnershipOrAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Configure multer for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/products');
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: true,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: true,
        message: 'Too many files. Maximum is 10 files.'
      });
    }
    return res.status(400).json({
      error: true,
      message: `Upload error: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      error: true,
      message: `Upload error: ${err.message}`
    });
  }
  
  next();
};

// Validation middleware
const validateProduct = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Product name must be between 2 and 255 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('comparePrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be a positive number'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('sku').optional().isLength({ max: 100 }).withMessage('SKU must be less than 100 characters'),
  body('categoryId').optional().isUUID().withMessage('Invalid category ID'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer')
];

const validateCategory = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Category name must be between 2 and 255 characters'),
  body('slug').trim().isLength({ min: 2, max: 255 }).matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('parentId').optional().isUUID().withMessage('Invalid parent category ID')
];

// Get all products with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('category').optional().isUUID().withMessage('Invalid category ID'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search query too long'),
  query('sortBy').optional().isIn(['name', 'price', 'created_at', 'updated_at']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    page = 1,
    limit = 20,
    category,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    status = 'active'
  } = req.query;

  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 20;
  const offset = (parsedPage - 1) * parsedLimit;
  const whereConditions = ['p.is_active = ?'];
  const params = [status === 'active'];

  if (category) {
    whereConditions.push('p.category_id = ?');
    params.push(category);
  }

  if (search) {
    whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereConditions.join(' AND ');

  // Get products with category info
  const products = await executeQuery(`
    SELECT 
      p.*,
      c.name as category_name,
      c.slug as category_slug,
      u.full_name as created_by_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE ${whereClause}
    ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count for pagination
  const countResult = await executeQuery(`
    SELECT COUNT(*) as total
    FROM products p
    WHERE ${whereClause}
  `, params);

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / parsedLimit);

  // Parse JSON fields
  products.forEach(product => {
    if (product.images) {
      try {
        product.images = JSON.parse(product.images);
      } catch (e) {
        product.images = [];
      }
    }
    if (product.features) {
      try {
        product.features = JSON.parse(product.features);
      } catch (e) {
        product.features = [];
      }
    }
    if (product.specifications) {
      try {
        product.specifications = JSON.parse(product.specifications);
      } catch (e) {
        product.specifications = {};
      }
    }
    if (product.tags) {
      try {
        product.tags = JSON.parse(product.tags);
      } catch (e) {
        product.tags = [];
      }
    }
  });

  res.json({
    error: false,
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}));

// Get single product by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await executeQuery(`
    SELECT 
      p.*,
      c.name as category_name,
      c.slug as category_slug,
      u.full_name as created_by_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `, [id]);

  if (product.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Product not found'
    });
  }

  const productData = product[0];

  // Parse JSON fields
  if (productData.images) {
    try {
      productData.images = JSON.parse(productData.images);
    } catch (e) {
      productData.images = [];
    }
  }
  if (productData.features) {
    try {
      productData.features = JSON.parse(productData.features);
    } catch (e) {
      productData.features = [];
    }
  }
  if (productData.specifications) {
    try {
      productData.specifications = JSON.parse(productData.specifications);
    } catch (e) {
      productData.specifications = {};
    }
  }
  if (productData.tags) {
    try {
      productData.tags = JSON.parse(productData.tags);
    } catch (e) {
      productData.tags = [];
    }
  }

  res.json({
    error: false,
    product: productData
  });
}));

// Create new product
router.post('/', authenticateToken, requireAdminOrSeller, upload.array('images', 10), handleMulterError, validateProduct, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    name,
    description,
    shortDescription,
    price,
    comparePrice,
    costPrice,
    sku,
    barcode,
    categoryId,
    category_id, // Handle both field names
    brand,
    model,
    weight,
    dimensions,
    features,
    specifications,
    tags,
    isActive = true,
    isFeatured = false,
    stockQuantity = 0,
    stock_quantity, // Handle both field names
    lowStockThreshold = 5,
    trackInventory = true,
    allowBackorders = false
  } = req.body;

  // Use the first available value for each field
  const finalCategoryId = categoryId || category_id;
  const finalStockQuantity = stockQuantity || stock_quantity;

  const images = req.files;

  // Log image upload information
  logger.info(`Image upload info: ${images ? images.length : 0} files received`);
  if (images && images.length > 0) {
    images.forEach((file, index) => {
      logger.info(`File ${index + 1}: ${file.originalname} -> ${file.filename} (${file.size} bytes)`);
    });
  }

  // Check if SKU already exists
  if (sku) {
    const existingSku = await executeQuery(
      'SELECT id FROM products WHERE sku = ?',
      [sku]
    );
    if (existingSku.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Product with this SKU already exists'
      });
    }
  }

  // Process images
  const imageUrls = images ? images.map(file => `/uploads/products/${file.filename}`) : [];

  const productId = uuidv4();
  const productData = {
    id: productId,
    name,
    description: description || null,
    short_description: shortDescription || null,
    price: parseFloat(price),
    compare_price: comparePrice ? parseFloat(comparePrice) : null,
    cost_price: costPrice ? parseFloat(costPrice) : null,
    sku: sku || null,
    barcode: barcode || null,
    category_id: finalCategoryId || null,
    brand: brand || null,
    model: model || null,
    weight: weight ? parseFloat(weight) : null,
    dimensions: dimensions ? JSON.stringify(dimensions) : null,
    images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
    features: features ? JSON.stringify(features) : null,
    specifications: specifications ? JSON.stringify(specifications) : null,
    tags: tags ? JSON.stringify(tags) : null,
    is_active: isActive,
    is_featured: isFeatured,
    stock_quantity: parseInt(finalStockQuantity),
    low_stock_threshold: parseInt(lowStockThreshold),
    track_inventory: trackInventory,
    allow_backorders: allowBackorders,
    created_by: req.userId,
    created_at: new Date(),
    updated_at: new Date()
  };

  // Log the data being inserted for debugging
  logger.info(`Creating product with data: ${JSON.stringify(productData, null, 2)}`);

  await executeQuery(
    'INSERT INTO products (id, name, description, short_description, price, compare_price, cost_price, sku, barcode, category_id, brand, model, weight, dimensions, images, features, specifications, tags, is_active, is_featured, stock_quantity, low_stock_threshold, track_inventory, allow_backorders, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    Object.values(productData)
  );

  logger.info(`New product created: ${name} by user ${req.userId}`);

  res.status(201).json({
    error: false,
    message: 'Product created successfully',
    product: { ...productData, id: productId }
  });
}));

// Update product
router.put('/:id', authenticateToken, requireOwnershipOrAdmin('products'), upload.array('images', 10), handleMulterError, validateProduct, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const images = req.files;

  // Check if product exists
  const existingProduct = await executeQuery(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );

  if (existingProduct.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Product not found'
    });
  }

  // Check ownership (unless admin)
  if (req.user.role !== 'admin' && existingProduct[0].created_by !== req.userId) {
    return res.status(403).json({
      error: true,
      message: 'You can only edit your own products'
    });
  }

  const {
    name,
    description,
    shortDescription,
    price,
    comparePrice,
    costPrice,
    sku,
    barcode,
    categoryId,
    category_id, // Handle both field names
    brand,
    model,
    weight,
    dimensions,
    features,
    specifications,
    tags,
    isActive,
    isFeatured,
    stockQuantity,
    stock_quantity, // Handle both field names
    lowStockThreshold,
    trackInventory,
    allowBackorders
  } = req.body;

  // Use the first available value for each field
  const finalCategoryId = categoryId || category_id;
  const finalStockQuantity = stockQuantity || stock_quantity;

  // Check if SKU already exists (if changed)
  if (sku && sku !== existingProduct[0].sku) {
    const existingSku = await executeQuery(
      'SELECT id FROM products WHERE sku = ? AND id != ?',
      [sku, id]
    );
    if (existingSku.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Product with this SKU already exists'
      });
    }
  }

  // Process new images
  const newImageUrls = images ? images.map(file => `/uploads/products/${file.filename}`) : [];
  
  // Log image upload information for updates
  logger.info(`Update - Image upload info: ${images ? images.length : 0} new files received`);
  if (images && images.length > 0) {
    images.forEach((file, index) => {
      logger.info(`Update - File ${index + 1}: ${file.originalname} -> ${file.filename} (${file.size} bytes)`);
    });
  }
  
  // Combine existing and new images
  let allImages = [];
  if (existingProduct[0].images) {
    try {
      allImages = JSON.parse(existingProduct[0].images);
    } catch (e) {
      logger.warn(`Failed to parse existing images for product ${id}: ${e.message}`);
      allImages = [];
    }
  }
  allImages = [...allImages, ...newImageUrls];
  
  logger.info(`Update - Total images after merge: ${allImages.length}`);

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (shortDescription !== undefined) {
    updates.push('short_description = ?');
    params.push(shortDescription);
  }
  if (price !== undefined) {
    updates.push('price = ?');
    params.push(parseFloat(price));
  }
  if (comparePrice !== undefined) {
    updates.push('compare_price = ?');
    params.push(comparePrice ? parseFloat(comparePrice) : null);
  }
  if (costPrice !== undefined) {
    updates.push('cost_price = ?');
    params.push(costPrice ? parseFloat(costPrice) : null);
  }
  if (sku !== undefined) {
    updates.push('sku = ?');
    params.push(sku);
  }
  if (barcode !== undefined) {
    updates.push('barcode = ?');
    params.push(barcode);
  }
  if (finalCategoryId !== undefined) {
    updates.push('category_id = ?');
    params.push(finalCategoryId);
  }
  if (brand !== undefined) {
    updates.push('brand = ?');
    params.push(brand);
  }
  if (model !== undefined) {
    updates.push('model = ?');
    params.push(model);
  }
  if (weight !== undefined) {
    updates.push('weight = ?');
    params.push(weight ? parseFloat(weight) : null);
  }
  if (dimensions !== undefined) {
    updates.push('dimensions = ?');
    params.push(dimensions ? JSON.stringify(dimensions) : null);
  }
  if (images) {
    updates.push('images = ?');
    params.push(JSON.stringify(allImages));
  }
  if (features !== undefined) {
    updates.push('features = ?');
    params.push(features ? JSON.stringify(features) : null);
  }
  if (specifications !== undefined) {
    updates.push('specifications = ?');
    params.push(specifications ? JSON.stringify(specifications) : null);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    params.push(tags ? JSON.stringify(tags) : null);
  }
  if (isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(isActive);
  }
  if (isFeatured !== undefined) {
    updates.push('is_featured = ?');
    params.push(isFeatured);
  }
  if (finalStockQuantity !== undefined) {
    updates.push('stock_quantity = ?');
    params.push(parseInt(finalStockQuantity));
  }
  if (lowStockThreshold !== undefined) {
    updates.push('low_stock_threshold = ?');
    params.push(parseInt(lowStockThreshold));
  }
  if (trackInventory !== undefined) {
    updates.push('track_inventory = ?');
    params.push(trackInventory);
  }
  if (allowBackorders !== undefined) {
    updates.push('allow_backorders = ?');
    params.push(allowBackorders);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: true,
      message: 'No fields to update'
    });
  }

  updates.push('updated_at = ?');
  params.push(new Date());
  params.push(id);

  await executeQuery(
    `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info(`Product updated: ${id} by user ${req.userId}`);

  res.json({
    error: false,
    message: 'Product updated successfully'
  });
}));

// Delete product
router.delete('/:id', authenticateToken, requireOwnershipOrAdmin('products'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if product exists
  const existingProduct = await executeQuery(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );

  if (existingProduct.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Product not found'
    });
  }

  // Check ownership (unless admin)
  if (req.user.role !== 'admin' && existingProduct[0].created_by !== req.userId) {
    return res.status(403).json({
      error: true,
      message: 'You can only delete your own products'
    });
  }

  // Check if product has orders
  const orderItems = await executeQuery(
    'SELECT id FROM order_items WHERE product_id = ?',
    [id]
  );

  if (orderItems.length > 0) {
    return res.status(400).json({
      error: true,
      message: 'Cannot delete product with existing orders'
    });
  }

  // Delete product
  await executeQuery(
    'DELETE FROM products WHERE id = ?',
    [id]
  );

  logger.info(`Product deleted: ${id} by user ${req.userId}`);

  res.json({
    error: false,
    message: 'Product deleted successfully'
  });
}));

// Get product categories
router.get('/meta/categories', asyncHandler(async (req, res) => {
  const categories = await executeQuery(`
    SELECT 
      c.*,
      COUNT(p.id) as product_count,
      pc.name as parent_name
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
    LEFT JOIN categories pc ON c.parent_id = pc.id
    WHERE c.is_active = TRUE
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `);

  res.json({
    error: false,
    categories
  });
}));

// Get product statistics
router.get('/meta/stats', asyncHandler(async (req, res) => {
  const stats = await executeQuery(`
    SELECT 
      COUNT(*) as total_products,
      COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_products,
      COUNT(CASE WHEN is_featured = TRUE THEN 1 END) as featured_products,
      COUNT(CASE WHEN stock_quantity <= low_stock_threshold THEN 1 END) as low_stock_products,
      COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_products,
      AVG(price) as average_price,
      SUM(stock_quantity) as total_stock
    FROM products
  `);

  res.json({
    error: false,
    stats: stats[0]
  });
}));

// Create product distribution
router.post('/:id/distribute', authenticateToken, requireAdminOrSeller, asyncHandler(async (req, res) => {
  const { id: productId } = req.params;
  const { allocatedStock, markup, sellerNotes } = req.body;

  // Check if product exists
  const product = await executeQuery(
    'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
    [productId]
  );

  if (product.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Product not found or not active'
    });
  }

  // Check if distribution already exists
  const existingDistribution = await executeQuery(
    'SELECT * FROM product_distributions WHERE product_id = ? AND seller_id = ?',
    [productId, req.userId]
  );

  if (existingDistribution.length > 0) {
    return res.status(400).json({
      error: true,
      message: 'Distribution already exists for this product'
    });
  }

  // Calculate seller price
  const basePrice = parseFloat(product[0].price);
  const markupPercentage = markup ? parseFloat(markup) : 0;
  const sellerPrice = basePrice * (1 + markupPercentage / 100);

  const distributionId = uuidv4();
  const distributionData = {
    id: distributionId,
    product_id: productId,
    seller_id: req.userId,
    allocated_stock: allocatedStock ? parseInt(allocatedStock) : 0,
    markup_percentage: markupPercentage,
    seller_price: sellerPrice,
    seller_notes: sellerNotes || null,
    status: req.user.role === 'admin' ? 'active' : 'pending',
    created_at: new Date(),
    updated_at: new Date()
  };

  await executeQuery(
    'INSERT INTO product_distributions (id, product_id, seller_id, allocated_stock, markup_percentage, seller_price, seller_notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    Object.values(distributionData)
  );

  logger.info(`Product distribution created: ${productId} by seller ${req.userId}`);

  res.status(201).json({
    error: false,
    message: 'Product distribution created successfully',
    distribution: distributionData
  });
}));

// Get my products (for sellers)
router.get('/my-products', authenticateToken, requireAdminOrSeller, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    search,
    status
  } = req.query;

  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 20;
  const offset = (parsedPage - 1) * parsedLimit;
  const whereConditions = ['p.created_by = ?'];
  const params = [req.userId];

  if (category) {
    whereConditions.push('p.category_id = ?');
    params.push(category);
  }

  if (search) {
    whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (status) {
    whereConditions.push('p.is_active = ?');
    params.push(status === 'active');
  }

  const whereClause = whereConditions.join(' AND ');

  const products = await executeQuery(`
    SELECT 
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count
  const countResult = await executeQuery(`
    SELECT COUNT(*) as total
    FROM products p
    WHERE ${whereClause}
  `, params);

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / parsedLimit);

  // Parse JSON fields
  products.forEach(product => {
    if (product.images) {
      try {
        product.images = JSON.parse(product.images);
      } catch (e) {
        product.images = [];
      }
    }
    if (product.features) {
      try {
        product.features = JSON.parse(product.features);
      } catch (e) {
        product.features = [];
      }
    }
    if (product.specifications) {
      try {
        product.specifications = JSON.parse(product.specifications);
      } catch (e) {
        product.specifications = {};
      }
    }
    if (product.tags) {
      try {
        product.tags = JSON.parse(product.tags);
      } catch (e) {
        product.tags = [];
      }
    }
  });

  res.json({
    error: false,
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}));

module.exports = router;
