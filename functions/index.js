/**
 * Main entry point for Cloudflare Functions
 * This file exports all your API functions for Wrangler to serve
 */

// Import API functions
import * as webhookHandler from './api/webhook.js';
import * as searchHandler from './api/search.js';

// Export a fetch handler for Wrangler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle /api/webhook requests
    if (path === '/api/webhook') {
      if (request.method === 'OPTIONS') {
        return webhookHandler.onRequestOptions(context);
      }
      return webhookHandler.onRequest({ request, env, ctx });
    }
    
    // Handle /api/search requests
    if (path === '/api/search') {
      return searchHandler.get({ request, env, ctx });
    }

    // Handle 404 for other API paths
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({
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
    return new Response('Not found', { status: 404 });
  }
}