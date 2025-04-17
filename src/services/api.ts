// src/services/api.ts
// Centralized service for API interactions
import { getApiUrl } from '../utils/api-url';
import type { 
  SearchResponse, 
  LayoutDataResponse, 
  Directory, 
  Listing 
} from '../types';

/**
 * Make a request to an API endpoint
 */
export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  queryParams: Record<string, string> = {}
): Promise<T> {
  // Check if we should use local API handlers
  const useLocalApi = typeof window !== 'undefined' 
    ? import.meta.env.PUBLIC_USE_LOCAL_API === 'true'
    : process.env.PUBLIC_USE_LOCAL_API === 'true' || process.env.USE_LOCAL_API === 'true';
  
  // Use local API handler if configured
  if (useLocalApi && typeof window !== 'undefined') {
    try {
      // Dynamically import local API handlers
      const { handleLocalApiRequest } = await import('../utils/local-api-handler.js');
      
      // Convert queryParams to URLSearchParams
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
      
      // Handle the request locally
      return handleLocalApiRequest(endpoint, options, params) as Promise<T>;
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
      return null as T;
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`Error in API request to ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Search directory listings
 */
export async function searchDirectory(directoryId: string, query: string): Promise<SearchResponse> {
  return apiRequest<SearchResponse>('/api/search', {}, { directory: directoryId, q: query });
}

/**
 * Get layout data for client-side rendering
 */
export async function getLayoutData(directoryId: string, layout: string): Promise<LayoutDataResponse> {
  return apiRequest<LayoutDataResponse>('/api/render-layout', {}, { directory: directoryId, layout });
}

/**
 * Get directory configuration
 */
export async function getDirectory(directoryId: string): Promise<Directory | null> {
  try {
    const response = await apiRequest<{success: boolean, data?: Directory}>('/api/directory', {}, { id: directoryId });
    return response.data || null;
  } catch (error) {
    console.error(`Error fetching directory ${directoryId}:`, error);
    return null;
  }
}

/**
 * Get directory listings
 */
export async function getListings(directoryId: string): Promise<Listing[]> {
  try {
    const response = await apiRequest<{success: boolean, listings: Listing[]}>('/api/listings', {}, { directory: directoryId });
    return response.listings || [];
  } catch (error) {
    console.error(`Error fetching listings for ${directoryId}:`, error);
    return [];
  }
}

/**
 * Webhook API client (for admin usage)
 */
export async function triggerWebhook(data: Record<string, unknown>): Promise<any> {
  return apiRequest<any>('/api/webhook', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}