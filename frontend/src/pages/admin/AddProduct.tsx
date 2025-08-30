import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faArrowLeft,
  faSave,
  faImage,
  faPlus,
  faTimes,
  faUpload,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faEye,
  faStar,
  faToggleOn,
  faToggleOff,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { productsApi } from '../../services/api';

// Language data
const translations = {
  EN: {
    title: 'TIKTOK SHOP ADMIN',
    subtitle: 'Add New Product',
    addProduct: 'Add New Product',
    backToProducts: 'Back to Products',
    productInformation: 'Product Information',
    productName: 'Product Name',
    productNamePlaceholder: 'Enter product name...',
    productDescription: 'Product Description',
    productDescriptionPlaceholder: 'Describe your product in detail...',
    category: 'Category',
    selectCategory: 'Select Category',
    categories: {
      electronics: 'Electronics',
      clothing: 'Clothing',
      home: 'Home & Garden',
      beauty: 'Beauty',
      sports: 'Sports',
      books: 'Books'
    },
    pricing: 'Pricing & Inventory',
    salesPrice: 'Sales Price',
    costPrice: 'Cost Price',
    stock: 'Stock Quantity',
    sku: 'SKU',
    skuPlaceholder: 'Product SKU...',
    images: 'Product Images',
    addImages: 'Add Images',
    dragDropImages: 'Drag and drop images here, or click to select',
    mainImage: 'Main Image',
    additionalImages: 'Additional Images',
    settings: 'Product Settings',
    isActive: 'Active Product',
    isFeatured: 'Featured Product',
    tags: 'Tags',
    tagsPlaceholder: 'Enter tags separated by commas...',
    seo: 'SEO Settings',
    metaTitle: 'Meta Title',
    metaDescription: 'Meta Description',
    preview: 'Preview',
    previewProduct: 'Preview Product',
    saveProduct: 'Save Product',
    saveDraft: 'Save as Draft',
    required: 'Required',
    optional: 'Optional',
    success: 'Product created successfully!',
    error: 'Error creating product. Please try again.',
    validation: {
      nameRequired: 'Product name is required',
      descriptionRequired: 'Product description is required',
      categoryRequired: 'Category is required',
      priceRequired: 'Sales price is required',
      stockRequired: 'Stock quantity is required'
    }
  }
};

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  salesPrice: number;
  costPrice: number;
  stock: number;
  sku: string;
  images: File[];
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
}

