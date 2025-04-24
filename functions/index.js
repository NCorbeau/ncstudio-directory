/**
 * Main entry point for all Cloudflare Functions
 * This fixes asset routing issues in Cloudflare Pages
 */

// Import all handlers
import * as webhookHandler from './api/webhook.js';
import * as searchHandler from './api/search.js';
import * as renderLayoutHandler from './api/render-layout.js';

// Handle static assets directly - this is critical
async function handleAsset(request, env, assetPath) {
  try {
    // Try to directly fetch the asset from KV or R2
    // This bypasses the normal routing
    const asset = await env.ASSETS.fetch(assetPath);
    if (asset) {
      // Make sure the right Content-Type is set
      const headers = new Headers(asset.headers);
      
      if (assetPath.endsWith('.js')) {
        headers.set('Content-Type', 'application/javascript');
      } else if (assetPath.endsWith('.css')) {
        headers.set('Content-Type', 'text/css');
      }
      
      return new Response(asset.body, { 
        status: 200, 
        headers 
      });
    }
  } catch (e) {
    // If direct asset access fails, try normal routing
    console.error(`Error accessing asset ${assetPath}:`, e);
  }
  
  return null;
}

// Export the fetch handler for Cloudflare Pages
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
    
    // Try to serve static assets directly first
    if (path.includes('/_astro/') || path.endsWith('.js') || path.endsWith('.css')) {
      const assetResponse = await handleAsset(request, env, path);
      if (assetResponse) return assetResponse;
    }
    
    // Handle API routes
    if (path === '/api/webhook') {
      return webhookHandler.onRequest({ request, env, ctx });
    }
    
    if (path === '/api/search') {
      return searchHandler.onRequest({ request, env, ctx });
    }
    
    if (path === '/api/render-layout') {
      return renderLayoutHandler.onRequest({ request, env, ctx });
    }
    
    // For all other paths, use normal Pages routing
    try {
      // Access the asset using Cloudflare Pages' built-in asset handling
      // This should return the file content with a default Content-Type
      const response = await env.ASSETS.fetch(request);
      
      // If it's not a JS or CSS file, just return as is
      if (!path.endsWith('.js') && !path.endsWith('.css')) {
        return response;
      }
      
      // For JS and CSS files, set the correct Content-Type
      const headers = new Headers(response.headers);
      
      if (path.endsWith('.js')) {
        headers.set('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        headers.set('Content-Type', 'text/css');
      }
      
      return new Response(response.body, { 
        status: response.status, 
        headers 
      });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response('Server Error', { status: 500 });
    }
  }
};