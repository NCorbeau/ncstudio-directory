// functions/_middleware.js - Cloudflare Pages Function
// This helps ensure we properly route requests to the directories

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const pathname = url.pathname;
    
    // Handle root path (sends to directory selector)
    if (pathname === "/") {
      return context.next();
    }
    
    // Subdirectory paths like /dog-parks-warsaw/ or /french-desserts/
    const match = pathname.match(/^\/([^\/]+)(\/.*)?$/);
    if (match) {
      const directory = match[1];
      const rest = match[2] || '/';
      
      // Check if this is one of our known directories
      if (directory === 'dog-parks-warsaw' || directory === 'french-desserts') {
        console.log(`Accessing directory: ${directory}, path: ${rest}`);
        // Continue processing the request, should find files in the directory
        return context.next();
      }
    }
    
    // Otherwise continue (will hit 404 if not found)
    return context.next();
  }