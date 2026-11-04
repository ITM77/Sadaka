// API Configuration for Sadaka Mobile App

const __DEV__ = process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  // API Base URL
  BASE_URL: __DEV__ 
    ? 'http://localhost:8080/api/v1'
    : 'https://api.sadaka.tj/api/v1',
  
  // Timeout (ms)
  TIMEOUT: 30000,
  
  // Retry config
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  // Storage keys
  STORAGE_KEYS: {
    USER_TOKEN: 'sadaka_user_token',
    USER_DATA: 'sadaka_user_data',
    LANGUAGE: 'sadaka_language',
    THEME: 'sadaka_theme',
  },

  // App metadata
  APP_NAME: 'Садака',
  APP_VERSION: '0.1.0',
  
  // Languages
  LANGUAGES: {
    TJ: 'tj',
    RU: 'ru',
    EN: 'en',
  },

  // Currencies
  CURRENCY: 'TJS',
  
  // Min/Max amounts
  MIN_DONATION: 1,
  MAX_DONATION: 100000,
  
  // Ramadan multiplier
  RAMADAN_MULTIPLIER: 2.0,
  KURBAN_MULTIPLIER: 3.0,

  // UI Constants
  MAP_DEFAULT_ZOOM: 12,
  MAP_SEARCH_RADIUS: 5, // km
};

export default API_CONFIG;
