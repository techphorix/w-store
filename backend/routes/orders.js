const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, query } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticateToken, requireAdminOrSeller } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateOrder = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.productId').isUUID().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.fullName').notEmpty().withMessage('Full name is required'),
  body('shippingAddress.address').notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('ZIP code is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone number is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required')
];

// Get orders with filtering and pagination
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).withMessage('Invalid status'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search query too long')
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
    status,
    startDate,
    endDate,
    search
  } = req.query;

  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 20;
  const offset = (parsedPage - 1) * parsedLimit;
  const whereConditions = [];
  const params = [];

  // Filter by user role
  if (req.user.role === 'seller') {
    whereConditions.push('o.seller_id = ?');
    params.push(req.userId);
  } else if (req.user.role === 'user') {
    whereConditions.push('o.customer_id = ?');
    params.push(req.userId);
  }
  // Admin can see all orders

  if (status) {
    whereConditions.push('o.status = ?');
    params.push(status);
  }

  if (startDate) {
    whereConditions.push('o.created_at >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('o.created_at <= ?');
    params.push(endDate + ' 23:59:59');
  }

  if (search) {
    whereConditions.push('(o.order_number LIKE ? OR oi.product_name LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

  // Get orders with customer and seller info
  const orders = await executeQuery(`
    SELECT DISTINCT
      o.*,
      c.full_name as customer_name,
      c.email as customer_email,
      c.phone_number as customer_phone,
      s.full_name as seller_name,
      s.email as seller_email
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.id
    LEFT JOIN users s ON o.seller_id = s.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parsedLimit, offset]);

  // Get total count for pagination
  const countResult = await executeQuery(`
    SELECT COUNT(DISTINCT o.id) as total
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE ${whereClause}
  `, params);

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / parsedLimit);

  // Also include synthetic orders for sellers (generated from overrides)
  let syntheticOrders = [];
  if (req.user.role === 'seller') {
    try {
      // Build synthetic filter
      const synthWhere = ['seller_id = ?'];
      const synthParams = [req.userId];
      if (status) {
        synthWhere.push('status = ?');
        synthParams.push(status);
      }
      if (startDate) {
        synthWhere.push('created_at >= ?');
        synthParams.push(startDate);
      }
      if (endDate) {
        synthWhere.push('created_at <= ?');
        synthParams.push(endDate + ' 23:59:59');
      }
      if (search) {
        synthWhere.push('(order_number LIKE ? OR customer_name LIKE ?)');
        const t = `%${search}%`;
        synthParams.push(t, t);
      }
      const synthWhereClause = synthWhere.join(' AND ');
      syntheticOrders = await executeQuery(`
        SELECT 
          id,
          order_number,
          NULL as customer_id,
          seller_id,
          status,
          total_amount,
          subtotal,
          tax_amount,
          shipping_amount,
          created_at,
          updated_at,
          customer_name,
          customer_email
        FROM synthetic_orders
        WHERE ${synthWhereClause}
        ORDER BY created_at DESC
      `, synthParams);
    } catch (e) {
      logger.warn('Failed to fetch synthetic orders (non-fatal):', e.message);
    }
  }

  // Parse JSON fields
  orders.forEach(order => {
    if (order.shipping_address) {
      try {
        order.shipping_address = JSON.parse(order.shipping_address);
      } catch (e) {
        order.shipping_address = {};
      }
    }
    if (order.billing_address) {
      try {
        order.billing_address = JSON.parse(order.billing_address);
      } catch (e) {
        order.billing_address = {};
      }
    }
  });

  // Merge and paginate on the application side for sellers
  let mergedOrders = orders;
  let mergedTotal = total;
  if (req.user.role === 'seller') {
    mergedOrders = [...orders, ...syntheticOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    mergedTotal = mergedOrders.length;
    const start = (parsedPage - 1) * parsedLimit;
    const end = start + parsedLimit;
    mergedOrders = mergedOrders.slice(start, end);
  }

  res.json({
    error: false,
    orders: req.user.role === 'seller' ? mergedOrders : orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: req.user.role === 'seller' ? mergedTotal : total,
      totalPages: req.user.role === 'seller' ? Math.ceil(mergedTotal / parsedLimit) : totalPages
    }
  });
}));

// Get single order by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get order details
  const order = await executeQuery(`
    SELECT 
      o.*,
      c.full_name as customer_name,
      c.email as customer_email,
      c.phone_number as customer_phone,
      s.full_name as seller_name,
      s.email as seller_email
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.id
    LEFT JOIN users s ON o.seller_id = s.id
    WHERE o.id = ?
  `, [id]);

  if (order.length === 0) {
    // Try synthetic orders fallback
    try {
      const synth = await executeQuery(
        'SELECT * FROM synthetic_orders WHERE id = ?',
        [id]
      );
      if (synth.length > 0) {
        const s = synth[0];
        // Minimal shape compatible with frontend
        return res.json({
          error: false,
          order: {
            ...s,
            customer_name: s.customer_name,
            customer_email: s.customer_email,
            seller_name: null,
            seller_email: null
          },
          items: await executeQuery('SELECT * FROM synthetic_order_items WHERE order_id = ?', [id])
        });
      }
    } catch (e) {
      // ignore
    }
    return res.status(404).json({
      error: true,
      message: 'Order not found'
    });
  }

  const orderData = order[0];

  // Check access permissions
  if (req.user.role === 'user' && orderData.customer_id !== req.userId) {
    return res.status(403).json({
      error: true,
      message: 'Access denied'
    });
  }

  if (req.user.role === 'seller' && orderData.seller_id !== req.userId) {
    return res.status(403).json({
      error: true,
      message: 'Access denied'
    });
  }

  // Get order items
  const orderItems = await executeQuery(`
    SELECT 
      oi.*,
      p.name as product_name,
      p.images as product_images,
      p.sku as product_sku
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [id]);

  // Parse JSON fields
  if (orderData.shipping_address) {
    try {
      orderData.shipping_address = JSON.parse(orderData.shipping_address);
    } catch (e) {
      orderData.shipping_address = {};
    }
  }
  if (orderData.billing_address) {
    try {
      orderData.billing_address = JSON.parse(orderData.billing_address);
    } catch (e) {
      orderData.billing_address = {};
    }
  }

  orderItems.forEach(item => {
    if (item.product_images) {
      try {
        item.product_images = JSON.parse(item.product_images);
      } catch (e) {
        item.product_images = [];
      }
    }
    if (item.options) {
      try {
        item.options = JSON.parse(item.options);
      } catch (e) {
        item.options = {};
      }
    }
  });

  res.json({
    error: false,
    order: orderData,
    items: orderItems
  });
}));

