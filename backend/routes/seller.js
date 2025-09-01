const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');

const router = express.Router();

// Helper: safe parse JSON field
const safeParse = (str, fallback) => {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
};

// GET /api/seller/shop/:shopname
// Public endpoint to fetch seller by shop name (storeName or business_name)
router.get('/shop/:shopname', asyncHandler(async (req, res) => {
  const raw = req.params.shopname || '';
  const cleaned = raw.replace(/^@+/, '').trim();
  if (!cleaned) {
    return res.status(400).json({ error: true, message: 'Invalid shop name' });
  }

  // Match against business_info.storeName or business_name (case-insensitive)
  const sellerRows = await executeQuery(`
    SELECT 
      u.id, u.full_name, u.email, u.profile_image, u.business_info, u.created_at,
      COUNT(p.id) as total_products,
      COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
    FROM users u
    LEFT JOIN products p ON p.created_by = u.id
    WHERE u.role = 'seller' AND u.role != 'admin' AND u.status = 'active'
      AND (
        LOWER(JSON_UNQUOTE(JSON_EXTRACT(u.business_info, '$.storeName'))) = LOWER(?) OR
        LOWER(JSON_UNQUOTE(JSON_EXTRACT(u.business_info, '$.business_name'))) = LOWER(?) OR
        LOWER(u.full_name) = LOWER(?)
      )
    GROUP BY u.id
    LIMIT 1
  `, [cleaned, cleaned, cleaned]);

  if (sellerRows.length === 0) {
    // Fallback: fetch candidates and slug-match in JS to support names without spaces
    const candidates = await executeQuery(`
      SELECT 
        u.id, u.full_name, u.email, u.profile_image, u.business_info, u.created_at,
        COUNT(p.id) as total_products,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products
      FROM users u
      LEFT JOIN products p ON p.created_by = u.id
      WHERE u.role = 'seller' AND u.role != 'admin' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 500
    `);

    const slugify = (s) => String(s || '')
      .toLowerCase()
      .replace(/^@+/, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, '');

    const target = slugify(cleaned);
    let matched = null;
    for (const c of candidates) {
      const info = safeParse(c.business_info, {});
      const candidatesToCheck = [
        info.storeName,
        info.business_name,
        c.full_name
      ];
      if (candidatesToCheck.some(val => slugify(val) === target)) {
        matched = c;
        break;
      }
    }

    if (!matched) {
      return res.status(404).json({ error: true, message: 'Shop not found' });
    }

    const businessInfo = safeParse(matched.business_info, {});
    const responseSeller = {
      _id: matched.id,
      fullName: matched.full_name,
      profilePhoto: matched.profile_image,
      businessInfo: {
        storeName: businessInfo.storeName || businessInfo.business_name || matched.full_name,
        storeDescription: businessInfo.storeDescription || businessInfo.description || '',
        businessType: businessInfo.business_type || businessInfo.businessType || '',
        logo: businessInfo.logo || businessInfo.profileImage || null,
      },
      createdAt: matched.created_at,
    };
    const stats = {
      totalProducts: matched.total_products || 0,
      totalOrders: 0,
      rating: 4.8,
      followers: 0,
      following: 0,
    };
    return res.json({ error: false, seller: responseSeller, stats });
  }

  const seller = sellerRows[0];
  const businessInfo = safeParse(seller.business_info, {});

  // Compose response compatible with UserShop.tsx
  const responseSeller = {
    _id: seller.id,
    fullName: seller.full_name,
    profilePhoto: seller.profile_image,
    businessInfo: {
      storeName: businessInfo.storeName || businessInfo.business_name || seller.full_name,
      storeDescription: businessInfo.storeDescription || businessInfo.description || '',
      businessType: businessInfo.business_type || businessInfo.businessType || '',
      logo: businessInfo.logo || businessInfo.profileImage || null,
    },
    createdAt: seller.created_at,
  };

  const stats = {
    totalProducts: seller.total_products || 0,
    totalOrders: 0,
    rating: 4.8,
    followers: 0,
    following: 0,
  };

  res.json({ error: false, seller: responseSeller, stats });
}));

// GET /api/seller/:id/products
// Public endpoint mirroring users route for seller products
router.get('/:id/products', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, category, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20));
  const offset = (parsedPage - 1) * parsedLimit;

  // Ensure seller exists
  const seller = await executeQuery(
    "SELECT id FROM users WHERE id = ? AND role = 'seller' AND role != 'admin' AND status = 'active'",
    [id]
  );
  if (seller.length === 0) {
    return res.status(404).json({ error: true, message: 'Seller not found' });
  }

  let whereClause = 'p.created_by = ? AND p.is_active = TRUE';
  const params = [id];
  if (category) { whereClause += ' AND p.category_id = ?'; params.push(category); }
  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term);
  }

  const products = await executeQuery(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${whereClause}
    ORDER BY p.${sortBy} ${String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  const countResult = await executeQuery(
    `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`,
    params
  );
  const total = countResult[0]?.total || 0;
  const totalPages = Math.ceil(total / parsedLimit);

  // Parse JSON fields
  products.forEach(p => {
    p.images = safeParse(p.images, []);
    p.features = safeParse(p.features, []);
    p.specifications = safeParse(p.specifications, {});
    p.tags = safeParse(p.tags, []);
  });

  res.json({ error: false, products, total, totalPages, page: parsedPage, limit: parsedLimit });
}));

module.exports = router;
