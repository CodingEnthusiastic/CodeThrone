// API Configuration
export const API_CONFIG = {
  // Use environment variables with fallback to localhost for development
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
};

// Helper function to get Socket.IO URL
export const getSocketUrl = () => API_CONFIG.SOCKET_URL;

// Export individual URLs for easy access
export const API_BASE_URL = API_CONFIG.BASE_URL.replace('/api', ''); // Without /api suffix
export const API_URL = API_CONFIG.BASE_URL; // With /api suffix
export const SOCKET_URL = API_CONFIG.SOCKET_URL;
