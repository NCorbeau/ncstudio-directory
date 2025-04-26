// src/utils/api-url.ts - UPDATED
// Utility for working with API URLs
import { apiConfig } from '../config';
import { isBrowser } from './common';

/**
 * Get the base URL for API calls based on environment configuration
 * @returns {string} The base URL to use for API calls
 */
export function getApiBaseUrl(): string {
  // Get configuration values
  const { useLocalApi } = apiConfig;
  
  // In the browser, use the current host by default
  if (isBrowser()) {
    // If explicitly set to use local API, use current origin
    if (useLocalApi) {
      return window.location.origin;
    }
    
    // Use relative paths for API requests in the browser
    // This keeps everything on the same domain to avoid CSP issues
    return '';
  }
  
  // In Node.js context during build/SSR, use environment variables
  const siteUrl = process.env.SITE_URL || 'http://localhost:4321';
  
  if (useLocalApi) {
    return siteUrl;
  }
  
  return siteUrl; // Use the site URL for server-side API calls
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
  
  // Use the base URL (empty string for client-side requests to use relative paths)
  const url = new URL(`${baseUrl}${normalizedEndpoint}`, baseUrl || window.location.origin);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  
  // If baseUrl is empty, return just the path and query string to keep it relative
  if (!baseUrl && isBrowser()) {
    return url.pathname + url.search;
  }
  
  return url.toString();
}