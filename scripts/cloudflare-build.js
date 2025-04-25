/**
 * Build script for Cloudflare Pages, specifically handling multiple directories
 * with proper base path configuration to ensure correct asset paths
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

// Convert callbacks to promises
const execPromise = promisify(exec);

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables directly (not using dotenv)
const NOCODB_API_URL = process.env.NOCODB_API_URL;
const NOCODB_AUTH_TOKEN = process.env.NOCODB_AUTH_TOKEN;

console.log('NOCODB_API_URL:', NOCODB_API_URL);
console.log('NOCODB_AUTH_TOKEN:', NOCODB_AUTH_TOKEN ? '****' : 'Not Set');

// Check if we need to do a full build
const isFirstDeployment = !fs.existsSync(path.resolve(__dirname, '../dist'));
const isConfigChanged = !fs.existsSync(path.resolve(__dirname, '../dist/.build-config'));

if (isFirstDeployment || isConfigChanged) {
  console.log('🚀 First deployment detected - performing full build of all directories...');
  await buildAllDirectories();
} else {
  console.log('🔍 Checking for changes to determine directories to build...');
  await determineAndBuildChangedDirectories();
}

// Add explicit exit - this is necessary to terminate the Node.js process
process.exit(0);

/**
 * Build all directories for Cloudflare Pages
 */
async function buildAllDirectories() {
  console.log('Building all directories for Cloudflare Pages...');
  
  try {
    // Check if we're running in a Cloudflare Pages build environment
    const isCloudflarePages = process.env.CF_PAGES === 'true';
    
    // Import the directory fetch function from nocodb.js
    const { getDirectories } = await import('../src/lib/nocodb.js');
    console.log('Fetching directories from NocoDB...');
    
    // Get all directories from NocoDB
    const directories = await getDirectories();
    console.log(`Found ${directories.length} directories to build`);
    
    // Ensure dist directory exists
    if (!fs.existsSync(path.resolve(__dirname, '../dist'))) {
      fs.mkdirSync(path.resolve(__dirname, '../dist'), { recursive: true });
    }
    
    // Build each directory
    for (const directory of directories) {
      const directoryId = directory.id;
      console.log(`Building directory: ${directoryId}...`);
      
      // Set the base URL for this directory build
      // CRITICAL FIX: Set the correct base path for each directory
      process.env.ASTRO_BASE_PATH = `/${directoryId}`;
      
      // Set environment variables for the build
      process.env.CURRENT_DIRECTORY = directoryId;
      
      // Create directory-specific dist folder
      const distDir = path.resolve(__dirname, `../dist/${directoryId}`);
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      
      // Run Astro build for this directory
      try {
        await execPromise(`npx astro build --outDir ./dist/${directoryId}`);
        
        // Clean up nested directories that might cause issues
        console.log(`Cleaning up nested directories in ${directoryId} build...`);
        cleanupNestedDirectories(directoryId);
        
        // Copy public assets
        console.log(`Copying public assets from ${path.resolve(__dirname, '../public')} to ${path.resolve(__dirname, `../dist/${directoryId}`)}...`);
        copyPublicAssets(directoryId);
        
        console.log(`Build complete for ${directoryId}`);
        
        // Create CNAME file if running in Cloudflare Pages and directory has a domain
        if (isCloudflarePages && directory.data.domain) {
          const cnamePath = path.resolve(__dirname, `../dist/${directoryId}/CNAME`);
          fs.writeFileSync(cnamePath, directory.data.domain);
          console.log(`Created CNAME file with domain: ${directory.data.domain}`);
        }
      } catch (error) {
        console.error(`Error building directory ${directoryId}:`, error);
      }
    }
    
    // Fix directory structure to ensure proper asset paths
    console.log("\nFixing directory structure...");
    fixDirectoryStructure();
    
    // Build a simple index page to link to all built directories
    buildDirectorySelector(directories);
    
    // Save build configuration to cache
    saveBuildConfig();
    
    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Error building all directories:", error);
    process.exit(1);
  }
}

/**
 * Determine which directories have changed and build only those
 */
async function determineAndBuildChangedDirectories() {
  // For now, just build all directories
  // In a future version, this could check Git history to determine changed directories
  await buildAllDirectories();
}

/**
 * Clean up nested directories that might cause issues
 */
