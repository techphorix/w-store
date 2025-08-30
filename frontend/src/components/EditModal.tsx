import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faSpinner, 
  faSave,
  faUpload,
  faTrash,
  faStore,
  faGlobe,
  faUser,
  faBuilding,
  faFileAlt,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { 
  faInstagram as faInstagramBrand,
  faFacebook as faFacebookBrand,
  faTiktok as faTiktokBrand
} from '@fortawesome/free-brands-svg-icons';
import ImageUploadField from './ImageUploadField';

interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'file' | 'image' | 'checkbox' | 'date' | 'time' | 'datetime-local' | 'social_media_group';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: (value: any) => string | null;
  multiple?: boolean; // for file inputs
  accept?: string; // for file inputs
  rows?: number; // for textarea
  min?: number; // for number inputs
  max?: number; // for number inputs
  step?: number; // for number inputs
  disabled?: boolean;
  helperText?: string;
  maxSize?: number; // for image fields in MB
  icon?: any; // FontAwesome icon for the field
  fields?: Field[]; // for grouped fields like social media
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data?: any;
  fields: Field[];
  onSave: (data: any) => Promise<void>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  saveButtonText?: string;
  cancelButtonText?: string;
}

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  title,
  data = {},
  fields,
  onSave,
  size = 'md',
  saveButtonText = 'Save',
  cancelButtonText = 'Cancel'
}) => {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<{ [key: string]: FileList | null }>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Initialize form data
      const initialData: any = {};
      fields.forEach(field => {
        if (field.type === 'social_media_group' && field.fields) {
          // Initialize nested social media fields
          field.fields.forEach(subField => {
            initialData[subField.key] = data[subField.key] ?? '';
          });
        } else {
          initialData[field.key] = data[field.key] ?? '';
        }
      });
      setFormData(initialData);
      setErrors({});
      setFiles({});
    } else {
      setIsVisible(false);
    }
  }, [isOpen, data, fields]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl'
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    fields.forEach(field => {
      const value = formData[field.key];
      
      // Required field validation
      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        newErrors[field.key] = `${field.label} is required`;
        return;
      }

      // Custom validation
      if (field.validation && value) {
        const validationError = field.validation(value);
        if (validationError) {
          newErrors[field.key] = validationError;
        }
      }

      // Type-specific validation
      if (value) {
        switch (field.type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              newErrors[field.key] = 'Please enter a valid email address';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              newErrors[field.key] = 'Please enter a valid number';
            } else {
              const numValue = Number(value);
              if (field.min !== undefined && numValue < field.min) {
                newErrors[field.key] = `Value must be at least ${field.min}`;
              }
              if (field.max !== undefined && numValue > field.max) {
                newErrors[field.key] = `Value must be at most ${field.max}`;
              }
            }
            break;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Prepare form data with files
      const submitData = { ...formData };
      
      // Add file data
      Object.entries(files).forEach(([key, fileList]) => {
        if (fileList && fileList.length > 0) {
          const field = fields.find(f => f.key === key);
          if (field?.multiple) {
            submitData[key] = Array.from(fileList);
          } else {
            submitData[key] = fileList[0];
          }
        }
      });

      await onSave(submitData);
      onClose();
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to save changes' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: Field, value: any) => {
    setFormData(prev => ({ ...prev, [field.key]: value }));
    
    // Clear error for this field
    if (errors[field.key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field.key];
        return newErrors;
      });
    }
  };

  const handleFileChange = (field: Field, fileList: FileList | null) => {
    setFiles(prev => ({ ...prev, [field.key]: fileList }));
  };

  const getFieldIcon = (field: Field) => {
    if (field.icon) return field.icon;
    
    // Default icons based on field key or type
    switch (field.key) {
      case 'business_name':
      case 'storeName':
        return faStore;
      case 'business_type':
      case 'businessType':
        return faBuilding;
      case 'description':
        return faFileAlt;
      case 'website':
        return faGlobe;
      case 'instagram':
        return faInstagramBrand;
      case 'facebook':
        return faFacebookBrand;
      case 'tiktok':
        return faTiktokBrand;
      case 'owner':
      case 'full_name':
        return faUser;
      default:
        return null;
    }
  };

  const renderField = (field: Field) => {
    const value = formData[field.key] || '';
    const hasError = errors[field.key];
    const fieldIcon = getFieldIcon(field);
    
    const commonClasses = `w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
      hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:bg-gray-50 focus:border-blue-500'
    } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;

    const fieldWrapper = (
      <div className="relative group">
        {fieldIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
            <FontAwesomeIcon icon={fieldIcon} className="w-4 h-4" />
          </div>
        )}
        {field.type === 'social_media_group' ? (
          <div className="space-y-3">
            {field.fields?.map((subField, subIndex) => (
              <div key={subField.key} className="relative group">
                {subField.icon && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
                    <FontAwesomeIcon icon={subField.icon} className="w-4 h-4" />
                  </div>
                )}
                <input
                  type="text"
                  value={formData[subField.key] || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, [subField.key]: e.target.value }));
                    // Clear error for this field
                    if (errors[subField.key]) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors[subField.key];
                        return newErrors;
                      });
                    }
                  }}
                  placeholder={subField.placeholder}
                  disabled={field.disabled || loading}
                  className="w-full px-4 py-3 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 border-gray-200 bg-white hover:bg-gray-50 focus:border-blue-500"
                  onFocus={() => {
                    const element = document.activeElement as HTMLElement;
                    if (element) {
                      element.classList.add('field-focus-animation');
                      setTimeout(() => element.classList.remove('field-focus-animation'), 300);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        ) : field.type === 'image' ? (
          <ImageUploadField
            value={value}
            onChange={(file, remove) => {
              if (remove) {
                handleInputChange(field, '');
                setFiles(prev => ({ ...prev, [field.key]: null }));
              } else if (file) {
                setFiles(prev => ({ ...prev, [field.key]: [file] as any }));
                handleInputChange(field, file.name);
              }
            }}
            accept={field.accept}
            maxSize={field.maxSize}
            disabled={field.disabled || loading}
            helperText={field.helperText}
          />
        ) : field.type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            disabled={field.disabled || loading}
            className={`${commonClasses} resize-none ${fieldIcon ? 'pl-10' : ''}`}
            onFocus={() => {
              const element = document.activeElement as HTMLElement;
              if (element) {
                element.classList.add('field-focus-animation');
                setTimeout(() => element.classList.remove('field-focus-animation'), 300);
              }
            }}
          />
        ) : field.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => handleInputChange(field, e.target.value)}
            disabled={field.disabled || loading}
            className={`${commonClasses} ${fieldIcon ? 'pl-10' : ''}`}
            onFocus={() => {
              const element = document.activeElement as HTMLElement;
              if (element) {
                element.classList.add('field-focus-animation');
                setTimeout(() => element.classList.remove('field-focus-animation'), 300);
              }
            }}
          >
            {!field.required && <option value="">Select {field.label}</option>}
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === 'checkbox' ? (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-200 transition-all duration-200">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleInputChange(field, e.target.checked)}
              disabled={field.disabled || loading}
              className="w-5 h-5 text-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 border-gray-300"
            />
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
          </div>
        ) : (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={field.disabled || loading}
            className={`${commonClasses} ${fieldIcon ? 'pl-10' : ''}`}
            onFocus={() => {
              const element = document.activeElement as HTMLElement;
              if (element) {
                element.classList.add('field-focus-animation');
                setTimeout(() => element.classList.remove('field-focus-animation'), 300);
              }
            }}
          />
        )}
      </div>
    );

    return fieldWrapper;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">

      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 h-full">
        <div 
          className={`bg-white rounded-2xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col overflow-hidden ${
            isVisible ? 'animate-modal-slide-in' : 'animate-modal-slide-out'
          }`}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FontAwesomeIcon icon={faStore} className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-blue-100 text-sm">Update shop information and settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-200 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 modal-scroll-container modal-content-scrollable bg-white border border-gray-100" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {errors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center space-x-2 animate-pulse">
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                  <span>{errors.general}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {fields.map((field, index) => (
                  <div 
                    key={field.key}
                    className={`space-y-1.5 animate-field-stagger-in px-4 pt-4 pb-3 rounded-xl bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-100 transition-all duration-200`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {field.type !== 'checkbox' && (
                      <label className="block text-sm font-semibold text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}
                    {renderField(field)}
                    {errors[field.key] && (
                      <p className="text-red-500 text-xs flex items-center space-x-1 field-error-animation">
                        <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                        <span>{errors[field.key]}</span>
                      </p>
                    )}
                    {field.helperText && field.type !== 'image' && (
                      <p className="text-xs text-gray-500 flex items-center space-x-1">
                        <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-green-500" />
                        <span>{field.helperText}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50/50 p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  All changes will be saved automatically
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all duration-200 font-medium"
                  >
                    {cancelButtonText}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 btn-animate-pulse"
                  >
                    {loading ? (
                      <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
                    )}
                    <span>{saveButtonText}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
