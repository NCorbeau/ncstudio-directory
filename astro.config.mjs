// astro.config.mjs
import { defineConfig } from 'astro/config';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import solid from '@astrojs/solid-js';
import { loadDirectories } from './scripts/directory-loader.js';

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
console.log('Current directory:', currentDirectory);

// Always use single directory mode
const isSingleDirectoryBuild = true;
console.log('Single directory build: yes (always)');

// Always use empty base path for single directory mode
const basePath = '';
console.log(`Using base path: / (root)`);

// Determine site URL based on directory and environment
async function getSiteUrl(directoryId) {
  // In production, use the domain from the environment if available
  if (process.env.CF_PAGES && process.env.CF_PAGES_BRANCH === 'main') {
    if (process.env.SITE_DOMAIN) {
      return `https://${process.env.SITE_DOMAIN}`;
    }
    
    // Try to get domain from NocoDB for this directory
    try {
      const directories = await loadDirectories();
      const directory = directories.find(dir => dir.id === directoryId);
      
      if (directory?.data?.domain) {
        return `https://${directory.data.domain}`;
      }
    } catch (error) {
      console.warn(`Error fetching domain for ${directoryId} from NocoDB:`, error);
    }
    
    // Fallback to using a default domain pattern if none is found
    return `https://${directoryId}.ncstudio.click`;
  }
  
  // In preview/development, use localhost
  return process.env.CF_PAGES
    ? 'https://ncstudio-directory.pages.dev'
    : 'http://localhost:4321';
}

export default defineConfig({
  site: await getSiteUrl(currentDirectory),
  
  // Use the proper base path for asset references
  base: basePath,
  
  // Output directory configuration
  outDir: './dist',
  
  build: {
    format: 'directory',
    // Force correct mime types for JavaScript files
    assetsPrefix: undefined
  },

  integrations: [solid()],

  vite: {
    define: {
      'import.meta.env.CURRENT_DIRECTORY': JSON.stringify(currentDirectory),
      'import.meta.env.IS_SINGLE_DIRECTORY': JSON.stringify(isSingleDirectoryBuild),
      // Explicitly pass environment variables to client-side code
      'import.meta.env.PUBLIC_API_BASE_URL': JSON.stringify(process.env.PUBLIC_API_BASE_URL || ''),
      'import.meta.env.PUBLIC_USE_LOCAL_API': JSON.stringify(process.env.PUBLIC_USE_LOCAL_API || 'false')
    },
    ssr: {
      noExternal: ['marked']
    },
    build: {
      sourcemap: true,
      // Add these options for better JS compilation
      rollupOptions: {
        output: {
          entryFileNames: `_astro/[name].[hash].js`,
          chunkFileNames: `_astro/[name].[hash].js`,
          assetFileNames: `_astro/[name].[hash].[ext]`,
          // Ensure correct MIME type for JS files
          format: 'es'
        }
      }
    },
    // Add this section for development server assets
    server: {
      fs: {
        allow: ['.']
      }
    }
  }
});