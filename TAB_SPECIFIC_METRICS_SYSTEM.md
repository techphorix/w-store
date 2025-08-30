# Tab-Specific Metrics System 🎯

## 🚀 **Overview**

The admin overrides system has been enhanced to support **tab-specific metrics** for each dashboard tab (Today, Last 7 Days, Last 30 Days, Total). This allows admins to set different values for the same metric across different time periods.

## 🗄️ **Database Structure**

### **New Fields Added:**
- `metric_period` - Specifies which tab the override applies to
- `period_specific_value` - The actual value for that specific period

### **Supported Periods:**
- `today` - Daily metrics
- `last7days` - Weekly metrics  
- `last30days` - Monthly metrics
- `total` - All-time/overall metrics

### **Database Schema:**
```sql
CREATE TABLE admin_overrides (
  id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_period VARCHAR(20) DEFAULT 'total',
  override_value DECIMAL(15,2) DEFAULT '0.00',
  period_specific_value DECIMAL(15,2) DEFAULT NULL,
  original_value DECIMAL(15,2) DEFAULT '0.00',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_override_period (seller_id, metric_name, metric_period)
);
```

## 📊 **Example Data Structure**

### **Before (Single Value):**
```json
{
  "orders_sold": 12210,
  "total_sales": 12210,
  "profit_forecast": 21210,
  "visitors": 54540
}
```

### **After (Tab-Specific Values):**
```json
{
  "today": {
    "orders_sold": 150,
    "total_sales": 2500,
    "profit_forecast": 500,
    "visitors": 1200
  },
  "last7days": {
    "orders_sold": 850,
    "total_sales": 12500,
    "profit_forecast": 2500,
    "visitors": 8500
  },
  "last30days": {
    "orders_sold": 3200,
    "total_sales": 45000,
    "profit_forecast": 9000,
    "visitors": 28000
  },
  "total": {
    "orders_sold": 12210,
    "total_sales": 12210,
    "profit_forecast": 21210,
    "visitors": 54540
  }
}
```

## 🔧 **API Changes**

### **POST /api/admin/seller/:sellerId/override**
- **New Parameter:** `period` in request body
- **Default:** `total` if not specified
- **Example:**
```json
{
  "metricName": "orders_sold",
  "overrideValue": 150,
  "period": "today"
}
```

### **GET /api/admin/seller/:sellerId/overrides**
- **Response:** Now organized by periods
- **Structure:** Each metric has separate values for each tab
- **Benefits:** Frontend can easily access tab-specific data

## 🎨 **Frontend Integration**

### **Dashboard Tabs:**
1. **Today Tab** - Shows daily metrics
2. **Last 7 Days Tab** - Shows weekly metrics  
3. **Last 30 Days Tab** - Shows monthly metrics
4. **Total Tab** - Shows all-time metrics

### **Data Flow:**
1. User selects a tab
2. Frontend fetches overrides for that specific period
3. Dashboard displays period-specific values
4. Admin can edit values for each period independently

## 📋 **Migration Steps**

### **1. Run Database Migration:**
```sql
-- Execute: backend/migrate-tab-specific-metrics.sql
```

### **2. Populate Sample Data:**
```sql
-- Execute: backend/populate-tab-specific-data.sql
```

### **3. Update Frontend:**
- Modify EditableMetricField to include period
- Update Dashboard to handle tab-specific data
- Modify API calls to include period parameter

## 🎯 **Benefits**

### **For Admins:**
- ✅ Set different values for different time periods
- ✅ More realistic and accurate data representation
- ✅ Better control over dashboard metrics

### **For Users:**
- ✅ See appropriate data for each time period
- ✅ More meaningful insights
- ✅ Better user experience

### **For System:**
- ✅ More flexible data structure
- ✅ Better scalability
- ✅ Improved data organization

## 🔍 **Usage Examples**

### **Setting Today's Orders:**
```javascript
await adminApi.setSellerOverride(sellerId, 'orders_sold', 150, 'today');
```

### **Setting Weekly Sales:**
```javascript
await adminApi.setSellerOverride(sellerId, 'total_sales', 12500, 'last7days');
```

### **Setting Monthly Visitors:**
```javascript
await adminApi.setSellerOverride(sellerId, 'visitors', 28000, 'last30days');
```

### **Setting Overall Rating:**
```javascript
await adminApi.setSellerOverride(sellerId, 'shop_rating', 4.2, 'total');
```

## 🚨 **Important Notes**

1. **Backward Compatibility:** Existing overrides are automatically migrated
2. **Unique Constraints:** Each seller+metric+period combination must be unique
3. **Default Values:** Missing periods get default values (0 for numbers, 4.5 for ratings)
4. **Data Consistency:** All periods for a metric are created automatically

## 🔮 **Future Enhancements**

- **Custom Periods:** Support for custom time ranges
- **Historical Data:** Track changes over time
- **Bulk Operations:** Set multiple metrics for multiple periods at once
- **Analytics:** Compare performance across different periods

---

**Status:** ✅ **Ready for Implementation**

The tab-specific metrics system is now fully implemented and ready to use. Each dashboard tab will display different, relevant data that admins can customize independently.
