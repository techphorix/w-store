const express = require('express');
const { query, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Search products
router.get('/products', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('category').optional().isUUID().withMessage('Invalid category ID'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('sortBy').optional().isIn(['name', 'price', 'created_at', 'rating']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order')
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
    q: searchQuery,
    category,
    minPrice,
    maxPrice,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  let whereClause = 'p.is_active = TRUE';
  const params = [];

  // Search query
  whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ? OR p.tags LIKE ?)';
  const searchTerm = `%${searchQuery}%`;
  params.push(searchTerm, searchTerm, searchTerm, searchTerm);

  // Category filter
  if (category) {
    whereClause += ' AND p.category_id = ?';
    params.push(category);
  }

  // Price filters
  if (minPrice) {
    whereClause += ' AND p.price >= ?';
    params.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    whereClause += ' AND p.price <= ?';
    params.push(parseFloat(maxPrice));
  }

  const products = await executeQuery(`
    SELECT 
      p.*,
      c.name as category_name,
      c.slug as category_slug,
      u.full_name as seller_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE ${whereClause}
    ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
    LIMIT ?
  `, [...params, parseInt(limit)]);

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
    searchQuery,
    filters: {
      category,
      minPrice,
      maxPrice
    },
    total: products.length
  });
}));

// Get search suggestions
router.get('/suggestions', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { q: searchQuery, limit = 10 } = req.query;

  // Get product name suggestions
  const productSuggestions = await executeQuery(`
    SELECT DISTINCT name, 'product' as type
    FROM products
    WHERE is_active = TRUE AND name LIKE ?
    ORDER BY name ASC
    LIMIT ?
  `, [`${searchQuery}%`, parseInt(limit)]);

  // Get category suggestions
  const categorySuggestions = await executeQuery(`
    SELECT DISTINCT name, 'category' as type
    FROM categories
    WHERE is_active = TRUE AND name LIKE ?
    ORDER BY name ASC
    LIMIT ?
  `, [`${searchQuery}%`, parseInt(limit)]);

  // Get tag suggestions
  const tagSuggestions = await executeQuery(`
    SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) as tag, 'tag' as type
    FROM products
    WHERE is_active = TRUE AND tags IS NOT NULL AND tags LIKE ?
    LIMIT ?
  `, [`%${searchQuery}%`, parseInt(limit)]);

  const suggestions = [
    ...productSuggestions,
    ...categorySuggestions,
    ...tagSuggestions.filter(tag => tag.tag && tag.tag.includes(searchQuery))
  ].slice(0, parseInt(limit));

  res.json({
    error: false,
    suggestions,
    searchQuery
  });
}));

// Get search categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await executeQuery(`
    SELECT 
      c.*,
      COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
    WHERE c.is_active = TRUE
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `);

  res.json({
    error: false,
    categories
  });
}));

// Get search filters
router.get('/filters', asyncHandler(async (req, res) => {
  // Get price range
  const priceRange = await executeQuery(`
    SELECT 
      MIN(price) as min_price,
      MAX(price) as max_price
    FROM products
    WHERE is_active = TRUE
  `);

  // Get categories with product counts
  const categories = await executeQuery(`
    SELECT 
      c.id,
      c.name,
      c.slug,
      COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
    WHERE c.is_active = TRUE
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `);

  // Get brands with product counts
  const brands = await executeQuery(`
    SELECT 
      brand,
      COUNT(*) as product_count
    FROM products
    WHERE is_active = TRUE AND brand IS NOT NULL
    GROUP BY brand
    ORDER BY product_count DESC
    LIMIT 20
  `);

  res.json({
    error: false,
    filters: {
      priceRange: priceRange[0],
      categories,
      brands
    }
  });
}));

module.exports = router;
