import { defineConfig } from 'astro/config';

// Get the current directory from environment variable (set by build script)
const currentDirectory = process.env.CURRENT_DIRECTORY || 'default';

// Determine site URL based on directory and environment
function getSiteUrl(directoryId) {
  // In production, each directory has its own domain
  if (process.env.CF_PAGES && process.env.CF_PAGES_BRANCH === 'main') {
    switch(directoryId) {
      case 'french-desserts':
        return 'https://frenchdesserts-guide.com';
      case 'dog-parks-warsaw':
        return 'https://dogparkswarsaw.com';
      default:
        return 'https://multi-directory-generator.pages.dev';
    }
  }
  
  // In preview/development, use the multi-directory approach
  return process.env.CF_PAGES
    ? 'https://multi-directory-generator.pages.dev'
    : 'http://localhost:3000';
}

// https://astro.build/config
export default defineConfig({
  site: getSiteUrl(currentDirectory),
  base: currentDirectory === 'default' ? '/' : `/${currentDirectory}`,
  outDir: currentDirectory === 'default' 
    ? './dist'
    : `./dist/${currentDirectory}`,
  build: {
    format: 'directory',
    assets: '_assets'
  },
  vite: {
    define: {
      'import.meta.env.CURRENT_DIRECTORY': JSON.stringify(currentDirectory)
    },
    ssr: {
      noExternal: ['marked']
    }
  }
});