// Create new order
router.post('/', authenticateToken, validateOrder, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    items,
    shippingAddress,
    billingAddress,
    paymentMethod,
    customerNotes
  } = req.body;

  // Validate items and calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await executeQuery(
      'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
      [item.productId]
    );

    if (product.length === 0) {
      return res.status(400).json({
        error: true,
        message: `Product ${item.productId} not found or not active`
      });
    }

    const productData = product[0];
    
    // Check stock availability
    if (productData.track_inventory && productData.stock_quantity < item.quantity) {
      if (!productData.allow_backorders) {
        return res.status(400).json({
          error: true,
          message: `Insufficient stock for product ${productData.name}. Available: ${productData.stock_quantity}`
        });
      }
    }

    const itemTotal = productData.price * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      productId: item.productId,
      productName: productData.name,
      productSku: productData.sku,
      quantity: item.quantity,
      unitPrice: productData.price,
      totalPrice: itemTotal,
      options: item.options || {}
    });
  }

  // Calculate totals
  const taxAmount = subtotal * 0.1; // 10% tax (configurable)
  const shippingAmount = 0; // Free shipping for now
  const totalAmount = subtotal + taxAmount + shippingAmount;

  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Create order
  const orderId = uuidv4();
  const orderData = {
    id: orderId,
    order_number: orderNumber,
    customer_id: req.userId,
    seller_id: null, // Will be set based on first product
    status: 'pending',
    total_amount: totalAmount,
    subtotal: subtotal,
    tax_amount: taxAmount,
    shipping_amount: shippingAmount,
    discount_amount: 0,
    payment_method: paymentMethod,
    payment_status: 'pending',
    shipping_address: JSON.stringify(shippingAddress),
    billing_address: JSON.stringify(billingAddress || shippingAddress),
    customer_notes: customerNotes || null,
    created_at: new Date(),
    updated_at: new Date()
  };

  // Use transaction to ensure data consistency
  await executeTransaction([
    {
      query: 'INSERT INTO orders (id, order_number, customer_id, seller_id, status, total_amount, subtotal, tax_amount, shipping_amount, discount_amount, payment_method, payment_status, shipping_address, billing_address, customer_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params: Object.values(orderData)
    }
  ]);

  // Create order items and update stock
  for (const item of orderItems) {
    await executeTransaction([
      {
        query: 'INSERT INTO order_items (id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price, options, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [uuidv4(), orderId, item.productId, item.productName, item.productSku, item.quantity, item.unitPrice, item.totalPrice, JSON.stringify(item.options), new Date()]
      },
      {
        query: 'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?',
        params: [item.quantity, new Date(), item.productId]
      }
    ]);
  }

  // Set seller_id based on first product (assuming single seller per order for now)
  if (orderItems.length > 0) {
    const firstProduct = await executeQuery(
      'SELECT created_by FROM products WHERE id = ?',
      [orderItems[0].productId]
    );
    
    if (firstProduct.length > 0) {
      await executeQuery(
        'UPDATE orders SET seller_id = ? WHERE id = ?',
        [firstProduct[0].created_by, orderId]
      );
      orderData.seller_id = firstProduct[0].created_by;
    }
  }

  logger.info(`New order created: ${orderNumber} by customer ${req.userId}`);

  res.status(201).json({
    error: false,
    message: 'Order created successfully',
    order: { ...orderData, id: orderId },
    items: orderItems
  });
}));

