/**
 * This is a special catch-all function for Cloudflare Pages
 * It helps prevent erroneous routing to the root index page
 */
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;
  
    // Check if this is an asset path that should pass through
    if (path.includes('/_astro/') || path.endsWith('.js') || path.endsWith('.css')) {
      // Log the path for debugging
      console.log(`Handling asset path: ${path}`);
      
      // Pass through to the actual file without redirecting to index
      const response = await next();
      
      // Ensure the proper content type is set
      const newResponse = new Response(response.body, response);
      
      if (path.endsWith('.js')) {
        newResponse.headers.set('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        newResponse.headers.set('Content-Type', 'text/css');
      }
      
      return newResponse;
    }
  
    // For all other paths, let the normal routing handle it
    return next();
  }