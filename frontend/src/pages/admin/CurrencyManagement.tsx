import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faDollarSign,
  faEuroSign,
  faYenSign,
  faPoundSign,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faToggleOn,
  faToggleOff,
  faSearch,
  faChevronDown,
  faSpinner,
  faTimes,
  faSave,
  faArrowUp,
  faArrowDown,
  faMinus,
  faGlobe,
  faExclamationTriangle,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';

// Language data
const translations = {
  EN: {
    title: 'TIKTOK SHOP ADMIN',
    subtitle: 'Currency Management System',
    currencyManagement: 'Currency Management',
    description: 'Manage supported currencies, exchange rates, and regional settings',
    addCurrency: 'Add Currency',
    totalCurrencies: 'Total Currencies',
    activeCurrencies: 'Active Currencies',
    baseCurrency: 'Base Currency',
    lastUpdated: 'Last Updated',
    searchCurrencies: 'Search currencies...',
    currencyCode: 'Currency Code',
    currencyName: 'Currency Name',
    symbol: 'Symbol',
    exchangeRate: 'Exchange Rate',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    inactive: 'Inactive',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    save: 'Save',
    cancel: 'Cancel',
    addNewCurrency: 'Add New Currency',
    editCurrency: 'Edit Currency',
    currencyDetails: 'Currency Details',
    exchangeRateManagement: 'Exchange Rate Management',
    updateRates: 'Update Exchange Rates',
    autoUpdate: 'Auto Update',
    manualUpdate: 'Manual Update',
    setAsBase: 'Set as Base Currency',
    confirmDelete: 'Are you sure you want to delete this currency?',
    deleteSuccess: 'Currency deleted successfully',
    deleteError: 'Error deleting currency',
    saveSuccess: 'Currency saved successfully',
    saveError: 'Error saving currency',
    validation: {
      codeRequired: 'Currency code is required',
      nameRequired: 'Currency name is required',
      symbolRequired: 'Currency symbol is required',
      rateRequired: 'Exchange rate is required',
      codeExists: 'Currency code already exists'
    },
    regions: 'Supported Regions',
    decimalPlaces: 'Decimal Places',
    formatting: 'Number Formatting',
    position: 'Symbol Position',
    before: 'Before Amount',
    after: 'After Amount'
  }
};

interface Currency {
  _id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isActive: boolean;
  isBaseCurrency: boolean;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
  regions: string[];
  lastUpdated: string;
  createdAt: string;
}

interface CurrencyStats {
  totalCurrencies: number;
  activeCurrencies: number;
  baseCurrencyCode: string;
  lastRateUpdate: string;
  rateGrowth: number;
}

