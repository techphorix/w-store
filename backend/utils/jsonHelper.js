/**
 * Utility functions for safe JSON parsing
 */

/**
 * Safely parse a JSON string, returning a default value if parsing fails
 * @param {string} jsonString - The JSON string to parse
 * @param {*} defaultValue - The default value to return if parsing fails
 * @returns {*} The parsed object or default value
 */
const safeJsonParse = (jsonString, defaultValue = {}) => {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }
  
  // Check for common invalid JSON patterns
  if (jsonString === '[object Object]' || jsonString === 'undefined' || jsonString === 'null') {
    return defaultValue;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.warn('JSON parsing failed:', { jsonString, error: error.message });
    return defaultValue;
  }
};

/**
 * Safely parse user-related JSON fields
 * @param {Object} user - User object with JSON fields
 * @returns {Object} User object with safely parsed JSON fields
 */
const safeParseUserFields = (user) => {
  if (!user) return user;
  
  return {
    ...user,
    business_info: safeJsonParse(user.business_info, {}),
    address: safeJsonParse(user.address, {}),
    preferences: safeJsonParse(user.preferences, {})
  };
};

/**
 * Safely parse product-related JSON fields
 * @param {Object} product - Product object with JSON fields
 * @returns {Object} Product object with safely parsed JSON fields
 */
const safeParseProductFields = (product) => {
  if (!product) return product;
  
  return {
    ...product,
    images: safeJsonParse(product.images, []),
    features: safeJsonParse(product.features, {}),
    specifications: safeJsonParse(product.specifications, {}),
    tags: safeJsonParse(product.tags, []),
    dimensions: safeJsonParse(product.dimensions, {}),
    options: safeJsonParse(product.options, {})
  };
};

/**
 * Safely parse order-related JSON fields
 * @param {Object} order - Order object with JSON fields
 * @returns {Object} Order object with safely parsed JSON fields
 */
const safeParseOrderFields = (order) => {
  if (!order) return order;
  
  return {
    ...order,
    shipping_address: safeJsonParse(order.shipping_address, {}),
    billing_address: safeJsonParse(order.billing_address, {}),
    customer_notes: safeJsonParse(order.customer_notes, ''),
    admin_notes: safeJsonParse(order.admin_notes, '')
  };
};

/**
 * Safely parse order item JSON fields
 * @param {Object} item - Order item object with JSON fields
 * @returns {Object} Order item object with safely parsed JSON fields
 */
const safeParseOrderItemFields = (item) => {
  if (!item) return item;
  
  return {
    ...item,
    options: safeJsonParse(item.options, {}),
    product_images: safeJsonParse(item.product_images, [])
  };
};

/**
 * Safely parse notification JSON fields
 * @param {Object} notification - Notification object with JSON fields
 * @returns {Object} Notification object with safely parsed JSON fields
 */
const safeParseNotificationFields = (notification) => {
  if (!notification) return notification;
  
  return {
    ...notification,
    data: safeJsonParse(notification.data, {}),
    action_button: safeJsonParse(notification.action_button, {})
  };
};

module.exports = {
  safeJsonParse,
  safeParseUserFields,
  safeParseProductFields,
  safeParseOrderFields,
  safeParseOrderItemFields,
  safeParseNotificationFields
};
