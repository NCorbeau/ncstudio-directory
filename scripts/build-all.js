// scripts/build-all.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getDirectories, getDirectory } from '../src/lib/nocodb.js';
import { cleanupNestedDirectories } from './cleanup-build.js';

// Load environment variables
dotenv.config();

// Directory to save builds
const BUILD_DIR = path.resolve('./dist');

// Create build directory if it doesn't exist
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR);
}

// Function to copy all public assets to a directory's build output
function copyPublicAssetsToDirectory(directoryId) {
  const publicDir = path.resolve('./public');
  const targetDir = path.resolve(`./dist/${directoryId}`);
  
  console.log(`Copying public assets from ${publicDir} to ${targetDir}...`);
  
  // Function to copy directory recursively
  const copyDir = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  
  copyDir(publicDir, targetDir);
  console.log(`Copied public assets to ${directoryId}`);
}

// Function to build a specific directory
async function buildDirectory(directoryId) {
  console.log(`Building directory: ${directoryId}...`);
  
  // Set the current directory as an environment variable for the build
  process.env.CURRENT_DIRECTORY = directoryId;
  
  // Run Astro build with specific output
  try {
    execSync(`astro build --outDir ./dist/${directoryId}`, { 
      stdio: 'inherit',
      env: {...process.env}
    });
    
    // Add this line to copy public assets after the build
    copyPublicAssetsToDirectory(directoryId);
    // cleanupNestedDirectories(directoryId);
    
    console.log(`Build complete for ${directoryId}`);
    
    // Get the domain from NocoDB
    const directoryConfig = await getDirectory(directoryId);
    const domain = directoryConfig?.data?.domain;
    
    // Create a CNAME file for GitHub Pages (optional)
    if (domain) {
      fs.writeFileSync(
        path.resolve(`./dist/${directoryId}/CNAME`),
        domain
      );
      console.log(`Created CNAME file with domain: ${domain}`);
    }
    
    return { id: directoryId, domain, success: true };
  } catch (error) {
    console.error(`Error building ${directoryId}:`, error);
    return { id: directoryId, domain: null, success: false };
  }
}

// Build all directories fetched from NocoDB
async function buildAll() {
  try {
    console.log('Fetching directories from NocoDB...');
    const directories = await getDirectories();
    
    if (!directories || directories.length === 0) {
      throw new Error('No directories found in NocoDB');
    }
    
    console.log(`Found ${directories.length} directories to build`);
    
    const results = [];
    
    for (const directory of directories) {
      const result = await buildDirectory(directory.id);
      results.push(result);
    }
    
    // Output build results
    console.log('\n=== Build Results ===');
    console.table(results);
    
    // Create an index file in the dist directory that lists all built sites
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Directory Sites</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { border-bottom: 1px solid #eee; padding-bottom: 1rem; }
    ul { list-style-type: none; padding: 0; }
    li { margin: 1rem 0; padding: 1rem; border: 1px solid #eee; border-radius: 4px; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .success { color: green; }
    .failure { color: red; }
  </style>
</head>
<body>
  <h1>Generated Directory Sites</h1>
  <ul>
    ${results.map(({ id, domain, success }) => `
      <li>
        <strong>${id}</strong> 
        <span class="${success ? 'success' : 'failure'}">[${success ? 'Success' : 'Failed'}]</span><br>
        ${domain ? `Domain: ${domain}<br>` : ''}
        ${success ? `<a href="./${id}/">View Local Build</a>` : 'Build failed'}
      </li>
    `).join('')}
  </ul>
</body>
</html>
    `;
    
    fs.writeFileSync(path.resolve(`${BUILD_DIR}/index.html`), indexHtml);
    console.log('\nBuild index created at dist/index.html');
    
    // Report failures if any
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.error(`Failed to build ${failures.length} directories`);
      process.exit(1);
    }

    // Add explicit exit on success
    console.log('Build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Build process failed:', error);
    process.exit(1);
  }
}

buildAll().catch(error => {
  console.error('Unhandled error in build process:', error);
  process.exit(1);
});