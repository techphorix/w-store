const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, query } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Configure multer for category images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/categories'));
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
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'), false);
    }
  }
});

// Validation middleware
const validateCategory = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Category name must be between 2 and 255 characters'),
  body('slug').optional().trim().isLength({ min: 2, max: 255 }).matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('parentId').optional().isUUID().withMessage('Invalid parent category ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer')
];

// Get all categories with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search query too long'),
  query('parentId').optional().isUUID().withMessage('Invalid parent category ID'),
  query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Invalid status')
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
    limit = 50,
    search,
    parentId,
    status = 'all'
  } = req.query;

  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 50;
  const offset = (parsedPage - 1) * parsedLimit;
  const whereConditions = [];
  const params = [];

  if (status !== 'all') {
    whereConditions.push('c.is_active = ?');
    params.push(status === 'active');
  }

  if (parentId) {
    whereConditions.push('c.parent_id = ?');
    params.push(parentId);
  } else if (parentId === null) {
    whereConditions.push('c.parent_id IS NULL');
  }

  if (search) {
    whereConditions.push('(c.name LIKE ? OR c.description LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

  // Get categories with parent info and product count
  const categories = await executeQuery(`
    SELECT 
      c.*,
      pc.name as parent_name,
      pc.slug as parent_slug,
      COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN categories pc ON c.parent_id = pc.id
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
    WHERE ${whereClause}
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count for pagination
  const countResult = await executeQuery(`
    SELECT COUNT(*) as total
    FROM categories c
    WHERE ${whereClause}
  `, params);

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / parsedLimit);

  // Parse JSON fields
  categories.forEach(category => {
    if (category.features) {
      try {
        category.features = JSON.parse(category.features);
      } catch (e) {
        category.features = [];
      }
    }
  });

  res.json({
    error: false,
    categories,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages
    }
  });
}));

// Get single category by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await executeQuery(`
    SELECT 
      c.*,
      pc.name as parent_name,
      pc.slug as parent_slug,
      COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN categories pc ON c.parent_id = pc.id
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
    WHERE c.id = ?
    GROUP BY c.id
  `, [id]);

  if (category.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Category not found'
    });
  }

  const categoryData = category[0];

  // Parse JSON fields
  if (categoryData.features) {
    try {
      categoryData.features = JSON.parse(categoryData.features);
    } catch (e) {
      categoryData.features = [];
    }
  }

  res.json({
    error: false,
    category: categoryData
  });
}));

// Create new category
router.post('/', authenticateToken, requireAdmin, upload.single('image'), validateCategory, asyncHandler(async (req, res) => {
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
    slug,
    description,
    parentId,
    isActive = true,
    sortOrder = 0,
    features
  } = req.body;

  const image = req.file;

  // Generate slug if not provided
  let finalSlug = slug;
  if (!finalSlug) {
    finalSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Check if slug already exists
  const existingSlug = await executeQuery(
    'SELECT id FROM categories WHERE slug = ?',
    [finalSlug]
  );
  if (existingSlug.length > 0) {
    return res.status(400).json({
      error: true,
      message: 'Category with this slug already exists'
    });
  }

  // Check parent category if provided
  if (parentId) {
    const parentCategory = await executeQuery(
      'SELECT id FROM categories WHERE id = ?',
      [parentId]
    );
    if (parentCategory.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Parent category not found'
      });
    }
  }

  // Process image
  const imageUrl = image ? `/uploads/categories/${image.filename}` : null;

  const categoryId = uuidv4();
  const categoryData = {
    id: categoryId,
    name,
    slug: finalSlug,
    description: description || null,
    parent_id: parentId || null,
    image: imageUrl,
    is_active: isActive,
    sort_order: parseInt(sortOrder) || 0,
    features: features ? JSON.stringify(features) : null,
    created_at: new Date(),
    updated_at: new Date()
  };

  await executeQuery(
    'INSERT INTO categories (id, name, slug, description, parent_id, image, is_active, sort_order, features, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    Object.values(categoryData)
  );

  logger.info(`New category created: ${name} by admin ${req.userId}`);

  res.status(201).json({
    error: false,
    message: 'Category created successfully',
    category: { ...categoryData, id: categoryId }
  });
}));

// Update category
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), validateCategory, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const image = req.file;

  // Check if category exists
  const existingCategory = await executeQuery(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );

  if (existingCategory.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Category not found'
    });
  }

  const {
    name,
    slug,
    description,
    parentId,
    isActive,
    sortOrder,
    features
  } = req.body;

  // Check if slug already exists (if changed)
  if (slug && slug !== existingCategory[0].slug) {
    const existingSlug = await executeQuery(
      'SELECT id FROM categories WHERE slug = ? AND id != ?',
      [slug, id]
    );
    if (existingSlug.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Category with this slug already exists'
      });
    }
  }

  // Check parent category if provided
  if (parentId && parentId !== existingCategory[0].parent_id) {
    // Prevent circular references
    if (parentId === id) {
      return res.status(400).json({
        error: true,
        message: 'Category cannot be its own parent'
      });
    }

    const parentCategory = await executeQuery(
      'SELECT id FROM categories WHERE id = ?',
      [parentId]
    );
    if (parentCategory.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Parent category not found'
      });
    }
  }

  // Process new image
  const imageUrl = image ? `/uploads/categories/${image.filename}` : undefined;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (slug !== undefined) {
    updates.push('slug = ?');
    params.push(slug);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (parentId !== undefined) {
    updates.push('parent_id = ?');
    params.push(parentId);
  }
  if (imageUrl !== undefined) {
    updates.push('image = ?');
    params.push(imageUrl);
  }
  if (isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(isActive);
  }
  if (sortOrder !== undefined) {
    updates.push('sort_order = ?');
    params.push(parseInt(sortOrder));
  }
  if (features !== undefined) {
    updates.push('features = ?');
    params.push(features ? JSON.stringify(features) : null);
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
    `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info(`Category updated: ${id} by admin ${req.userId}`);

  res.json({
    error: false,
    message: 'Category updated successfully'
  });
}));

