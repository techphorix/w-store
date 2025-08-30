import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, 
  faCheck, 
  faTimes, 
  faSpinner 
} from '@fortawesome/free-solid-svg-icons';

interface EditableFieldProps {
  value: string | number;
  onSave: (newValue: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'email' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  prefix?: string;
  suffix?: string;
  validation?: (value: string | number) => string | null;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder,
  className = '',
  maxLength,
  disabled = false,
  required = false,
  multiline = false,
  rows = 3,
  prefix,
  suffix,
  validation
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (!disabled) {
      setIsEditing(true);
      setError(null);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (required && (!editValue || editValue.toString().trim() === '')) {
      setError('This field is required');
      return;
    }

    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      await onSave(editValue);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderInput = () => {
    const commonProps = {
      ref: inputRef as any,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        setEditValue(type === 'number' ? Number(e.target.value) : e.target.value),
      onKeyDown: handleKeyPress,
      placeholder,
      maxLength,
      className: `w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : ''}`,
      disabled: loading
    };

    if (type === 'select') {
      return (
        <select {...commonProps}>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (multiline || type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          rows={rows}
          className={`${commonProps.className} resize-none`}
        />
      );
    }

    return (
      <input
        {...commonProps}
        type={type}
        step={type === 'number' ? 'any' : undefined}
      />
    );
  };

  const displayValue = () => {
    let formattedValue = value.toString();
    
    if (prefix) formattedValue = prefix + formattedValue;
    if (suffix) formattedValue = formattedValue + suffix;
    
    return formattedValue || placeholder || 'Click to edit';
  };

  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {renderInput()}
            {error && (
              <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
          </div>
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
              title="Save"
            >
              {loading ? (
                <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="Cancel"
            >
              <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group relative cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
      onClick={handleEdit}
    >
      <div className="flex items-center justify-between">
        <span className={`${!value && !disabled ? 'text-gray-400 italic' : ''}`}>
          {displayValue()}
        </span>
        {!disabled && (
          <FontAwesomeIcon 
            icon={faEdit} 
            className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" 
          />
        )}
      </div>
    </div>
  );
};

export default EditableField;
