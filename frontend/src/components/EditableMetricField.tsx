import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSave,
  faUndo,
  faTimes,
  faExclamationTriangle,
  faDollarSign,
  faShoppingBag,
  faEye,
  faHeart,
  faStar,
  faCreditCard,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';
import { adminApi } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { useSellerData } from '../contexts/SellerDataContext';

interface EditableMetricFieldProps {
  sellerId: string;
  metricName: string;
  currentValue: number;
  originalValue: number;
  label: string;
  format?: 'number' | 'currency' | 'percentage' | 'rating';
  isAdmin?: boolean;
  period?: 'today' | 'last7days' | 'last30days' | 'total';
  onValueChange?: (newValue: number) => void;
  className?: string;
}

const EditableMetricField: React.FC<EditableMetricFieldProps> = ({
  sellerId,
  metricName,
  currentValue,
  originalValue,
  label,
  format = 'number',
  isAdmin = false,
  period = 'total',
  onValueChange,
  className = ''
}) => {
  const { showToast } = useNotifications();
  const { clearLocalStorageAfterSave, refreshOverrides } = useSellerData();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(() => {
    const safeValue = typeof currentValue === 'number' && !isNaN(currentValue) ? currentValue : 0;
    return safeValue.toString();
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOverride, setHasOverride] = useState(() => {
    const safeCurrent = typeof currentValue === 'number' && !isNaN(currentValue) ? currentValue : 0;
    const safeOriginal = typeof originalValue === 'number' && !isNaN(originalValue) ? originalValue : 0;
    return safeCurrent !== safeOriginal;
  });
  // Optimistic display value after save so UI updates instantly
  const [optimisticValue, setOptimisticValue] = useState<number | null>(null);

  useEffect(() => {
    // Ensure we have valid numbers, defaulting to 0 if undefined/null
    const safeCurrentValue = typeof currentValue === 'number' && !isNaN(currentValue) ? currentValue : 0;
    const safeOriginalValue = typeof originalValue === 'number' && !isNaN(originalValue) ? originalValue : 0;
    
    setEditValue(safeCurrentValue.toString());
    setHasOverride(safeCurrentValue !== safeOriginalValue);
    // Clear optimistic value when upstream value changes
    setOptimisticValue(null);
  }, [currentValue, originalValue]);

  const formatValue = (value: number) => {
    // Ensure we have a valid number
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    
    switch (format) {
      case 'currency':
        return `$${safeValue.toLocaleString()}`;
      case 'percentage':
        return `${safeValue}%`;
      case 'rating':
        return safeValue.toFixed(1);
      default:
        return safeValue.toLocaleString();
    }
  };

  const parseValue = (value: string): number => {
    // Handle empty or invalid input
    if (!value || value.trim() === '') return 0;
    
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return 0;
    
    // Apply specific validation based on metric type
    switch (metricName) {
      case 'shop_rating':
        return Math.max(0, Math.min(5, parsed)); // Clamp between 0-5
      case 'credit_score':
        return Math.max(300, Math.min(850, parsed)); // Clamp between 300-850
      case 'orders_sold':
      case 'total_sales':
      case 'profit_forecast':
      case 'visitors':
      case 'shop_followers':
        return Math.max(0, parsed); // Non-negative values
      default:
        return parsed;
    }
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    
    const newValue = parseValue(editValue);
    const safeCurrentValue = typeof currentValue === 'number' && !isNaN(currentValue) ? currentValue : 0;
    
    if (newValue === safeCurrentValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log(`🧪 Saving override:`, {
        sellerId,
        metricName,
        period,
        newValue,
        currentValue,
        originalValue
      });
      
      // Create the new structured payload format
      const payload = {};
      const periodKey = period === 'today' ? 'today' : 
                       period === 'last7days' ? 'last7' : 
                       period === 'last30days' ? 'last30' : 'total';
      
      // Add the underscore separator for multi-word metric names
      const metricKey = `${periodKey}_${metricName}`;
      payload[metricKey] = newValue;
      
      console.log(`📤 Sending new payload format:`, payload);
      
      // Use the new API endpoint that accepts the structured payload
      const response = await adminApi.saveSellerOverride(sellerId, payload);
      console.log(`✅ Save response:`, response);
      
      setIsEditing(false);
      setOptimisticValue(newValue);
      onValueChange?.(newValue);
      setHasOverride(true);
      showToast('Override saved successfully', 'success');
      
      // Only clear localStorage after successful server save
      clearLocalStorageAfterSave();
      
      // Refresh overrides data to ensure consistency
      await refreshOverrides();
    } catch (err: any) {
      console.error(`❌ Override save failed for ${metricName}:`, err);
      console.error(`❌ Error details:`, {
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });
      
      const errorMessage = err.response?.data?.message || 'Failed to save override';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      
      // Don't clear localStorage on error - keep the data for retry
      console.warn('❌ Override save failed, keeping localStorage data for retry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    
    setIsSaving(true);
    setError(null);

    try {
      await adminApi.resetSellerOverride(sellerId, metricName, period);
      setIsEditing(false);
      setEditValue(originalValue.toString());
      onValueChange?.(originalValue);
      setHasOverride(false);
      showToast('Override reset successfully', 'success');
      
      // Refresh overrides data to ensure consistency
      await refreshOverrides();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to reset override';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!isAdmin) return;
    
    setIsSaving(true);
    setError(null);

    try {
      await adminApi.clearSellerOverride(sellerId, metricName, period);
      setIsEditing(false);
      setEditValue('0');
      onValueChange?.(0);
      setHasOverride(true);
      showToast('Override cleared successfully', 'success');
      
      // Refresh overrides data to ensure consistency
      await refreshOverrides();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to clear override';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const safeCurrentValue = typeof currentValue === 'number' && !isNaN(currentValue) ? currentValue : 0;
    setEditValue(safeCurrentValue.toString());
    setError(null);
  };

  // Choose an icon relevant to the metric instead of a generic edit icon
  const getMetricIcon = () => {
    switch (metricName) {
      case 'orders_sold':
        return faShoppingBag;
      case 'total_sales':
        return faDollarSign;
      case 'profit_forecast':
        return faChartLine;
      case 'visitors':
        return faEye;
      case 'shop_followers':
        return faHeart;
      case 'shop_rating':
        return faStar;
      case 'credit_score':
        return faCreditCard;
      default:
        return faChartLine;
    }
  };

  if (!isAdmin) {
    // Non-admin view - just show the value
    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatValue(typeof currentValue === 'number' && !isNaN(currentValue) ? currentValue : 0)}
            </p>
            {hasOverride && (
              <p className="text-xs text-blue-600 mt-1">
                Admin Override Active
              </p>
            )}
          </div>
          <div className="p-3 bg-black rounded-lg">
            <FontAwesomeIcon icon={getMetricIcon()} className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // Admin view – inline edit with Enter to save and no action buttons
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          {hasOverride && (
            <p className="text-xs text-blue-600">Admin Override Active</p>
          )}
        </div>
        <div className="p-3 bg-black rounded-lg">
          <FontAwesomeIcon icon={getMetricIcon()} className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {formatValue(typeof (optimisticValue ?? currentValue) === 'number' && !isNaN((optimisticValue ?? currentValue) as any) ? (optimisticValue ?? (currentValue as number)) : 0)}
          </p>
          {hasOverride && (
            <p className="text-sm text-gray-500">
              Original: {formatValue(typeof originalValue === 'number' && !isNaN(originalValue) ? originalValue : 0)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Value</label>
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                await handleSave();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Type a value and press Enter"
            min={metricName === 'shop_rating' ? 0 : metricName === 'credit_score' ? 300 : 0}
            max={metricName === 'shop_rating' ? 5 : metricName === 'credit_score' ? 850 : undefined}
            step={metricName === 'shop_rating' ? 0.1 : 1}
          />
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {isSaving && (
          <div className="text-xs text-gray-500">Saving…</div>
        )}
      </div>
    </div>
  );
};

export default EditableMetricField;
