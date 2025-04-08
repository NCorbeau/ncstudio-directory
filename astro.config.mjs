// astro.config.mjs
import { defineConfig } from 'astro/config';

// Get the current directory from environment variable (set by build script)
const currentDirectory = process.env.CURRENT_DIRECTORY || 'default';

// Determine site URL based on directory and environment
async function getSiteUrl(directoryId) {
  // In production, each directory has its own domain
  if (process.env.CF_PAGES && process.env.CF_PAGES_BRANCH === 'main') {
    // For production, attempt to get domain from NocoDB
    try {
      const { getDirectory } = await import('./src/lib/nocodb.js');
      const directory = await getDirectory(directoryId);
      
      if (directory?.data?.domain) {
        return `https://${directory.data.domain}`;
      }
    } catch (error) {
      console.warn(`Error fetching domain for ${directoryId} from NocoDB:`, error);
    }
    
    // Fallback domains if not found in NocoDB
    switch(directoryId) {
      case 'french-desserts':
        return 'https://french-desserts.ncstudio.click';
      case 'dog-parks-warsaw':
        return 'https://dog-parks-warsaw.ncstudio.click';
      default:
        return 'https://ncstudio-directory.pages.dev';
    }
  }
  
  // In preview/development, use the multi-directory approach
  return process.env.CF_PAGES
    ? 'https://ncstudio-directory.pages.dev'
    : 'http://localhost:4321';
}

export default defineConfig({
  site: await getSiteUrl(currentDirectory),
  
  // Use empty base for Cloudflare Pages
  base: '/',
  
  // Important: Don't double-nest pages - put them directly in the directory
  outDir: currentDirectory === 'default' 
    ? './dist'
    : `./dist/${currentDirectory}`,
  
  build: {
    format: 'directory'
  },
  vite: {
    define: {
      'import.meta.env.CURRENT_DIRECTORY': JSON.stringify(currentDirectory)
    },
    ssr: {
      noExternal: ['marked']
    },
    build: {
      sourcemap: true
    },
    // Add this section for development server assets
    server: {
      fs: {
        allow: ['.']
      }
    },
    // Improved handling of paths for development mode
    plugins: [
      {
        name: 'directory-assets-resolver',
        configureServer(server) {
          if (process.env.NODE_ENV !== 'production') {
            server.middlewares.use((req, res, next) => {
              // If request is for a static asset under the current directory path
              if (req.url.startsWith(`/${currentDirectory}/`)) {
                req.url = req.url.replace(`/${currentDirectory}/`, '/');
              }
              next();
            });
          }
        }
      }
    ]
  }
});