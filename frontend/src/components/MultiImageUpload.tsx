import React, { useState, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUpload, 
  faTrash, 
  faEye, 
  faTimes,
  faImage,
  faCheck,
  faPlus
} from '@fortawesome/free-solid-svg-icons';

interface ImageFile {
  id: string;
  file?: File;
  url: string;
  isNew?: boolean;
  isRemoved?: boolean;
}

interface MultiImageUploadProps {
  value?: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxSize?: number; // in MB
  accept?: string;
  disabled?: boolean;
  helperText?: string;
  className?: string;
  showPreview?: boolean;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value = [],
  onChange,
  maxImages = 10,
  maxSize = 5,
  accept = 'image/*',
  disabled = false,
  helperText,
  className = '',
  showPreview = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }

    // Check if we've reached max images
    const currentImages = value.filter(img => !img.isRemoved);
    if (currentImages.length >= maxImages) {
      return `Maximum ${maxImages} images allowed`;
    }

    return null;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newImages: ImageFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: ImageFile = {
          id: generateId(),
          file,
          url: e.target?.result as string,
          isNew: true
        };
        newImages.push(newImage);
        
        // Update state when all files are processed
        if (newImages.length === Array.from(files).length) {
          const updatedImages = [...value.filter(img => !img.isRemoved), ...newImages];
          onChange(updatedImages);
        }
      };
      reader.readAsDataURL(file);
    });

    if (errors.length > 0) {
      alert('Upload errors:\n' + errors.join('\n'));
    }
  }, [value, maxImages, maxSize, onChange]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    const updatedImages = value.map(img => 
      img.id === imageId ? { ...img, isRemoved: true } : img
    );
    onChange(updatedImages);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCounter(0);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleClick = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  const currentImages = value.filter(img => !img.isRemoved);
  const canAddMore = currentImages.length < maxImages;

  return (
    <div className={`multi-image-upload ${className}`}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
          
          <FontAwesomeIcon 
            icon={faUpload} 
            className="text-4xl text-gray-400 mb-4" 
          />
          
          <div className="text-lg font-medium text-gray-700 mb-2">
            {isDragging ? 'Drop images here' : 'Click to upload or drag & drop'}
          </div>
          
          <div className="text-sm text-gray-500">
            Supports JPG, PNG, WebP up to {maxSize}MB each
          </div>
          
          <div className="text-sm text-gray-500 mt-1">
            {currentImages.length} of {maxImages} images uploaded
          </div>
        </div>
      )}

      {/* Image Grid */}
      {currentImages.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentImages.map((image) => (
              <div key={image.id} className="relative group">
                {/* Image Preview */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={image.url}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                      {showPreview && (
                        <button
                          type="button"
                          onClick={() => window.open(image.url, '_blank')}
                          className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full transition-colors"
                          title="View full size"
                        >
                          <FontAwesomeIcon icon={faEye} className="text-gray-700" />
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                        title="Remove image"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Image info */}
                <div className="mt-2 text-xs text-gray-500">
                  {image.file?.name || 'Uploaded image'}
                  {image.isNew && (
                    <span className="ml-2 text-green-600 font-medium">New</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      {helperText && (
        <div className="mt-2 text-sm text-gray-500">
          {helperText}
        </div>
      )}

      {/* Error display */}
      {currentImages.length >= maxImages && (
        <div className="mt-2 text-sm text-orange-600">
          Maximum {maxImages} images reached. Remove some images to add more.
        </div>
      )}
    </div>
  );
};

export default MultiImageUpload;
