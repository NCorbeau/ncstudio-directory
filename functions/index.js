/**
 * Main entry point for Cloudflare Functions
 * This file exports all your API functions for Wrangler to serve
 */

// Import API functions
import * as webhookHandler from './api/webhook.js';
import * as searchHandler from './api/search.js';
import * as renderLayoutHandler from './api/render-layout.js';
import * as directoryHandler from './api/directory.js';
import * as listingsHandler from './api/listings.js';

// CORS Headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Handle OPTIONS requests for CORS preflight
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// Add CORS headers to any response
function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  
  // Add all CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Export a fetch handler for Wrangler
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    try {
      let response;
      
      // Handle /api/webhook requests
      if (path === '/api/webhook') {
        response = await webhookHandler.onRequest({ request, env, ctx });
      }
      // Handle /api/search requests
      else if (path === '/api/search') {
        response = await searchHandler.onRequest({ request, env, ctx });
      }
      // Handle /api/render-layout requests
      else if (path === '/api/render-layout') {
        response = await renderLayoutHandler.onRequest({ request, env, ctx });
      }
      else if (path === '/api/directory') {
        response = await directoryHandler.onRequest({ request, env, ctx });
      }
      else if (path === '/api/listings') {
        response = await listingsHandler.onRequest({ request, env, ctx });
      }
      // Handle 404 for other API paths
      else if (path.startsWith('/api/')) {
        response = new Response(JSON.stringify({
          success: false,
          error: 'API endpoint not found'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      // Fallback response for non-API routes
      else {
        response = new Response('Not found', { status: 404 });
      }
      
      // Add CORS headers to the response
      return addCorsHeaders(response);
    } catch (error) {
      // Handle errors and add CORS headers
      const errorResponse = new Response(JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return addCorsHeaders(errorResponse);
    }
  }
}