const CurrencyManagement = () => {
  const [currentLanguage] = useState('EN');
  const currentLang = translations[currentLanguage as keyof typeof translations];
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [filteredCurrencies, setFilteredCurrencies] = useState<Currency[]>([]);
  const [stats, setStats] = useState<CurrencyStats>({
    totalCurrencies: 0,
    activeCurrencies: 0,
    baseCurrencyCode: 'USD',
    lastRateUpdate: '',
    rateGrowth: 0
  });

  const [formData, setFormData] = useState<Partial<Currency>>({
    code: '',
    name: '',
    symbol: '',
    exchangeRate: 1,
    isActive: true,
    isBaseCurrency: false,
    decimalPlaces: 2,
    symbolPosition: 'before',
    regions: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sample currency data
  const sampleCurrencies: Currency[] = [
    {
      _id: '1',
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      exchangeRate: 1.00,
      isActive: true,
      isBaseCurrency: true,
      decimalPlaces: 2,
      symbolPosition: 'before',
      regions: ['US', 'EC'],
      lastUpdated: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      _id: '2',
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      exchangeRate: 0.85,
      isActive: true,
      isBaseCurrency: false,
      decimalPlaces: 2,
      symbolPosition: 'before',
      regions: ['EU', 'FR', 'DE', 'IT', 'ES'],
      lastUpdated: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      _id: '3',
      code: 'GBP',
      name: 'British Pound',
      symbol: '£',
      exchangeRate: 0.73,
      isActive: true,
      isBaseCurrency: false,
      decimalPlaces: 2,
      symbolPosition: 'before',
      regions: ['GB', 'UK'],
      lastUpdated: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      _id: '4',
      code: 'JPY',
      name: 'Japanese Yen',
      symbol: '¥',
      exchangeRate: 149.50,
      isActive: true,
      isBaseCurrency: false,
      decimalPlaces: 0,
      symbolPosition: 'before',
      regions: ['JP'],
      lastUpdated: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      _id: '5',
      code: 'CAD',
      name: 'Canadian Dollar',
      symbol: 'C$',
      exchangeRate: 1.35,
      isActive: false,
      isBaseCurrency: false,
      decimalPlaces: 2,
      symbolPosition: 'before',
      regions: ['CA'],
      lastUpdated: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    }
  ];

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    filterCurrencies();
  }, [currencies, searchTerm]);

  const fetchCurrencies = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setCurrencies(sampleCurrencies);
        calculateStats(sampleCurrencies);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      setIsLoading(false);
    }
  };

  const calculateStats = (currencyData: Currency[]) => {
    const baseCurrency = currencyData.find(c => c.isBaseCurrency);
    const stats: CurrencyStats = {
      totalCurrencies: currencyData.length,
      activeCurrencies: currencyData.filter(c => c.isActive).length,
      baseCurrencyCode: baseCurrency?.code || 'USD',
      lastRateUpdate: currencyData[0]?.lastUpdated || '',
      rateGrowth: 2.5
    };
    setStats(stats);
  };

  const filterCurrencies = () => {
    let filtered = currencies;
    if (searchTerm) {
      filtered = currencies.filter(currency =>
        currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        currency.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredCurrencies(filtered);
  };

  const openCurrencyModal = (currency: Currency | null = null, editMode = false) => {
    if (currency) {
      setSelectedCurrency(currency);
      setFormData(currency);
    } else {
      setSelectedCurrency(null);
      setFormData({
        code: '',
        name: '',
        symbol: '',
        exchangeRate: 1,
        isActive: true,
        isBaseCurrency: false,
        decimalPlaces: 2,
        symbolPosition: 'before',
        regions: []
      });
    }
    setIsEditMode(editMode);
    setShowCurrencyModal(true);
    setErrors({});
  };

  const handleInputChange = (field: keyof Currency, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code?.trim()) {
      newErrors.code = currentLang.validation.codeRequired;
    }
    if (!formData.name?.trim()) {
      newErrors.name = currentLang.validation.nameRequired;
    }
    if (!formData.symbol?.trim()) {
      newErrors.symbol = currentLang.validation.symbolRequired;
    }
    if (!formData.exchangeRate || formData.exchangeRate <= 0) {
      newErrors.exchangeRate = currentLang.validation.rateRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isEditMode && selectedCurrency) {
        // Update existing currency
        setCurrencies(prev => 
          prev.map(c => 
            c._id === selectedCurrency._id 
              ? { ...c, ...formData, lastUpdated: new Date().toISOString() }
              : c
          )
        );
      } else {
        // Add new currency
        const newCurrency: Currency = {
          ...formData as Currency,
          _id: Date.now().toString(),
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        setCurrencies(prev => [...prev, newCurrency]);
      }
      
      setShowCurrencyModal(false);
      alert(currentLang.saveSuccess);
    } catch (error) {
      console.error('Error saving currency:', error);
      alert(currentLang.saveError);
    }
  };

  const handleDelete = async (currencyId: string) => {
    if (!confirm(currentLang.confirmDelete)) return;

    try {
      setCurrencies(prev => prev.filter(c => c._id !== currencyId));
      alert(currentLang.deleteSuccess);
    } catch (error) {
      console.error('Error deleting currency:', error);
      alert(currentLang.deleteError);
    }
  };

  const handleToggleStatus = async (currencyId: string) => {
    setCurrencies(prev => 
      prev.map(c => 
        c._id === currencyId 
          ? { ...c, isActive: !c.isActive, lastUpdated: new Date().toISOString() }
          : c
      )
    );
  };

  const setBaseCurrency = async (currencyId: string) => {
    setCurrencies(prev => 
      prev.map(c => ({
        ...c,
        isBaseCurrency: c._id === currencyId,
        lastUpdated: new Date().toISOString()
      }))
    );
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const formatted = amount.toFixed(currency.decimalPlaces);
    return currency.symbolPosition === 'before' 
      ? `${currency.symbol}${formatted}`
      : `${formatted}${currency.symbol}`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return faArrowUp;
    if (growth < 0) return faArrowDown;
    return faMinus;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <AdminLayout 
      title={currentLang.title}
      subtitle={currentLang.subtitle}
    >
      {/* Page Title */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentLang.currencyManagement}</h2>
          <p className="text-gray-600">{currentLang.description}</p>
        </div>
        <button
          onClick={() => openCurrencyModal()}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          {currentLang.addCurrency}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading currencies...</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.totalCurrencies}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCurrencies}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon icon={faGlobe} className="w-3 h-3 mr-1 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Global support</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faDollarSign} className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.activeCurrencies}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeCurrencies}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 mr-1 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Live currencies</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faToggleOn} className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{currentLang.baseCurrency}</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.baseCurrencyCode}</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 mr-1 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Primary</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faGlobe} className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rate Changes</p>
                  <p className="text-2xl font-bold text-orange-600">+{stats.rateGrowth}%</p>
                  <div className="flex items-center mt-2">
                    <FontAwesomeIcon 
                      icon={getGrowthIcon(stats.rateGrowth)} 
                      className={`w-3 h-3 mr-1 ${getGrowthColor(stats.rateGrowth)}`} 
                    />
                    <span className={`text-sm font-medium ${getGrowthColor(stats.rateGrowth)}`}>
                      This week
                    </span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faArrowUp} className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={currentLang.searchCurrencies}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                <FontAwesomeIcon icon={faArrowUp} />
                <span>{currentLang.updateRates}</span>
              </button>
            </div>
          </div>

          {/* Currencies Table */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.currencyCode}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.currencyName}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.symbol}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.exchangeRate}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.regions}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.status}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentLang.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCurrencies.map((currency) => (
                    <tr key={currency._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-bold text-sm">{currency.code}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{currency.code}</div>
                            {currency.isBaseCurrency && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Base Currency
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{currency.name}</div>
                        <div className="text-sm text-gray-500">{currency.decimalPlaces} decimal places</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-gray-900">{currency.symbol}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">
                          {currency.exchangeRate.toFixed(4)}
                        </div>
                        <div className="text-xs text-gray-500">
                          vs {stats.baseCurrencyCode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {currency.regions.slice(0, 3).map(region => (
                            <span key={region} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {region}
                            </span>
                          ))}
                          {currency.regions.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              +{currency.regions.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(currency._id)}
                          className="flex items-center"
                        >
                          <FontAwesomeIcon 
                            icon={currency.isActive ? faToggleOn : faToggleOff} 
                            className={`w-8 h-8 ${currency.isActive ? 'text-green-500' : 'text-gray-400'}`} 
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openCurrencyModal(currency, false)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button
                            onClick={() => openCurrencyModal(currency, true)}
                            className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Edit Currency"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          {!currency.isBaseCurrency && (
                            <button
                              onClick={() => setBaseCurrency(currency._id)}
                              className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Set as Base"
                            >
                              <FontAwesomeIcon icon={faGlobe} />
                            </button>
                          )}
                          {!currency.isBaseCurrency && (
                            <button
                              onClick={() => handleDelete(currency._id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Currency"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditMode ? currentLang.editCurrency : currentLang.addNewCurrency}
                </h3>
                <button
                  onClick={() => setShowCurrencyModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.currencyCode} *
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    placeholder="USD"
                    maxLength={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      errors.code ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.currencyName} *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="US Dollar"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.symbol} *
                  </label>
                  <input
                    type="text"
                    value={formData.symbol || ''}
                    onChange={(e) => handleInputChange('symbol', e.target.value)}
                    placeholder="$"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      errors.symbol ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.symbol && <p className="text-red-500 text-sm mt-1">{errors.symbol}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.exchangeRate} *
                  </label>
                  <input
                    type="number"
                    value={formData.exchangeRate || ''}
                    onChange={(e) => handleInputChange('exchangeRate', parseFloat(e.target.value))}
                    step="0.0001"
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      errors.exchangeRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.exchangeRate && <p className="text-red-500 text-sm mt-1">{errors.exchangeRate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.decimalPlaces}
                  </label>
                  <select
                    value={formData.decimalPlaces || 2}
                    onChange={(e) => handleInputChange('decimalPlaces', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value={0}>0</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentLang.position}
                  </label>
                  <select
                    value={formData.symbolPosition || 'before'}
                    onChange={(e) => handleInputChange('symbolPosition', e.target.value as 'before' | 'after')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="before">{currentLang.before}</option>
                    <option value="after">{currentLang.after}</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center space-x-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive || false}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                    {currentLang.active}
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isBaseCurrency"
                    checked={formData.isBaseCurrency || false}
                    onChange={(e) => handleInputChange('isBaseCurrency', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isBaseCurrency" className="ml-2 text-sm font-medium text-gray-700">
                    {currentLang.setAsBase}
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCurrencyModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {currentLang.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {currentLang.save}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CurrencyManagement;
