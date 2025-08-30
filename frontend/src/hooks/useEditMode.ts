import { useState, useCallback } from 'react';

interface UseEditModeOptions {
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
  autoSave?: boolean;
  debounceMs?: number;
}

interface UseEditModeReturn {
  isEditing: boolean;
  editData: any;
  originalData: any;
  hasChanges: boolean;
  loading: boolean;
  error: string | null;
  startEdit: (data: any) => void;
  updateField: (field: string, value: any) => void;
  updateData: (data: any) => void;
  saveChanges: () => Promise<void>;
  cancelEdit: () => void;
  resetError: () => void;
}

export const useEditMode = (options: UseEditModeOptions = {}): UseEditModeReturn => {
  const { onSave, onCancel, autoSave = false, debounceMs = 500 } = options;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [originalData, setOriginalData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const hasChanges = JSON.stringify(editData) !== JSON.stringify(originalData);

  const startEdit = useCallback((data: any) => {
    setIsEditing(true);
    setEditData({ ...data });
    setOriginalData({ ...data });
    setError(null);
  }, []);

  const updateField = useCallback((field: string, value: any) => {
    setEditData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-save with debounce
      if (autoSave && onSave) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        const timer = setTimeout(async () => {
          try {
            setLoading(true);
            setError(null);
            await onSave(newData);
            setOriginalData({ ...newData });
          } catch (err: any) {
            setError(err.message || 'Failed to save changes');
          } finally {
            setLoading(false);
          }
        }, debounceMs);
        
        setDebounceTimer(timer);
      }
      
      return newData;
    });
  }, [autoSave, onSave, debounceMs, debounceTimer]);

  const updateData = useCallback((data: any) => {
    setEditData({ ...data });
  }, []);

  const saveChanges = useCallback(async () => {
    if (!onSave) return;
    
    try {
      setLoading(true);
      setError(null);
      await onSave(editData);
      setOriginalData({ ...editData });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  }, [editData, onSave]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditData({ ...originalData });
    setError(null);
    onCancel?.();
  }, [originalData, onCancel]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isEditing,
    editData,
    originalData,
    hasChanges,
    loading,
    error,
    startEdit,
    updateField,
    updateData,
    saveChanges,
    cancelEdit,
    resetError
  };
};

export default useEditMode;
