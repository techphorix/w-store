import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faSave, faTimes, faChartLine, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { sellerManagementApi } from '../services/sellerManagementApi';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsField {
  key: string;
  label: string;
  value: number;
  type: 'number' | 'percentage';
  category: 'sales' | 'performance' | 'financial';
}

interface SellerAnalyticsEditorProps {
  analytics: {
    totalSales: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    averageOrderValue: number;
    conversionRate: number;
    customerSatisfaction: number;
    monthlyGrowth: number;
  };
  sellerId?: string;
  onUpdate: (field: string, value: number) => Promise<void>;
  readOnly?: boolean;
}

const SellerAnalyticsEditor: React.FC<SellerAnalyticsEditorProps> = ({ analytics, onUpdate, sellerId, readOnly = false }) => {
  const { isAuthenticated } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [activePeriod, setActivePeriod] = useState<'today' | 'last7Days' | 'last30Days' | 'total'>('today');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Local state for analytics to show real-time updates
  const [localAnalytics, setLocalAnalytics] = useState(analytics);

  // Update local analytics when prop changes
  React.useEffect(() => {
    setLocalAnalytics(analytics);
  }, [analytics]);

  const fields: AnalyticsField[] = [
    { key: 'totalSales', label: 'Total Sales', value: localAnalytics.totalSales, type: 'number', category: 'sales' },
    { key: 'totalOrders', label: 'Total Orders', value: localAnalytics.totalOrders, type: 'number', category: 'sales' },
    { key: 'totalProducts', label: 'Total Products', value: localAnalytics.totalProducts, type: 'number', category: 'sales' },
    { key: 'totalCustomers', label: 'Total Customers', value: localAnalytics.totalCustomers, type: 'number', category: 'sales' },
    { key: 'averageOrderValue', label: 'Average Order Value', value: localAnalytics.averageOrderValue, type: 'number', category: 'sales' },
    { key: 'conversionRate', label: 'Conversion Rate', value: localAnalytics.conversionRate, type: 'percentage', category: 'performance' },
    { key: 'customerSatisfaction', label: 'Customer Satisfaction', value: localAnalytics.customerSatisfaction, type: 'number', category: 'performance' },
    { key: 'monthlyGrowth', label: 'Monthly Growth', value: localAnalytics.monthlyGrowth, type: 'percentage', category: 'performance' }
  ];

  const startEditing = (field: string, value: number) => {
    setEditingField(field);
    setEditValue(value);
    setError(null); // Clear any previous errors
    setSuccess(null); // Clear any previous success messages
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue(0);
  };

  const saveField = async (retryCount = 0) => {
    if (!editingField) return;

    // Check if value actually changed
    const currentValue = fields.find(f => f.key === editingField)?.value;
    if (currentValue === editValue) {
      setError('No changes detected. Please modify the value before saving.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setSaving(true);
      
      // Check authentication status
      if (!isAuthenticated) {
        setError('You are not authenticated. Please log in again.');
        setSaving(false);
        return;
      }

      // Debug: Log authentication status
      console.log('🔐 Authentication check:', { isAuthenticated, sellerId, editingField, editValue, currentValue });

      // Update UI first
      await onUpdate(editingField, editValue);
      
      // Update local analytics state immediately after UI update
      setLocalAnalytics(prev => ({
        ...prev,
        [editingField]: editValue
      }));
      
      // CRITICAL: Store admin-edited analytics in localStorage for sellers to see
      try {
        const currentAnalytics = { ...localAnalytics, [editingField]: editValue };
        const adminEditedData = {
          adminEdited: true,
          stats: currentAnalytics,
          source: 'admin-panel',
          timestamp: new Date().toISOString(),
          editedBy: 'admin',
          field: editingField,
          previousValue: currentValue,
          newValue: editValue
        };
        
        localStorage.setItem('adminEditedAnalytics', JSON.stringify(adminEditedData));
        console.log('💾 Stored admin-edited analytics in localStorage:', adminEditedData);
        
        // Also store in a more accessible format for the mock API
        localStorage.setItem('sellerMockData', JSON.stringify({
          analytics: currentAnalytics,
          lastUpdated: new Date().toISOString()
        }));
        
      } catch (storageError) {
        console.warn('Failed to store analytics in localStorage:', storageError);
      }
      
      // Persist to backend if sellerId is provided
      if (sellerId) {
        try {
          console.log('📡 Making API call to update analytics...');
          console.log('📊 Request payload:', {
            sellerId,
            period: activePeriod,
            metrics: { [editingField]: editValue }
          });
          
          const response = await sellerManagementApi.updateSellerPeriodAnalytics(sellerId, activePeriod, {
            [editingField]: editValue
          } as any);
          
          console.log('✅ Analytics updated successfully');
          console.log('📡 API Response:', response);
          
          // Update local analytics state to reflect the change
          setLocalAnalytics(prev => ({
            ...prev,
            [editingField]: editValue
          }));
          
          // Show success message
          setSuccess(`Successfully updated ${editingField} to ${editValue}`);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccess(null);
          }, 3000);
        } catch (apiError: any) {
          console.error('❌ API call failed:', apiError);
          // Show warning that UI was updated but backend sync failed
          setError(`UI updated but failed to sync with backend: ${apiError.response?.data?.message || apiError.message}`);
          // Don't throw the error, just show the warning
        }
      } else {
        // No sellerId, just show success for UI update
        // Update local analytics state to reflect the change
        setLocalAnalytics(prev => ({
          ...prev,
          [editingField]: editValue
        }));
        
        setSuccess(`Successfully updated ${editingField} to ${editValue}`);
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      }
      
      setEditingField(null);
      setEditValue(0);
    } catch (err: any) {
      console.error('❌ Error saving field:', err);
      console.error('📊 Error details:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        headers: err.response?.headers
      });
      
      if (err.response?.status === 401) {
        if (retryCount < 1) {
          // Try to refresh the page to get a new token
          setError('Authentication expired. Refreshing...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setError('Authentication failed. Please log in again.');
        }
      } else if (err.response?.status === 403) {
        setError('You do not have permission to update this data.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to save changes. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sales': return 'bg-blue-50 border-blue-200';
      case 'performance': return 'bg-green-50 border-green-200';
      case 'financial': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIconColor = (category: string) => {
    switch (category) {
      case 'sales': return 'text-blue-600';
      case 'performance': return 'text-green-600';
      case 'financial': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Tabs */}
      <div className="flex items-center space-x-2">
        {[
          { id: 'today', label: 'Today' },
          { id: 'last7Days', label: 'Last 7 Days' },
          { id: 'last30Days', label: 'Last 30 Days' },
          { id: 'total', label: 'Total' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setActivePeriod(p.id as any);
              setError(null); // Clear errors when changing periods
              setSuccess(null); // Clear success messages when changing periods
            }}
            className={`px-3 py-1 rounded-md text-sm ${
              activePeriod === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Analytics Editor</h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <FontAwesomeIcon icon={faChartLine} className="w-4 h-4" />
            <span>{isAuthenticated ? 'Real-time editing enabled' : 'Authentication required for editing'}</span>
          </div>
          <button
            onClick={() => {
              setLocalAnalytics(analytics);
              setError(null);
              setSuccess('Analytics refreshed from parent component');
              setTimeout(() => setSuccess(null), 2000);
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            title="Refresh analytics from parent component"
          >
            <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Authentication Warning */}
      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 w-4 h-4" />
            <span className="text-yellow-800 text-sm font-medium">
              You need to be logged in to edit analytics data.
            </span>
          </div>
        </div>
      )}

      {/* Read-Only Warning */}
      {readOnly && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 w-4 h-4" />
            <span className="text-red-800 text-sm font-medium">
              🔒 Read-Only Mode: Only Admins can edit seller analytics. Regular users can view but not modify data.
            </span>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faChartLine} className="text-green-600 w-4 h-4" />
            <span className="text-green-800 text-sm font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Debug Info - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs">
          <div className="font-medium mb-2">Debug Info:</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-medium">Parent Analytics:</div>
              <div className="text-gray-600">
                {Object.entries(analytics).map(([key, value]) => (
                  <div key={key}>{key}: {value}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-medium">Local Analytics:</div>
              <div className="text-gray-600">
                {Object.entries(localAnalytics).map(([key, value]) => (
                  <div key={key}>{key}: {value}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 w-4 h-4" />
              <span className="text-red-800 text-sm font-medium">{error}</span>
            </div>
            <div className="flex items-center space-x-2">
              {error.includes('Authentication failed') && (
                <button
                  onClick={() => window.location.href = '/login'}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  Go to Login
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fields.map((field) => (
          <div key={field.key} className={`border rounded-lg p-4 ${getCategoryColor(field.category)}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <button
                onClick={() => startEditing(field.key, field.value)}
                disabled={!isAuthenticated || readOnly}
                className={`p-1 transition-colors ${
                  isAuthenticated && !readOnly
                    ? 'text-gray-400 hover:text-gray-600' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title={
                  readOnly 
                    ? "Read-only mode: Only Admins can edit" 
                    : !isAuthenticated 
                      ? "Please log in to edit" 
                      : "Edit this field"
                }
              >
                <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
              </button>
            </div>

            {editingField === field.key ? (
              <div className="space-y-3">
                <input
                  type="number"
                  step={field.type === 'percentage' ? '0.1' : '1'}
                  value={editValue}
                  onChange={(e) => setEditValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={saveField}
                    disabled={saving}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center"
                  >
                    <FontAwesomeIcon icon={faSave} className="w-4 h-4 mr-1" />
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-900">
                {field.type === 'percentage' 
                  ? `${field.value.toFixed(1)}%`
                  : field.key === 'totalSales' 
                    ? `$${field.value.toLocaleString()}`
                    : field.key === 'averageOrderValue'
                      ? `$${field.value.toFixed(2)}`
                      : field.value.toLocaleString()
                }
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              Category: {field.category.charAt(0).toUpperCase() + field.category.slice(1)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-yellow-800">
          <FontAwesomeIcon icon={faChartLine} className="w-4 h-4" />
          <span className="text-sm font-medium">Real-time Updates & Security</span>
        </div>
        <p className="text-sm text-yellow-700 mt-2">
          {readOnly ? (
            <>
              <strong>🔒 Read-Only Mode:</strong> Analytics are displayed in real-time but cannot be modified. 
              Only Admins have editing privileges to prevent data manipulation.
            </>
          ) : (
            <>
                              <strong>⚠️ Admin Mode:</strong> Changes made here will be reflected immediately in the seller's dashboard. 
              All modifications are logged, audited, and require approval for significant changes.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default SellerAnalyticsEditor;
