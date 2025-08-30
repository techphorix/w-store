# Complete Admin Overrides System

## Overview

The Admin Overrides system has been completely updated to handle all required metric fields consistently across backend and frontend. This system allows administrators to manually override seller dashboard statistics and ensures that all changes are permanently stored in the database.

## Supported Metric Fields

The system now supports the following **7 core metrics** that can be overridden by administrators:

### 1. **orders_sold** (Orders Sold)
- **Type**: Integer
- **Range**: 0 to ∞
- **Description**: Total number of orders sold by the seller
- **Validation**: Non-negative values only

### 2. **total_sales** (Total Sales)
- **Type**: Decimal
- **Range**: 0 to ∞
- **Description**: Total sales amount in currency
- **Validation**: Non-negative values only

### 3. **profit_forecast** (Profit Forecast)
- **Type**: Decimal
- **Range**: 0 to ∞
- **Description**: Projected profit for the seller
- **Validation**: Non-negative values only

### 4. **visitors** (Visitors)
- **Type**: Integer
- **Range**: 0 to ∞
- **Description**: Number of visitors to the seller's shop
- **Validation**: Non-negative values only

### 5. **shop_followers** (Shop Followers)
- **Type**: Integer
- **Range**: 0 to ∞
- **Description**: Number of followers for the seller's shop
- **Validation**: Non-negative values only

### 6. **shop_rating** (Shop Rating)
- **Type**: Decimal
- **Range**: 0.0 to 5.0
- **Description**: Average rating of the seller's shop
- **Validation**: Values between 0 and 5, with 0.1 step increments

### 7. **credit_score** (Credit Score)
- **Type**: Integer
- **Range**: 300 to 850
- **Description**: Credit score for the seller
- **Validation**: Values between 300 and 850

## Database Schema

### admin_overrides Table

