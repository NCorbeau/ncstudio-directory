/**
 * Unified API client for making requests to backend functions
 * Works in both browser and server environments
 */
import { fetchApi, getApiBaseUrl } from './core';
import { apiConfig } from '../../config';
import { handleLocalApiRequest } from '../../utils/local-api-handler';

/**
 * Build a complete API URL from endpoint and params
 */
export function getApiUrl(endpoint, params = {}) {
  // If using local API, handle differently
  if (apiConfig.useLocalApi && typeof window !== 'undefined') {
    // For local development, use relative URLs
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(normalizedEndpoint, window.location.origin);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    
    return url.pathname + url.search;
  }
  
  // For production, use the external API
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${baseUrl}${normalizedEndpoint}`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  
  return url.toString();
}

/**
 * Make a request to an API endpoint
 */
export async function apiRequest(endpoint, options = {}, queryParams = {}) {
  // Use local API handlers during development if configured
  if (apiConfig.useLocalApi && typeof window !== 'undefined') {
    try {
      // Parse query parameters
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      
      // Handle the request locally
      return await handleLocalApiRequest(endpoint, options, params);
    } catch (error) {
      console.error('Error in local API handler:', error);
      throw error;
    }
  }
  
  // Use the external API in production
  const url = getApiUrl(endpoint, queryParams);
  return fetchApi(url, options);
}

/**
 * Get directory data
 */
export async function getDirectory(directoryId) {
  try {
    const response = await apiRequest('/api/directory', {}, { id: directoryId });
    return response.data;
  } catch (error) {
    console.error(`Error fetching directory ${directoryId}:`, error);
    
    // Fallback: Try to use the data embedded in the page
    if (typeof window !== 'undefined' && 
        window.__INITIAL_DATA__ && 
        window.__INITIAL_DATA__.directory &&
        window.__INITIAL_DATA__.directory.id === directoryId) {
      console.log('Using pre-rendered directory data');
      return window.__INITIAL_DATA__.directory;
    }
    
    return null;
  }
}

/**
 * Get listings for a directory
 */
export async function getListings(directoryId) {
  try {
    const response = await apiRequest('/api/listings', {}, { directory: directoryId });
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching listings for ${directoryId}:`, error);
    
    // Fallback: Try to use the data embedded in the page
    if (typeof window !== 'undefined' && 
        window.__INITIAL_DATA__ && 
        window.__INITIAL_DATA__.listings) {
      console.log('Using pre-rendered listings data');
      return window.__INITIAL_DATA__.listings;
    }
    
    return [];
  }
}

/**
 * Search directory listings
 */
export async function searchDirectory(directoryId, query) {
  return apiRequest('/api/search', {}, { directory: directoryId, q: query });
}

/**
 * Get layout data
 */
export async function getLayoutData(directoryId, layout) {
  return apiRequest('/api/render-layout', {}, { directory: directoryId, layout });
}

/**
 * Trigger webhook (for admin usage)
 */
export async function triggerWebhook(data) {
  return apiRequest('/api/webhook', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Get related listings
 */
export async function getRelatedListings(directoryId, listingId, limit = 3) {
  try {
    const response = await apiRequest('/api/related', {}, {
      directory: directoryId,
      listing: listingId,
      limit
    });
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching related listings:`, error);
    return [];
  }
}