const AddProduct = () => {
  const navigate = useNavigate();
  const [currentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations];
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category: '',
    salesPrice: 0,
    costPrice: 0,
    stock: 0,
    sku: '',
    images: [],
    isActive: true,
    isFeatured: false,
    tags: [],
    metaTitle: '',
    metaDescription: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleImageUpload = (files: FileList | null) => {
    if (files) {
      const newImages = Array.from(files).filter(file => 
        file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
      );
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages].slice(0, 5) // Max 5 images
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = currentLang.validation.nameRequired;
    }
    if (!formData.description.trim()) {
      newErrors.description = currentLang.validation.descriptionRequired;
    }
    if (!formData.category) {
      newErrors.category = currentLang.validation.categoryRequired;
    }
    if (formData.salesPrice <= 0) {
      newErrors.salesPrice = currentLang.validation.priceRequired;
    }
    if (formData.stock < 0) {
      newErrors.stock = currentLang.validation.stockRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft = false) => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const submitData = new FormData();
      
      // Append form data
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'images') {
          formData.images.forEach(image => {
            submitData.append('images', image);
          });
        } else if (key === 'tags') {
          submitData.append('tags', JSON.stringify(formData.tags));
        } else {
          submitData.append(key, value.toString());
        }
      });
      
      submitData.append('isDraft', isDraft.toString());

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(currentLang.success);
      navigate('/admin/products');
    } catch (error) {
      console.error('Error creating product:', error);
      alert(currentLang.error);
    } finally {
      setIsLoading(false);
    }
  };

  const getImagePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  return (
    <AdminLayout 
      title={currentLang.title}
      subtitle={currentLang.subtitle}
    >
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mr-4"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            {currentLang.backToProducts}
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentLang.addProduct}</h2>
            <p className="text-gray-600">Create a new product for your catalog</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FontAwesomeIcon icon={faEye} className="mr-2" />
            {currentLang.preview}
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={isLoading}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faSpinner} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {currentLang.saveDraft}
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isLoading}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            {currentLang.saveProduct}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Product Information */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{currentLang.productInformation}</h3>
            
            <div className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.productName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={currentLang.productNamePlaceholder}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Product Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.productDescription} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={currentLang.productDescriptionPlaceholder}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.category} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className={`appearance-none w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-10 ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">{currentLang.selectCategory}</option>
                    <option value="electronics">{currentLang.categories.electronics}</option>
                    <option value="clothing">{currentLang.categories.clothing}</option>
                    <option value="home">{currentLang.categories.home}</option>
                    <option value="beauty">{currentLang.categories.beauty}</option>
                    <option value="sports">{currentLang.categories.sports}</option>
                    <option value="books">{currentLang.categories.books}</option>
                  </select>
                  <FontAwesomeIcon 
                    icon={faChevronDown} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" 
                  />
                </div>
                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{currentLang.pricing}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sales Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.salesPrice} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.salesPrice || ''}
                    onChange={(e) => handleInputChange('salesPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      errors.salesPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.salesPrice && <p className="text-red-500 text-sm mt-1">{errors.salesPrice}</p>}
              </div>

              {/* Cost Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.costPrice} <span className="text-gray-400">({currentLang.optional})</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.costPrice || ''}
                    onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.stock} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.stock || ''}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  min="0"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                    errors.stock ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.sku} <span className="text-gray-400">({currentLang.optional})</span>
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder={currentLang.skuPlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Product Images */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{currentLang.images}</h3>
            
            {/* Image Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FontAwesomeIcon icon={faUpload} className="text-4xl text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">{currentLang.dragDropImages}</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                {currentLang.addImages}
              </label>
              <p className="text-xs text-gray-500 mt-2">Maximum 5 images, 5MB each</p>
            </div>

            {/* Image Preview */}
            {formData.images.length > 0 && (
              <div className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={getImagePreview(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <FontAwesomeIcon icon={faTimes} className="text-xs" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          {currentLang.mainImage}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEO Settings */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{currentLang.seo}</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.metaTitle} <span className="text-gray-400">({currentLang.optional})</span>
                </label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.metaDescription} <span className="text-gray-400">({currentLang.optional})</span>
                </label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Settings */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{currentLang.settings}</h3>
            
            <div className="space-y-6">
              {/* Active Status */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">{currentLang.isActive}</label>
                  <p className="text-xs text-gray-500">Product will be visible to customers</p>
                </div>
                <button
                  onClick={() => handleInputChange('isActive', !formData.isActive)}
                  className="flex items-center"
                >
                  <FontAwesomeIcon 
                    icon={formData.isActive ? faToggleOn : faToggleOff} 
                    className={`w-8 h-8 ${formData.isActive ? 'text-green-500' : 'text-gray-400'}`} 
                  />
                </button>
              </div>

              {/* Featured Status */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">{currentLang.isFeatured}</label>
                  <p className="text-xs text-gray-500">Show in featured products section</p>
                </div>
                <button
                  onClick={() => handleInputChange('isFeatured', !formData.isFeatured)}
                  className="flex items-center"
                >
                  <FontAwesomeIcon 
                    icon={formData.isFeatured ? faStar : faStar} 
                    className={`w-6 h-6 ${formData.isFeatured ? 'text-yellow-500' : 'text-gray-400'}`} 
                  />
                </button>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentLang.tags} <span className="text-gray-400">({currentLang.optional})</span>
                </label>
                <input
                  type="text"
                  placeholder={currentLang.tagsPlaceholder}
                  onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(tag => tag.trim()))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Preview Card */}
          {showPreview && formData.name && (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentLang.previewProduct}</h3>
              
              <div className="border border-gray-200 rounded-lg p-4">
                {formData.images.length > 0 && (
                  <img
                    src={getImagePreview(formData.images[0])}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <h4 className="font-semibold text-gray-900 mb-2">{formData.name}</h4>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{formData.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">${formData.salesPrice}</span>
                  <div className="flex items-center space-x-2">
                    {formData.isActive && (
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                    {formData.isFeatured && (
                      <FontAwesomeIcon icon={faStar} className="text-yellow-500 text-sm" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{formData.stock} in stock</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddProduct;
