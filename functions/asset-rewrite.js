/**
 * Asset URL rewriter for Cloudflare Pages
 * This function handles the path resolution issue by correctly routing asset requests
 */
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Check if this is an _astro resource request at the root level
    if (path.startsWith('/_astro/')) {
      // Extract domain to determine which directory we're in
      const host = request.headers.get('host');
      
      // Define a mapping of domains to directory paths
      const domainToDirectory = {
        'french-desserts.ncstudio.click': 'french-desserts',
        'dog-parks-warsaw.ncstudio.click': 'dog-parks-warsaw'
      };
      
      // Default directory based on URL pattern
      let directory = '';
      const urlParts = path.split('/');
      
      // See if we can determine the directory from hostname
      if (host && domainToDirectory[host]) {
        directory = domainToDirectory[host];
      } 
      // Try to determine directory from URL path
      else {
        // Check for URL pattern with directory
        const pathMatch = url.pathname.match(/^\/([\w-]+)\/_astro\//);
        if (pathMatch && pathMatch[1]) {
          // Already has directory in path, no need to rewrite
          return next();
        }
        
        // Check for a referer to determine directory
        const referer = request.headers.get('referer');
        if (referer) {
          const refererUrl = new URL(referer);
          const refererParts = refererUrl.pathname.split('/');
          if (refererParts.length > 1 && refererParts[1]) {
            directory = refererParts[1];
          }
        }
      }
      
      // If we can determine a directory, rewrite the path
      if (directory && !path.includes(`/${directory}/_astro/`)) {
        // Create a new URL with correct directory path
        const newPath = `/${directory}${path}`;
        console.log(`Rewriting asset path from ${path} to ${newPath}`);
        
        // Create a new request with rewritten URL
        const newUrl = new URL(request.url);
        newUrl.pathname = newPath;
        
        const newRequest = new Request(newUrl.toString(), request);
        return env.ASSETS.fetch(newRequest);
      }
    }
    
    // Pass through all other requests
    return next();
  }