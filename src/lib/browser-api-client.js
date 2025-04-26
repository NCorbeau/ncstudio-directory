// src/lib/browser-api-client.js
// Browser-safe API client for client components

import { apiRequest } from '../utils/api-client';

/**
 * Get directory data
 * @param {string} directoryId - Directory ID
 * @returns {Promise<object>} - Directory data
 */
export async function getDirectory(directoryId) {
  try {
    // Use relative path for API request to avoid CSP issues
    const response = await apiRequest('/api/directory', {}, { id: directoryId });
    return response.data;
  } catch (error) {
    console.error(`Error fetching directory ${directoryId}:`, error);
    
    // Fallback: Try to use the data embedded in the page
    try {
      // Check if there's pre-rendered directory data in the window object
      if (typeof window !== 'undefined' && 
          window.__INITIAL_DATA__ && 
          window.__INITIAL_DATA__.directory &&
          window.__INITIAL_DATA__.directory.id === directoryId) {
        console.log('Using pre-rendered directory data');
        return window.__INITIAL_DATA__.directory;
      }
    } catch (fallbackError) {
      console.error('Error using fallback directory data:', fallbackError);
    }
    
    return null;
  }
}

/**
 * Get listings for a directory
 * @param {string} directoryId - Directory ID
 * @returns {Promise<Array>} - Array of listings
 */
export async function getListings(directoryId) {
  try {
    // Use relative path for API request to avoid CSP issues
    const response = await apiRequest('/api/listings', {}, { directory: directoryId });
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching listings for ${directoryId}:`, error);
    
    // Fallback: Try to use the data embedded in the page
    try {
      if (typeof window !== 'undefined' && 
          window.__INITIAL_DATA__ && 
          window.__INITIAL_DATA__.listings) {
        console.log('Using pre-rendered listings data');
        return window.__INITIAL_DATA__.listings;
      }
    } catch (fallbackError) {
      console.error('Error using fallback listings data:', fallbackError);
    }
    
    return [];
  }
}

/**
 * Search listings
 * @param {string} directoryId - Directory ID
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching listings
 */
export async function searchListings(directoryId, query) {
  try {
    // Use relative path for API request to avoid CSP issues
    const response = await apiRequest('/api/search', {}, { 
      directory: directoryId,
      q: query
    });
    return response;
  } catch (error) {
    console.error(`Error searching listings for ${directoryId}:`, error);
    return { success: false, results: [], error: error.message };
  }
}

/**
 * Get related listings
 * @param {string} directoryId - Directory ID 
 * @param {string} listingId - Listing ID to find relations for
 * @param {number} limit - Maximum number of listings
 * @returns {Promise<Array>} - Array of related listings
 */
export async function getRelatedListings(directoryId, listingId, limit = 3) {
  try {
    // Use relative path for API request to avoid CSP issues
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