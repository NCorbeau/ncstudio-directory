/**
 * API URL utility for handling local vs. deployed function endpoints
 */

/**
 * Get the base URL for API calls based on environment configuration
 * @returns {string} The base URL to use for API calls
 */
export function getApiBaseUrl() {
    // In the browser, use the current host by default
    if (typeof window !== 'undefined') {
      const useLocalApi = import.meta.env.PUBLIC_USE_LOCAL_API === 'true';
      const configuredApiUrl = import.meta.env.PUBLIC_API_BASE_URL || '';
      
      // Debug what's happening with the environment variables
      console.debug('API Config:', {
        useLocalApi,
        configuredApiUrl,
        envVars: { ...import.meta.env }
      });
      
      // If explicitly set to use local API, use current origin
      if (useLocalApi) {
        return window.location.origin;
      }
      
      // If API_BASE_URL is set, use it
      if (configuredApiUrl) {
        return configuredApiUrl;
      }
      
      // Default to current origin (which will 404 if functions aren't running locally)
      return window.location.origin;
    }
    
    // In Node.js context during build/SSR, use environment variables
    const useLocalApi = process.env.PUBLIC_USE_LOCAL_API === 'true' || process.env.USE_LOCAL_API === 'true';
    const apiBaseUrl = process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '';
    const siteUrl = process.env.SITE_URL || 'http://localhost:4321';
    
    if (useLocalApi) {
      return siteUrl;
    }
    
    return apiBaseUrl || siteUrl;
  }
  
  /**
   * Get the full URL for an API endpoint
   * @param {string} endpoint - The API endpoint path (e.g., "/api/search")
   * @param {Record<string, string>} params - Query parameters
   * @returns {string} The complete API URL
   */
  export function getApiUrl(endpoint, params = {}) {
    const baseUrl = getApiBaseUrl();
    
    // Ensure endpoint starts with / if needed
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Create URL object
    const url = new URL(`${baseUrl}${normalizedEndpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    
    return url.toString();
  }