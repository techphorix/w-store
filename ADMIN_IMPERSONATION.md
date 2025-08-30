# Admin Impersonation with Editable Seller Stats

## Overview

The Admin Impersonation feature allows administrators to log in as sellers and manually edit their dashboard statistics. This feature is useful for:

- Testing seller experiences
- Demonstrating platform capabilities
- Adjusting seller metrics for business purposes
- Providing customer support

## Features

### 1. Admin Impersonation
- Admins can click "Login as Seller" from the Sellers management page
- Redirects to the Seller Dashboard with admin privileges
- Shows an impersonation banner at the top

### 2. Editable Metrics
The following seller metrics can be edited by admins:

**Time-based Metrics:**
- Orders Sold (Today, Last 7 Days, Last 30 Days)
- Total Sales (Today, Last 7 Days, Last 30 Days)
- Profit Forecast (Today, Last 7 Days, Last 30 Days)
- Visitors (Today, Last 7 Days, Last 30 Days)

**Static Metrics:**
- Shop Followers
- Shop Rating
- Credit Score

### 3. Admin Controls
For each editable field, admins have access to:

- **Edit Button**: Opens input field for editing
- **Save Button**: Saves the new value to database
- **Reset to Default**: Restores original system-generated values
- **Clear Button**: Sets the value to 0

### 4. Database Storage
- Edits are stored in the `admin_overrides` table
- Links overrides to specific seller IDs
- Tracks original vs. overridden values
- Maintains audit trail with timestamps

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
  UNIQUE KEY unique_seller_metric (seller_id, metric_name),
  FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## API Endpoints

### Admin Routes
- `GET /admin/seller/:sellerId/overrides` - Get all overrides for a seller
- `POST /admin/seller/:sellerId/overrides` - Create/update an override
- `DELETE /admin/seller/:sellerId/overrides/:metricName` - Reset an override
- `PUT /admin/seller/:sellerId/overrides/:metricName/clear` - Clear an override

### Analytics Routes
- `GET /analytics/seller/dashboard` - Returns seller data with overrides applied

## Frontend Components

### EditableMetricField
A reusable component that provides:
- Display mode for non-admin users
- Edit mode for admin users
- Save/Reset/Clear functionality
- Error handling and validation
- Visual indicators for overridden values

### Dashboard Integration
The Seller Dashboard automatically:
- Detects admin overrides
- Shows overridden values instead of system values
- Displays "Admin Override Active" indicators
- Provides admin-only editing controls

## Usage Instructions

### For Administrators

1. **Navigate to Sellers Management**
   - Go to Admin Panel → Sellers
   - Find the seller you want to impersonate

2. **Start Impersonation**
   - Click "Login as Seller" button
   - You'll be redirected to the Seller Dashboard

3. **Edit Metrics**
   - Look for metrics with edit buttons
   - Click "Edit" to modify values
   - Use Save/Reset/Clear as needed

4. **Stop Impersonation**
   - Click "Stop Impersonation" in the banner
   - Return to Admin Panel

### For Sellers

- Sellers see overridden values seamlessly
- No indication that values were manually set (unless admin override is active)
- Normal dashboard functionality remains intact

## Security Features

- **Role-based Access**: Only admins can edit metrics
- **Impersonation Tracking**: All changes are logged with admin identity
- **Audit Trail**: Database maintains history of all overrides
- **Session Isolation**: Impersonation sessions are separate from admin sessions

## Migration

To set up the required database table:

```bash
cd backend
npm run migrate:admin-overrides
```

## Technical Implementation

### Backend
- New `admin_overrides` table with proper constraints
- API endpoints for CRUD operations on overrides
- Integration with existing analytics system
- Proper error handling and validation

### Frontend
- EditableMetricField component for metric editing
- Dashboard integration with override detection
- Admin-only UI controls
- Real-time value updates

### Data Flow
1. Admin edits metric value
2. Frontend sends update to backend
3. Backend stores override in database
4. Future dashboard requests include overrides
5. Sellers see overridden values automatically

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Ensure database connection is working
   - Check if table already exists
   - Verify user has CREATE TABLE permissions

2. **Overrides Not Showing**
   - Check if admin_overrides table exists
   - Verify seller ID is correct
   - Check API response for override data

3. **Edit Controls Not Visible**
   - Ensure user role is 'admin'
   - Check if impersonation is active
   - Verify component props are correct

### Debug Information

The system logs:
- Override creation/updates
- Impersonation events
- API request/response details
- Error conditions

Check logs for detailed debugging information.

## Future Enhancements

- Bulk metric editing
- Metric templates for common scenarios
- Advanced override scheduling
- Override approval workflows
- Enhanced audit reporting
