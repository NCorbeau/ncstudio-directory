/**
 * This script specifically fixes the _astro CSS MIME type issues
 * It copies all CSS files from the _astro directory to the root level
 * and creates necessary configuration to serve them properly
 */

import fs from 'fs';
import path from 'path';

// Directories
const BUILD_DIR = path.resolve('./dist');

// Main function
async function main() {
  console.log('Starting Astro CSS MIME type fix...');

  // Create a special _headers file just for Astro CSS
  createAstroCssHeaders();
  
  // Fix directory-specific Astro CSS
  const directories = getDirectories();
  directories.forEach(dir => {
    fixDirectoryAstroCss(dir);
  });
  
  // Create a route file for the Cloudflare asset middleware
  createAstroAssetRoutes();
  
  console.log('Astro CSS fixes completed!');
  
  // Add explicit exit to ensure process terminates
  process.exit(0);
}

// Get all directories in the dist folder
function getDirectories() {
  return fs.readdirSync(BUILD_DIR)
    .filter(dir => {
      const dirPath = path.join(BUILD_DIR, dir);
      return fs.statSync(dirPath).isDirectory() && 
        dir !== 'directory-selector' &&
        dir !== 'functions' &&
        !dir.startsWith('.');
    });
}

// Fix Astro CSS in a specific directory
function fixDirectoryAstroCss(directoryId) {
  console.log(`Fixing Astro CSS for ${directoryId}...`);
  
  const dirPath = path.join(BUILD_DIR, directoryId);
  const astroDir = path.join(dirPath, '_astro');
  
  // If _astro directory doesn't exist, nothing to fix
  if (!fs.existsSync(astroDir)) {
    console.log(`No _astro directory found in ${directoryId}`);
    return;
  }
  
  // Create the root _astro directory if it doesn't exist
  const rootAstroDir = path.join(BUILD_DIR, '_astro');
  if (!fs.existsSync(rootAstroDir)) {
    fs.mkdirSync(rootAstroDir, { recursive: true });
  }
  
  // Find all CSS files in the directory's _astro folder
  const cssFiles = findCssFiles(astroDir);
  console.log(`Found ${cssFiles.length} CSS files in ${directoryId}/_astro`);
  
  // Copy each CSS file to the root _astro directory
  cssFiles.forEach(cssFile => {
    const relPath = path.relative(astroDir, cssFile);
    const destPath = path.join(rootAstroDir, relPath);
    
    // Ensure the destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(cssFile, destPath);
    console.log(`Copied ${relPath} to root _astro directory`);
  });
}

// Find all CSS files in a directory (recursively)
function findCssFiles(directory) {
  const results = [];
  
  function traverse(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      
      if (fs.statSync(fullPath).isDirectory()) {
        traverse(fullPath);
      } else if (file.endsWith('.css')) {
        results.push(fullPath);
      }
    });
  }
  
  traverse(directory);
  return results;
}

// Create special headers file for Astro CSS
function createAstroCssHeaders() {
  const headersContent = `# Headers for Astro CSS files
/_astro/*
  Content-Type: text/css

/_astro/*.css
  Content-Type: text/css
`;

  const astroHeadersPath = path.join(BUILD_DIR, '_astro_headers');
  fs.writeFileSync(astroHeadersPath, headersContent);
  console.log('Created special headers file for Astro CSS');
  
  // Add content to the main _headers file too
  const mainHeadersPath = path.join(BUILD_DIR, '_headers');
  if (fs.existsSync(mainHeadersPath)) {
    const currentContent = fs.readFileSync(mainHeadersPath, 'utf8');
    const newContent = currentContent + '\n' + headersContent;
    fs.writeFileSync(mainHeadersPath, newContent);
    console.log('Added Astro CSS headers to main _headers file');
  } else {
    fs.writeFileSync(mainHeadersPath, headersContent);
    console.log('Created main _headers file with Astro CSS headers');
  }
}

// Create routes file for the asset middleware
function createAstroAssetRoutes() {
  const routesContent = `{
  "version": 1,
  "include": ["/_astro/*"],
  "exclude": [],
  "headers": {
    "Content-Type": "text/css"
  }
}`;

  const routesPath = path.join(BUILD_DIR, '_astro_routes.json');
  fs.writeFileSync(routesPath, routesContent);
  console.log('Created routes file for Astro CSS');
}

// Run the script
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});