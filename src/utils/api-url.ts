// src/utils/api-url.ts
// Utility for working with API URLs
import { apiConfig } from '../config';
import { isBrowser } from './common';

/**
 * Get the base URL for API calls based on environment configuration
 * @returns {string} The base URL to use for API calls
 */
export function getApiBaseUrl(): string {
  // Get configuration values
  const { useLocalApi, baseUrl } = apiConfig;
  
  // In the browser, use the current host by default
  if (isBrowser()) {
    // Debug what's happening with the environment variables
    console.debug('API Config:', {
      useLocalApi,
      baseUrl,
      envVars: { ...import.meta.env }
    });
    
    // If explicitly set to use local API, use current origin
    if (useLocalApi) {
      return window.location.origin;
    }
    
    // If API_BASE_URL is set, use it
    if (baseUrl) {
      return baseUrl;
    }
    
    // Default to current origin (which will 404 if functions aren't running locally)
    return window.location.origin;
  }
  
  // In Node.js context during build/SSR, use environment variables
  const siteUrl = process.env.SITE_URL || 'http://localhost:4321';
  
  if (useLocalApi) {
    return siteUrl;
  }
  
  return baseUrl || siteUrl;
}

/**
 * Get the full URL for an API endpoint
 * @param {string} endpoint - The API endpoint path (e.g., "/api/search")
 * @param {Record<string, string>} params - Query parameters
 * @returns {string} The complete API URL
 */
export function getApiUrl(
  endpoint: string, 
  params: Record<string, string | null | undefined> = {}
): string {
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