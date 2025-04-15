/**
 * Centralized API client for making requests to backend functions
 */
import { getApiUrl } from './api-url';

/**
 * Make a request to an API endpoint
 * @param {string} endpoint - The API endpoint path (e.g., "/api/search")
 * @param {object} options - Fetch options
 * @param {object} queryParams - Query parameters
 * @returns {Promise<any>} - The response data
 */
export async function apiRequest(endpoint, options = {}, queryParams = {}) {
  // Check if we should use local API handlers
  const useLocalApi = typeof window !== 'undefined' 
    ? import.meta.env.PUBLIC_USE_LOCAL_API === 'true'
    : process.env.PUBLIC_USE_LOCAL_API === 'true' || process.env.USE_LOCAL_API === 'true';
  
  // Use local API handler if configured
  if (useLocalApi && typeof window !== 'undefined') {
    try {
      // Dynamically import local API handlers
      const { handleLocalApiRequest } = await import('./local-api-handler.js');
      
      // Convert queryParams to URLSearchParams
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
      
      // Handle the request locally
      return handleLocalApiRequest(endpoint, options, params);
    } catch (error) {
      console.error('Error using local API handler:', error);
      // Fall back to regular API request if local handling fails
    }
  }
  
  try {
    const url = getApiUrl(endpoint, queryParams);
    
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
    console.error(`Error in API request to ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Search API client
 * @param {string} directoryId - Directory ID
 * @param {string} query - Search query
 * @returns {Promise<{results: Array}>} - Search results
 */
export async function searchDirectory(directoryId, query) {
  return apiRequest('/api/search', {}, { directory: directoryId, q: query });
}

/**
 * Get layout data API client
 * @param {string} directoryId - Directory ID
 * @param {string} layout - Layout type
 * @returns {Promise<{data: object}>} - Layout data
 */
export async function getLayoutData(directoryId, layout) {
  return apiRequest('/api/render-layout', {}, { directory: directoryId, layout });
}

/**
 * Webhook API client (for admin usage)
 * @param {object} data - Webhook payload
 * @returns {Promise<any>} - Webhook response
 */
export async function triggerWebhook(data) {
  return apiRequest('/api/webhook', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}