/**
 * Fix Astro JavaScript MIME type issues for Cloudflare Pages
 * Similar to fix-astro-css.js but for JavaScript files
 */
const fs = require('fs');
const path = require('path');

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

// Process the dist directory
const distPath = path.resolve(__dirname, '../dist');
addContentTypeHeadersForJS(distPath);
updateHeadersOverride(distPath);

// Also process any subdirectories that might be individual sites
try {
  const dirEntries = fs.readdirSync(distPath, { withFileTypes: true });
  for (const entry of dirEntries) {
    if (entry.isDirectory()) {
      const subDirPath = path.join(distPath, entry.name);
      addContentTypeHeadersForJS(subDirPath);
      updateHeadersOverride(subDirPath);
    }
  }
} catch (error) {
  console.error('Error processing subdirectories:', error);
}

console.log('JavaScript MIME type fixes complete!');