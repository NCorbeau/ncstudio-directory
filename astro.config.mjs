// astro.config.mjs
import { defineConfig } from 'astro/config';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import solid from '@astrojs/solid-js';

// Explicitly load environment variables
// Load base .env file
dotenv.config();

// Try to load .env.local if it exists (overrides .env)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envLocalResult = dotenv.config({ path: envLocalPath, override: true });
  if (envLocalResult.error) {
    console.warn('Error loading .env.local:', envLocalResult.error);
  } else {
    console.log('Loaded environment variables from .env.local');
  }
}

// Log the API environment variables to help with debugging
console.log('API Environment Variables:');
console.log('- PUBLIC_API_BASE_URL:', process.env.PUBLIC_API_BASE_URL || '(not set)');
console.log('- PUBLIC_USE_LOCAL_API:', process.env.PUBLIC_USE_LOCAL_API || '(not set)');

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

  integrations: [solid()],

  vite: {
    define: {
      'import.meta.env.CURRENT_DIRECTORY': JSON.stringify(currentDirectory),
      // Explicitly pass environment variables to client-side code
      'import.meta.env.PUBLIC_API_BASE_URL': JSON.stringify(process.env.PUBLIC_API_BASE_URL || ''),
      'import.meta.env.PUBLIC_USE_LOCAL_API': JSON.stringify(process.env.PUBLIC_USE_LOCAL_API || 'false')
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