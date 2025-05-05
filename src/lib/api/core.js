/**
 * Core API client functionality used by all API client implementations
 */
import { apiConfig } from '../../config';
import { isBrowser } from '../../utils/common';

/**
 * Get the base URL for API calls based on environment configuration
 */
export function getApiBaseUrl() {
  // Get configuration values
  const { useLocalApi } = apiConfig;
  
  // In the browser, use the current host by default
  if (isBrowser()) {
    // If explicitly set to use local API, use current origin
    if (useLocalApi) {
      return window.location.origin;
    }
    
    // Use relative paths for API requests in the browser
    return '';
  }
  
  // In Node.js context during build/SSR, use environment variables
  const siteUrl = process.env.SITE_URL || 'http://localhost:4321';
  return siteUrl;
}

/**
 * Core fetch function with error handling
 */
export async function fetchApi(url, options = {}) {
  try {
    // Set default headers if not provided
    const headers = options.headers || {};
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Check if the response is successful
    if (!response.ok) {
      // Try to get error details from the response
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.message || errorData.error || '';
      } catch (e) {
        // If we can't parse JSON, use status text
        errorDetails = response.statusText;
      }
      
      throw new Error(`API request failed: ${response.status} ${errorDetails}`);
    }
    
    // Parse JSON response (or return null for 204 No Content)
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in API request to ${url}:`, error);
    throw error;
  }
}