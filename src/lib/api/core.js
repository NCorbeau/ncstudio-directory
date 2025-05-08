/**
 * Core API client functionality used by all API client implementations
 */
import { apiConfig } from '../../config';

/**
 * Get the base URL for API calls based on environment configuration
 */
export function getApiBaseUrl() {
  // Simply return the configured API base URL
  return apiConfig.baseUrl;
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
      headers,
      // Add mode: 'cors' for cross-origin requests
      mode: 'cors',
      // Add credentials policy if needed
      credentials: 'same-origin' // or 'include' if you need to send cookies
    });
    
    // Rest of the function remains the same...
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