// Delete category
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if category exists
  const existingCategory = await executeQuery(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );

  if (existingCategory.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Category not found'
    });
  }

  // Check if category has products
  const products = await executeQuery(
    'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
    [id]
  );

  if (products[0].count > 0) {
    return res.status(400).json({
      error: true,
      message: 'Cannot delete category with existing products. Please reassign or delete products first.'
    });
  }

  // Check if category has subcategories
  const subcategories = await executeQuery(
    'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
    [id]
  );

  if (subcategories[0].count > 0) {
    return res.status(400).json({
      error: true,
      message: 'Cannot delete category with subcategories. Please delete subcategories first.'
    });
  }

  // Delete category
  await executeQuery(
    'DELETE FROM categories WHERE id = ?',
    [id]
  );

  logger.info(`Category deleted: ${id} by admin ${req.userId}`);

  res.json({
    error: false,
    message: 'Category deleted successfully'
  });
}));

// Get category tree (hierarchical structure)
router.get('/tree/all', asyncHandler(async (req, res) => {
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

  // Build hierarchical tree
  const buildTree = (parentId = null) => {
    return categories
      .filter(cat => cat.parent_id === parentId)
      .map(cat => ({
        ...cat,
        children: buildTree(cat.id)
      }));
  };

  const categoryTree = buildTree();

  res.json({
    error: false,
    categories: categoryTree
  });
}));

// Get category statistics
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = await executeQuery(`
    SELECT 
      COUNT(*) as total_categories,
      COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_categories,
      COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_categories,
      COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as sub_categories,
      AVG(product_counts.product_count) as avg_products_per_category
    FROM categories c
    LEFT JOIN (
      SELECT category_id, COUNT(*) as product_count
      FROM products
      WHERE is_active = TRUE
      GROUP BY category_id
    ) product_counts ON c.id = product_counts.category_id
  `);

  res.json({
    error: false,
    stats: stats[0]
  });
}));

module.exports = router;
