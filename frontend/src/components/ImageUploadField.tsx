import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUpload, 
  faTrash, 
  faEye, 
  faTimes,
  faImage,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

interface ImageUploadFieldProps {
  value?: string;
  onChange: (file: File | null, remove: boolean) => void;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 5,
  disabled = false,
  helperText,
  className = ''
}) => {
  const uniqueId = `image-upload-${Math.random().toString(36).substr(2, 9)}`;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onChange(null, true);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveChanges = () => {
    if (selectedFile) {
      onChange(selectedFile, false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const hasChanges = selectedFile !== null || previewUrl !== value;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Input Area */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={accept}
          disabled={disabled}
          className="hidden"
          id={uniqueId}
        />
        
        {/* Drag & Drop Zone */}
        <label
          htmlFor={uniqueId}
          className={`block w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-blue-400 bg-blue-50 scale-105'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <div className="mx-auto w-12 h-12 mb-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon 
                icon={faImage} 
                className="w-6 h-6 text-blue-600" 
              />
            </div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              {value ? 'Change Image' : 'Upload Image'}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Drag and drop an image here, or click to browse
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
              <FontAwesomeIcon icon={faUpload} className="w-4 h-4 mr-2" />
              Choose File
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Max size: {maxSize}MB • Supports: JPEG, PNG, WebP
            </p>
          </div>
        </label>
      </div>

      {/* Helper Text */}
      {helperText && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 flex items-center space-x-2">
            <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
            <span>{helperText}</span>
          </p>
        </div>
      )}

      {/* Current Image Display */}
      {value && !previewUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Current Image</h4>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center space-x-1 transition-colors duration-200"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
          <div className="relative inline-block group">
            <img
              src={value}
              alt="Current image"
              className="h-32 w-32 object-cover rounded-xl border-2 border-gray-200 shadow-sm group-hover:border-blue-300 transition-all duration-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all duration-200 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white"
              >
                <FontAwesomeIcon icon={faEye} className="w-3 h-3 mr-1" />
                Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Area */}
      {previewUrl && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Image Preview</h4>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                <FontAwesomeIcon icon={faEye} className="w-3 h-3" />
                <span>{showPreview ? 'Hide' : 'Preview'}</span>
              </button>
              
              <button
                type="button"
                onClick={handleRemoveImage}
                className="px-3 py-1 text-red-600 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-64 max-w-full object-contain rounded-xl border-2 border-gray-200 shadow-sm"
            />
          </div>

          {/* Save Changes Button */}
          {hasChanges && (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleSaveChanges}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                <span>Confirm Changes</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full Preview Modal */}
      {showPreview && (value || previewUrl) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={previewUrl || value}
                alt="Full preview"
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadField;
