/**
 * Enhanced local API handler for development
 * This simulates the Cloudflare Workers API without making network requests
 */
import { getListings, getDirectory, searchListings } from '../nocodb';

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
 * Local directory handler
 * @param {URLSearchParams} params - URL search parameters
 * @returns {Promise<object>} - Directory data
 */
export async function handleDirectory(params) {
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

/**
 * Local listings handler
 * @param {URLSearchParams} params - URL search parameters 
 * @returns {Promise<object>} - Listings data
 */
export async function handleListings(params) {
  const directoryId = params.get('directory');
  
  if (!directoryId) {
    return {
      success: false,
      message: 'Directory ID is required'
    };
  }
  
  try {
    const listings = await getListings(directoryId);
    
    return {
      success: true,
      data: listings
    };
  } catch (error) {
    console.error(`Error fetching listings for ${directoryId}:`, error);
    return {
      success: false,
      message: 'Error fetching listings',
      error: error.message
    };
  }
}

/**
 * Mock webhook handler
 * @returns {Promise<object>} - Success response
 */
export async function handleWebhook() {
  return {
    success: true,
    message: 'Webhook received (local mock)'
  };
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
  switch (endpoint) {
    case '/api/search':
      return handleSearch(params);
    
    case '/api/render-layout':
      return handleRenderLayout(params);
    
    case '/api/directory':
      return handleDirectory(params);
    
    case '/api/listings':
      return handleListings(params);
    
    case '/api/webhook':
      return handleWebhook();
    
    default:
      // Return 404 for unhandled endpoints
      return {
        success: false,
        error: `API endpoint not found: ${endpoint}`
      };
  }
}

/**
 * Process request body from options
 * @param {object} options - Request options
 * @returns {object|null} - Parsed body or null
 */
export async function getRequestBody(options) {
  if (!options.body) return null;
  
  try {
    if (typeof options.body === 'string') {
      return JSON.parse(options.body);
    } else if (options.body instanceof FormData) {
      // Convert FormData to object
      const formData = {};
      options.body.forEach((value, key) => {
        formData[key] = value;
      });
      return formData;
    } else {
      return options.body;
    }
  } catch (error) {
    console.error('Error parsing request body:', error);
    return null;
  }
}

/**
 * Check if environment is set to use local API
 * @returns {boolean} - Whether to use local API
 */
export function isUsingLocalApi() {
  // Check environment variables
  if (typeof window !== 'undefined') {
    // Browser environment
    return import.meta.env.PUBLIC_USE_LOCAL_API === 'true';
  } else {
    // Server environment
    return process.env.PUBLIC_USE_LOCAL_API === 'true';
  }
}