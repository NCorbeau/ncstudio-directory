/**
 * Fix Astro JavaScript MIME type issues for Cloudflare Pages
 * Similar to fix-astro-css.js but for JavaScript files
 * Using ES Module syntax for compatibility with "type": "module" in package.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory of this file in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to check if a file is a JavaScript file
const isJSFile = (file) => file.endsWith('.js');

// Function to add content type headers for JS files
function addContentTypeHeadersForJS(directoryPath) {
  // Find _headers file and add content type rules for JS
  const headersPath = path.join(directoryPath, '_headers');
  
  if (fs.existsSync(headersPath)) {
    let headersContent = fs.readFileSync(headersPath, 'utf8');
    
    // Check if JS content type is already defined
    if (!headersContent.includes('/_astro/*.js')) {
      headersContent += '\n\n# JavaScript files\n/_astro/*.js\n  Content-Type: application/javascript\n';
      headersContent += '\n/*.js\n  Content-Type: application/javascript\n';
      
      fs.writeFileSync(headersPath, headersContent, 'utf8');
      console.log('Added JavaScript content-type headers to _headers file');
    }
  } else {
    // Create _headers file if it doesn't exist
    const content = `# JavaScript files
/_astro/*.js
  Content-Type: application/javascript

/*.js
  Content-Type: application/javascript
`;
    fs.writeFileSync(headersPath, content, 'utf8');
    console.log(`Created _headers file with JS content types in ${directoryPath}`);
  }
}

// Update _headers.override file if it exists
function updateHeadersOverride(directoryPath) {
  const headersOverridePath = path.join(directoryPath, '_headers.override');
  
  if (fs.existsSync(headersOverridePath)) {
    let content = fs.readFileSync(headersOverridePath, 'utf8');
    
    if (!content.includes('/*.js')) {
      content += '\n\n# JavaScript files\n/*.js\n  Content-Type: application/javascript\n';
      content += '\n/_astro/*.js\n  Content-Type: application/javascript\n';
      
      fs.writeFileSync(headersOverridePath, content, 'utf8');
      console.log('Updated _headers.override with JavaScript content types');
    }
  }
}

// Create _routes.json entries for JavaScript files if needed
function updateRoutesJson(directoryPath) {
  const routesPath = path.join(directoryPath, '_routes.json');
  
  if (fs.existsSync(routesPath)) {
    try {
      let routesContent = fs.readFileSync(routesPath, 'utf8');
      let routes = JSON.parse(routesContent);
      
      // Check if JavaScript routes already exist
      const hasJsRoute = routes.routes.some(route => 
        route.src === '/_astro/*.js' || route.src === '/*.js'
      );
      
      if (!hasJsRoute) {
        // Add JavaScript content type routes
        routes.routes.push({
          "src": "/_astro/*.js",
          "headers": {
            "Content-Type": "application/javascript"
          }
        });
        
        routes.routes.push({
          "src": "/*.js",
          "headers": {
            "Content-Type": "application/javascript"
          }
        });
        
        fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2), 'utf8');
        console.log('Updated _routes.json with JavaScript content types');
      }
    } catch (error) {
      console.error('Error updating _routes.json:', error);
    }
  }
}

// Create a simple .js-mime-types file to help debug
function createJsMimeTypesFile(directoryPath) {
  const content = `# JavaScript MIME Types
This file helps with debugging and indicates that JS MIME types have been fixed.

For JS files in _astro directory:
Content-Type: application/javascript

For JS files at root:
Content-Type: application/javascript
`;

  fs.writeFileSync(path.join(directoryPath, '.js-mime-types'), content, 'utf8');
}

// Process the dist directory
const distPath = path.resolve(__dirname, '../dist');

// Main execution function
async function main() {
  console.log('Starting JavaScript MIME type fixes...');

  try {
    // Process main dist directory
    addContentTypeHeadersForJS(distPath);
    updateHeadersOverride(distPath);
    updateRoutesJson(distPath);
    createJsMimeTypesFile(distPath);
    
    // Process any subdirectories that might be individual sites
    const dirEntries = fs.readdirSync(distPath, { withFileTypes: true });
    
    for (const entry of dirEntries) {
      if (entry.isDirectory()) {
        const subDirPath = path.join(distPath, entry.name);
        console.log(`Processing subdirectory: ${entry.name}`);
        
        addContentTypeHeadersForJS(subDirPath);
        updateHeadersOverride(subDirPath);
        updateRoutesJson(subDirPath);
        createJsMimeTypesFile(subDirPath);
      }
    }
    
    console.log('JavaScript MIME type fixes complete!');
    
    // Add explicit exit to ensure process terminates
    process.exit(0);
  } catch (error) {
    console.error('Error during JavaScript MIME type fixes:', error);
    process.exit(1);
  }
}

// Run the main function
main();