// Update order status
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).withMessage('Invalid status'),
  body('note').optional().isLength({ max: 500 }).withMessage('Note too long'),
  body('trackingNumber').optional().isLength({ max: 100 }).withMessage('Tracking number too long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { status, note, trackingNumber } = req.body;

  // Check if order exists
  const order = await executeQuery(
    'SELECT * FROM orders WHERE id = ?',
    [id]
  );

  if (order.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Order not found'
    });
  }

  const orderData = order[0];

  // Check access permissions
  if (req.user.role === 'user' && orderData.customer_id !== req.userId) {
    return res.status(403).json({
      error: true,
      message: 'Access denied'
    });
  }

  if (req.user.role === 'seller' && orderData.seller_id !== req.userId) {
    return res.status(403).json({
      error: true,
      message: 'Access denied'
    });
  }

  // Update order status
  const updates = ['status = ?', 'updated_at = ?'];
  const params = [status, new Date()];

  if (note) {
    updates.push('admin_notes = ?');
    params.push(note);
  }

  if (trackingNumber) {
    updates.push('tracking_number = ?');
    params.push(trackingNumber);
  }

  if (status === 'shipped') {
    updates.push('estimated_delivery = ?');
    params.push(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  }

  params.push(id);

  await executeQuery(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info(`Order status updated: ${id} to ${status} by user ${req.userId}`);

  res.json({
    error: false,
    message: 'Order status updated successfully'
  });
}));

// Cancel order
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if order exists
  const order = await executeQuery(
    'SELECT * FROM orders WHERE id = ?',
    [id]
  );

  if (order.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Order not found'
    });
  }

  const orderData = order[0];

  // Check access permissions
  if (req.user.role === 'seller' && orderData.customer_id !== req.userId) {
    return res.status(403).json({
      error: true,
      message: 'Access denied'
    });
  }

  if (req.user.role === 'seller' && orderData.seller_id !== req.userId) {
    return res.status(403).json({
      error: true,
      message: 'Access denied'
    });
  }

  // Check if order can be cancelled
  if (!['pending', 'confirmed'].includes(orderData.status)) {
    return res.status(400).json({
      error: true,
      message: 'Order cannot be cancelled in current status'
    });
  }

  // Use transaction to cancel order and restore stock
  const orderItems = await executeQuery(
    'SELECT * FROM order_items WHERE order_id = ?',
    [id]
  );

  const queries = [
    {
      query: 'UPDATE orders SET status = "cancelled", updated_at = ? WHERE id = ?',
      params: [new Date(), id]
    }
  ];

  // Restore stock for each item
  for (const item of orderItems) {
    queries.push({
      query: 'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?',
      params: [item.quantity, new Date(), item.product_id]
    });
  }

  await executeTransaction(queries);

  logger.info(`Order cancelled: ${id} by user ${req.userId}`);

  res.json({
    error: false,
    message: 'Order cancelled successfully'
  });
}));

// Get order statistics
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const whereConditions = [];
  const params = [];

  // Filter by user role
  if (req.user.role === 'seller') {
    whereConditions.push('seller_id = ?');
    params.push(req.userId);
  } else if (req.user.role === 'user') {
    whereConditions.push('customer_id = ?');
    params.push(req.userId);
  }

  const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

  const stats = await executeQuery(`
    SELECT 
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
      COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
      COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_orders,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as average_order_value
    FROM orders
    WHERE ${whereClause}
  `, params);

  res.json({
    error: false,
    stats: stats[0]
  });
}));

// Get order analytics
router.get('/analytics', authenticateToken, [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { days = 7 } = req.query;
  const whereConditions = [];
  const params = [];

  // Filter by user role
  if (req.user.role === 'seller') {
    whereConditions.push('seller_id = ?');
    params.push(req.userId);
  } else if (req.user.role === 'customer') {
    whereConditions.push('customer_id = ?');
    params.push(req.userId);
  }

  whereConditions.push('created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
  params.push(parseInt(days));

  const whereClause = whereConditions.join(' AND ');

  const analytics = await executeQuery(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as order_count,
      SUM(total_amount) as daily_revenue,
      AVG(total_amount) as average_order_value
    FROM orders
    WHERE ${whereClause}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, params);

  res.json({
    error: false,
    analytics
  });
}));

module.exports = router;