```sql
CREATE TABLE admin_overrides (
  id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  override_value DECIMAL(15,2) DEFAULT '0.00',
  original_value DECIMAL(15,2) DEFAULT '0.00',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_override (seller_id, metric_name),
  KEY idx_seller_id (seller_id),
  KEY idx_metric_name (metric_name),
  CONSTRAINT admin_overrides_ibfk_1 FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Key Features:
- **Unique constraint**: One override per seller per metric
- **Foreign key**: Links to users table
- **Audit trail**: Tracks creation and update times
- **Original value**: Stores the system-generated value before override

## Backend API Endpoints

### 1. Get Seller Overrides
```
GET /api/admin/seller/:sellerId/overrides
```

**Response Format:**
```json
{
  "error": false,
  "user": {
    "id": "seller-id",
    "full_name": "Seller Name",
    "email": "seller@example.com",
    "role": "seller"
  },
  "overrides": [
    {
      "id": "override-id",
      "seller_id": "seller-id",
      "metric_name": "shop_followers",
      "override_value": "150.00",
      "original_value": "100.00",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "structuredOverrides": {
    "orders_sold": {
      "id": null,
      "value": 0,
      "original": 0,
      "hasOverride": false,
      "createdAt": null,
      "updatedAt": null
    },
    "total_sales": {
      "id": null,
      "value": 0,
      "original": 0,
      "hasOverride": false,
      "createdAt": null,
      "updatedAt": null
    },
    "profit_forecast": {
      "id": null,
      "value": 0,
      "original": 0,
      "hasOverride": false,
      "createdAt": null,
      "updatedAt": null
    },
    "visitors": {
      "id": null,
      "value": 0,
      "original": 0,
      "hasOverride": false,
      "createdAt": null,
      "updatedAt": null
    },
    "shop_followers": {
      "id": "override-id",
      "value": 150,
      "original": 100,
      "hasOverride": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    "shop_rating": {
      "id": null,
      "value": 0,
      "original": 0,
      "hasOverride": false,
      "createdAt": null,
      "updatedAt": null
    },
    "credit_score": {
      "id": null,
      "value": 0,
      "original": 0,
      "hasOverride": false,
      "createdAt": null,
      "updatedAt": null
    }
  },
  "hasOverrides": true,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 2. Create/Update Override
```
POST /api/admin/seller/:sellerId/overrides
```

**Request Body:**
```json
{
  "metricName": "shop_followers",
  "overrideValue": 150,
  "originalValue": 100
}
```

**Validation Rules:**
- `metricName` must be one of the 7 supported metrics
- `overrideValue` must be a valid number
- `shop_rating` must be between 0 and 5
- `credit_score` must be between 300 and 850
- Other metrics cannot be negative

### 3. Reset Override
```
DELETE /api/admin/seller/:sellerId/overrides/:metricName
```

**Description:** Removes the override and restores the original system value.

### 4. Clear Override
```
PUT /api/admin/seller/:sellerId/overrides/:metricName/clear
```

**Description:** Sets the override value to 0 while keeping the override record.

## Frontend Implementation

### SellerDataContext

The `SellerDataContext` has been updated to handle all required metric fields:

```typescript
interface SellerStats {
  // Core metrics that can be overridden by admin
  ordersSold: number;
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  profitForecast: number;
  visitors: number;
  shopFollowers: number;
  shopRating: number;
  creditScore: number;
  
  // Timeframe-specific fields
  todaySales: number;
  todayOrders: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  growthPercentage: number;
  totalProducts: number;
  totalCustomers: number;
  last7DaysOrders: number;
  last7DaysSales: number;
  last30DaysOrders: number;
  last30DaysSales: number;
}
```

### EditableMetricField Component

The `EditableMetricField` component provides:
- **Input validation** based on metric type
- **Range restrictions** for specific metrics
- **Step increments** (0.1 for ratings, 1 for others)
- **Admin-only editing** controls
- **Save/Reset/Clear** functionality

### Metric Name Mapping

Backend metric names are automatically mapped to frontend field names:

```typescript
const metricMapping = {
  'orders_sold': 'ordersSold',
  'total_sales': 'totalSales',
  'profit_forecast': 'profitForecast',
  'visitors': 'visitors',
  'shop_followers': 'shopFollowers',
  'shop_rating': 'shopRating',
  'credit_score': 'creditScore'
};
```

## Setup and Migration

### 1. Run Database Migration

```bash
cd backend
npm run migrate:admin-overrides
```

This will:
- Create the `admin_overrides` table if it doesn't exist
- Update existing table schema if needed
- Verify all required metrics are supported

### 2. Test the System

```bash
cd backend
npm run test:admin-overrides
```

This will:
- Test all metric fields
- Verify CRUD operations
- Check validation constraints
- Validate data types

### 3. Verify Frontend Integration

The frontend will automatically:
- Fetch overrides when loading seller data
- Apply overrides to displayed values
- Show admin editing controls
- Handle validation and error states

## Usage Examples

### For Administrators

1. **Navigate to Seller Management**
   - Go to Admin Panel → Sellers
   - Find the seller you want to edit

2. **Edit Metrics**
   - Click "Login as Seller" to impersonate
   - Use the editable metric fields
   - Set appropriate values for each metric

3. **Save Changes**
   - Click "Save" to store overrides
   - Changes are immediately saved to database
   - Sellers see updated values after refresh

### For Sellers

- **Seamless Experience**: Overridden values appear as normal
- **No Indication**: Unless "Admin Override Active" is shown
- **Persistence**: Values remain until admin changes them

## Data Flow

1. **Admin Edits Metric**
   - Frontend sends update to backend
   - Backend validates and stores in database
   - Override is linked to specific seller and metric

2. **Seller Views Dashboard**
   - Frontend fetches seller data
   - Backend includes overrides in response
   - Frontend applies overrides to display values

3. **Persistence**
   - All changes are stored permanently
   - Original values are preserved
   - Audit trail is maintained

## Error Handling

### Validation Errors
- **Invalid metric names**: Returns 400 with allowed values list
- **Invalid value types**: Returns 400 for non-numeric values
- **Range violations**: Returns 400 for out-of-range values

### Database Errors
- **Table missing**: Automatically creates table
- **Foreign key violations**: Returns 404 for non-existent users
- **Unique constraint**: Handles duplicate overrides gracefully

### Frontend Errors
- **API failures**: Shows error messages to users
- **Validation errors**: Highlights invalid inputs
- **Network issues**: Graceful fallback to cached data

## Security Features

- **Role-based access**: Only admins can edit metrics
- **Input validation**: Server-side validation of all inputs
- **Audit logging**: All changes are logged with admin identity
- **Session isolation**: Impersonation sessions are separate

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check database connection
   - Verify user permissions
   - Check for existing table conflicts

2. **Overrides Not Showing**
   - Verify table exists and has correct schema
   - Check API responses for override data
   - Verify seller ID is correct

3. **Edit Controls Not Visible**
   - Ensure user role is 'admin'
   - Check if impersonation is active
   - Verify component props are correct

4. **Validation Errors**
   - Check metric name spelling
   - Verify value ranges
   - Ensure numeric input types

### Debug Information

The system provides comprehensive logging:
- Override creation/updates
- Validation failures
- API request/response details
- Error conditions

Check backend logs for detailed debugging information.

## Future Enhancements

- **Bulk operations**: Edit multiple metrics at once
- **Templates**: Predefined override sets
- **Scheduling**: Time-based overrides
- **Analytics**: Override usage statistics
- **Notifications**: Alert when overrides are applied

## Support

For technical support or questions about the admin overrides system:
- Check the logs for error details
- Verify database schema is correct
- Test with the provided test script
- Review API responses for validation errors
