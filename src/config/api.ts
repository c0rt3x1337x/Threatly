// API Configuration
export const API_CONFIG = {
  // Development: localhost
  // Production: Railway URL
  BASE_URL: process.env.REACT_APP_API_URL || 'https://your-railway-app-name.up.railway.app/api',
  
  // Timeout settings
  TIMEOUT: 30000, // 30 seconds
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Environment detection
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Log the current API configuration (only in development)
if (isDevelopment) {
  console.log('API Configuration:', {
    BASE_URL: API_CONFIG.BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL
  });
}
