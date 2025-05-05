/**
 * Unified API client for making requests to backend functions
 * Works in both browser and server environments
 */
import { fetchApi, getApiBaseUrl } from './core';
import { apiConfig } from '../../config';

/**
 * Build a complete API URL from endpoint and params
 */
export function getApiUrl(endpoint, params = {}) {
  const baseUrl = getApiBaseUrl();
  
  // Ensure endpoint starts with / if needed
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Build the URL
  const url = new URL(`${baseUrl}${normalizedEndpoint}`, baseUrl || (typeof window !== 'undefined' ? window.location.origin : undefined));
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  
  // If baseUrl is empty and in browser, return just the path to keep it relative
  if (!baseUrl && typeof window !== 'undefined') {
    return url.pathname + url.search;
  }
  
  return url.toString();
}

/**
 * Make a request to an API endpoint
 */
export async function apiRequest(endpoint, options = {}, queryParams = {}) {
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