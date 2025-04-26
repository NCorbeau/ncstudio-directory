/**
 * Local API handlers for development
 * These simulate the Cloudflare Functions for local testing
 */
import { getListings, getDirectory, searchListings } from '../lib/nocodb';

/**
 * Local search handler
 * @param {URLSearchParams} params - URL search parameters
 * @returns {Promise<object>} - Search results matching the Cloudflare function format
 */
export async function handleSearch(params) {
  const directoryId = params.get('directory');
  const query = params.get('q');
  
  if (!directoryId) {
    return {
      success: false,
      message: 'Directory ID is required'
    };
  }
  
  if (!query || query.trim() === '') {
    return {
      success: true,
      results: []
    };
  }
  
  try {
    // Use the existing searchListings function from nocodb.js
    const results = await searchListings(directoryId, query);
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error in local search handler:', error);
    return {
      success: false,
      message: 'Error processing search request',
      error: error.message
    };
  }
}

/**
 * Local render-layout handler
 * @param {URLSearchParams} params - URL search parameters
 * @returns {Promise<object>} - Layout data matching the Cloudflare function format
 */
export async function handleRenderLayout(params) {
  const layoutType = params.get('layout');
  const directoryId = params.get('directory');
  
  if (!layoutType || !directoryId) {
    return {
      success: false,
      error: 'Missing required parameters: layout and directory are required'
    };
  }
  
  try {
    // Fetch directory data
    const directoryData = await getDirectory(directoryId);
    
    if (!directoryData) {
      return {
        success: false,
        error: `Directory not found: ${directoryId}`
      };
    }
    
    // Fetch listings
    const listings = await getListings(directoryId);
    
    // Validate layout type
    const validLayouts = ['Card', 'Map', 'Table', 'Magazine', 'List'];
    if (!validLayouts.includes(layoutType)) {
      return {
        success: false,
        error: `Invalid layout type: ${layoutType}`
      };
    }
    
    // Return data in the same format as the Cloudflare function
    return {
      success: true,
      data: {
        layout: layoutType,
        listings,
        directory: directoryData.data,
        categories: directoryData.data.categories || []
      }
    };
  } catch (error) {
    console.error('Error in local layout handler:', error);
    return {
      success: false,
      error: 'Error processing request',
      details: error.message
    };
  }
}

/**
 * Main router for local API handling
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Request options
 * @param {URLSearchParams} params - URL search parameters
 * @returns {Promise<object>} - API response
 */
export async function handleLocalApiRequest(endpoint, options = {}, params = new URLSearchParams()) {
  console.log(`[Local API] Handling request to ${endpoint}`);
  
  // Route requests to appropriate handlers
  if (endpoint === '/api/search') {
    return handleSearch(params);
  } else if (endpoint === '/api/render-layout') {
    return handleRenderLayout(params);
  } else if (endpoint === '/api/webhook') {
    // We can mock the webhook response
    return {
      success: true,
      message: 'Webhook received (local mock)'
    };
  } else if (endpoint === '/api/directory') {
    // Handle directory requests
    const directoryId = params.get('id');
    if (!directoryId) {
      return {
        success: false,
        message: 'Directory ID is required'
      };
    }
    
    try {
      const directoryData = await getDirectory(directoryId);
      if (!directoryData) {
        return {
          success: false,
          message: `Directory not found: ${directoryId}`
        };
      }
      
      return {
        success: true,
        data: directoryData.data
      };
    } catch (error) {
      console.error(`Error fetching directory data for ${directoryId}:`, error);
      return {
        success: false,
        message: 'Error fetching directory data',
        error: error.message
      };
    }
  }
  
  // Return 404 for unhandled endpoints
  return {
    success: false,
    error: 'API endpoint not found'
  };
}