import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Currency {
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
}

interface CurrencyContextType {
  // Current currency settings
  currentCurrency: Currency;
  baseCurrency: Currency;
  availableCurrencies: Currency[];
  
  // Currency operations
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number, currency?: Currency) => string;
  convertPrice: (amount: number, fromCurrency: Currency, toCurrency: Currency) => number;
  
  // Currency management
  isLoading: boolean;
  updateExchangeRates: () => Promise<void>;
  getCurrencyByCode: (code: string) => Currency | undefined;
  
  // User preferences
  userPreferredCurrency: string;
  setUserPreferredCurrency: (currencyCode: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default currencies
const defaultCurrencies: Currency[] = [
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
    lastUpdated: '2024-01-20T10:30:00Z'
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
    lastUpdated: '2024-01-20T10:30:00Z'
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
    lastUpdated: '2024-01-20T10:30:00Z'
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
    lastUpdated: '2024-01-20T10:30:00Z'
  }
];

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>(defaultCurrencies);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(defaultCurrencies[0]);
  const [baseCurrency, setBaseCurrency] = useState<Currency>(defaultCurrencies[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [userPreferredCurrency, setUserPreferredCurrencyState] = useState<string>('USD');

  // Initialize currencies and user preferences
  useEffect(() => {
    initializeCurrencies();
    loadUserPreferences();
  }, []);

  // Update current currency when user preference changes
  useEffect(() => {
    const preferredCurrency = getCurrencyByCode(userPreferredCurrency);
    if (preferredCurrency && preferredCurrency.isActive) {
      setCurrentCurrency(preferredCurrency);
    }
  }, [userPreferredCurrency, availableCurrencies]);

  const initializeCurrencies = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from API
      // const currencies = await fetchCurrencies();
      // setAvailableCurrencies(currencies);
      
      const base = defaultCurrencies.find(c => c.isBaseCurrency) || defaultCurrencies[0];
      setBaseCurrency(base);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing currencies:', error);
      setIsLoading(false);
    }
  };

  const loadUserPreferences = () => {
    try {
      const savedCurrency = localStorage.getItem('user_preferred_currency');
      if (savedCurrency) {
        setUserPreferredCurrencyState(savedCurrency);
      } else {
        // Detect user's region and set appropriate currency
        const userRegion = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[1];
        const regionCurrency = availableCurrencies.find(c => 
          c.regions.includes(userRegion?.toUpperCase() || '')
        );
        if (regionCurrency) {
          setUserPreferredCurrencyState(regionCurrency.code);
        }
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const setCurrency = (currency: Currency) => {
    if (currency.isActive) {
      setCurrentCurrency(currency);
      setUserPreferredCurrency(currency.code);
    }
  };

  const setUserPreferredCurrency = (currencyCode: string) => {
    setUserPreferredCurrencyState(currencyCode);
    try {
      localStorage.setItem('user_preferred_currency', currencyCode);
    } catch (error) {
      console.error('Error saving user preference:', error);
    }
  };

  const formatPrice = (amount: number, currency?: Currency): string => {
    const targetCurrency = currency || currentCurrency;
    const convertedAmount = convertPrice(amount, baseCurrency, targetCurrency);
    const formatted = convertedAmount.toFixed(targetCurrency.decimalPlaces);
    
    return targetCurrency.symbolPosition === 'before' 
      ? `${targetCurrency.symbol}${formatted}`
      : `${formatted}${targetCurrency.symbol}`;
  };

  const convertPrice = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
    if (fromCurrency.code === toCurrency.code) {
      return amount;
    }
    
    // Convert to base currency first, then to target currency
    const baseAmount = fromCurrency.isBaseCurrency 
      ? amount 
      : amount / fromCurrency.exchangeRate;
      
    return toCurrency.isBaseCurrency 
      ? baseAmount 
      : baseAmount * toCurrency.exchangeRate;
  };

  const updateExchangeRates = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from an exchange rate API
      // const updatedRates = await fetchExchangeRates();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update rates with small random variations for demo
      const updatedCurrencies = availableCurrencies.map(currency => {
        if (currency.isBaseCurrency) return currency;
        
        const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
        const newRate = currency.exchangeRate * (1 + variation);
        
        return {
          ...currency,
          exchangeRate: Math.round(newRate * 10000) / 10000, // Round to 4 decimals
          lastUpdated: new Date().toISOString()
        };
      });
      
      setAvailableCurrencies(updatedCurrencies);
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating exchange rates:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const getCurrencyByCode = (code: string): Currency | undefined => {
    return availableCurrencies.find(currency => currency.code === code);
  };

  const contextValue: CurrencyContextType = {
    currentCurrency,
    baseCurrency,
    availableCurrencies: availableCurrencies.filter(c => c.isActive),
    setCurrency,
    formatPrice,
    convertPrice,
    isLoading,
    updateExchangeRates,
    getCurrencyByCode,
    userPreferredCurrency,
    setUserPreferredCurrency
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook to use currency context
export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// Currency selector component
export const CurrencySelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentCurrency, availableCurrencies, setCurrency, isLoading } = useCurrency();

  return (
    <div className={`relative ${className}`}>
      <select
        value={currentCurrency.code}
        onChange={(e) => {
          const currency = availableCurrencies.find(c => c.code === e.target.value);
          if (currency) setCurrency(currency);
        }}
        disabled={isLoading}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-900 cursor-pointer outline-none disabled:opacity-50"
      >
        {availableCurrencies.map(currency => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default CurrencyContext;
