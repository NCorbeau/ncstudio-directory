/**
 * Cloudflare Pages middleware to fix MIME type issues
 * This runs before any request and ensures correct content types
 */
export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Process the request through the middleware
    const response = await next();
    
    // Create a new response with the correct MIME type headers
    const newResponse = new Response(response.body, response);
    
    // Add headers based on file extension
    if (path.endsWith('.js')) {
      newResponse.headers.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      newResponse.headers.set('Content-Type', 'text/css');
    } else if (path.endsWith('.svg')) {
      newResponse.headers.set('Content-Type', 'image/svg+xml');
    } else if (path.endsWith('.html') || path.endsWith('/')) {
      newResponse.headers.set('Content-Type', 'text/html; charset=UTF-8');
    } else if (path.endsWith('.json')) {
      newResponse.headers.set('Content-Type', 'application/json');
    }
    
    // Special handling for _astro directory
    if (path.startsWith('/_astro/')) {
      if (path.endsWith('.js')) {
        newResponse.headers.set('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        newResponse.headers.set('Content-Type', 'text/css');
      }
    }
    
    return newResponse;
  }