function cleanupNestedDirectories(directoryId) {
  const distDir = path.resolve(__dirname, `../dist/${directoryId}`);
  
  // Check if there's a nested directory with the same name (common issue)
  const nestedDir = path.resolve(distDir, directoryId);
  if (fs.existsSync(nestedDir) && fs.statSync(nestedDir).isDirectory()) {
    console.log(`Found nested directory: ${nestedDir}`);
    
    // Move all files from nested directory to parent
    const files = fs.readdirSync(nestedDir);
    files.forEach(file => {
      const srcPath = path.resolve(nestedDir, file);
      const destPath = path.resolve(distDir, file);
      
      // Skip if destination already exists
      if (fs.existsSync(destPath)) {
        return;
      }
      
      // Move file
      fs.renameSync(srcPath, destPath);
    });
    
    // Remove the now empty nested directory
    fs.rmdirSync(nestedDir);
  }
  
  // Also look for other directory folders that might have been created
  // For example, if building french-desserts, there might also be a dog-parks-warsaw folder
  const allDirs = fs.readdirSync(distDir)
    .filter(item => fs.statSync(path.resolve(distDir, item)).isDirectory())
    .filter(dir => dir !== directoryId && dir !== '_astro');
  
  allDirs.forEach(dir => {
    if (dir !== '_astro' && dir !== 'assets') {
      console.log(`Removing cross-contaminated directory ${path.resolve(distDir, dir)}`);
      deleteFolderRecursive(path.resolve(distDir, dir));
    }
  });
  
  console.log(`Cleanup complete for ${directoryId}`);
}

/**
 * Copy public assets to directory dist folder
 */
function copyPublicAssets(directoryId) {
  const publicDir = path.resolve(__dirname, '../public');
  const distDir = path.resolve(__dirname, `../dist/${directoryId}`);
  
  // Skip if public directory doesn't exist
  if (!fs.existsSync(publicDir)) {
    return;
  }
  
  // Copy all files from public to dist
  const files = fs.readdirSync(publicDir);
  files.forEach(file => {
    const srcPath = path.resolve(publicDir, file);
    const destPath = path.resolve(distDir, file);
    
    // Skip if it's a directory or special file
    if (fs.statSync(srcPath).isDirectory()) {
      return;
    }
    
    // Skip if destination already exists
    if (fs.existsSync(destPath)) {
      return;
    }
    
    // Copy file
    fs.copyFileSync(srcPath, destPath);
  });
  
  console.log(`Copied public assets to ${directoryId}`);
}

/**
 * Recursively delete a folder
 */
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach(file => {
      const curPath = path.join(folderPath, file);
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

/**
 * Fix the directory structure to ensure proper asset paths
 * This is critical for ensuring correct JS and CSS references
 */
function fixDirectoryStructure() {
  const distDir = path.resolve(__dirname, '../dist');
  
  // Get all directories in dist
  const directories = fs.readdirSync(distDir)
    .filter(item => fs.statSync(path.resolve(distDir, item)).isDirectory())
    .filter(dir => dir !== '_astro' && dir !== 'assets');
  
  console.log(`Found directories to fix: ${directories.join(', ')}`);
  
  // Process each directory
  directories.forEach(dir => {
    console.log(`Cleaning up nested directories in ${dir} build...`);
    cleanupNestedDirectories(dir);
  });
  
  console.log('Fixed all directories!');
}

/**
 * Build a simple directory selector page
 */
function buildDirectorySelector(directories) {
  const distDir = path.resolve(__dirname, '../dist');
  const indexPath = path.resolve(distDir, 'index.html');
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Directory Sites</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 {
      border-bottom: 1px solid #eee;
      padding-bottom: 1rem;
    }
    ul {
      list-style-type: none;
      padding: 0;
    }
    li {
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid #eee;
      border-radius: 4px;
    }
    a {
      color: \`#0066cc\`;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .success {
      color: green;
    }
    .failure {
      color: red;
    }
  </style>
</head>
<body>
  <h1>Generated Directory Sites</h1>
  <ul>`;
  
  directories.forEach(directory => {
    const directoryId = directory.id;
    const dirPath = path.resolve(distDir, directoryId);
    const success = fs.existsSync(dirPath);
    const domain = directory.data.domain || '';
    
    html += `
<li>
  <strong>${directoryId}</strong>
  <span class="${success ? 'success' : 'failure'}">[${success ? 'Success' : 'Failed'}]</span><br>
  ${domain ? `Domain: ${domain}<br>` : ''}
  <a href="./${directoryId}/">View Local Build</a>
</li>`;
  });
  
  html += `
  </ul>
</body>
</html>`;
  
  fs.writeFileSync(indexPath, html);
  
  // Create a copy in directory-selector directory for better routing
  const selectorDir = path.resolve(distDir, 'directory-selector');
  if (!fs.existsSync(selectorDir)) {
    fs.mkdirSync(selectorDir, { recursive: true });
  }
  
  fs.writeFileSync(path.resolve(selectorDir, 'index.html'), html);
  
  console.log('Created directory selector page');
}

/**
 * Save build configuration for caching
 */
function saveBuildConfig() {
  const configPath = path.resolve(__dirname, '../dist/.build-config');
  const config = {
    buildTime: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}