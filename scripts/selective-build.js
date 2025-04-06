// scripts/selective-build.js
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

// Copy public assets to directory function
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
      
      // Skip _headers and _redirects as they're handled separately
      if (entry.name === '_headers' || entry.name === '_redirects') {
        continue;
      }
      
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

// Get the directory to build from command line args
const directoryToBuild = process.argv[2];

console.log(`Starting selective build for: ${directoryToBuild || 'all directories'}`);

// Create build directory if it doesn't exist
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR);
}

// Dependency map - if any of these paths change, rebuild the specified directories
const DEPENDENCIES = {
  'src/components/core/': ['all'],
  'src/layouts/': ['all'],
  'src/lib/': ['all'],
  'src/utils/': ['all'],
  'src/styles/global.css': ['all'],
  'src/styles/themes/elegant.css': ['french-desserts'],
  'src/styles/themes/nature.css': ['dog-parks-warsaw'],
};

// Get directories to build based on dependencies
async function getDirectoriesToBuild(changedPath) {
  // If specific directory provided and no deps, just build that one
  if (directoryToBuild && directoryToBuild !== 'all') {
    return [directoryToBuild];
  }
  
  // If path matches a dependency, build all affected directories
  if (changedPath) {
    for (const [pattern, directories] of Object.entries(DEPENDENCIES)) {
      if (changedPath.includes(pattern)) {
        if (directories.includes('all')) {
          return await getAllDirectories();
        }
        return directories;
      }
    }
  }
  
  // Default: build all directories
  return await getAllDirectories();
}

// Get all directory IDs from NocoDB
async function getAllDirectories() {
  try {
    const directories = await getDirectories();
    return directories.map(dir => dir.id);
  } catch (error) {
    console.error('Error fetching directories from NocoDB:', error);
    
    // Fallback to environment variable if available
    const directoriesEnv = process.env.DIRECTORIES;
    if (directoriesEnv) {
      return directoriesEnv.split(',');
    }
    
    // Hardcoded fallback as last resort
    return ['french-desserts', 'dog-parks-warsaw'];
  }
}

// Function to build a specific directory
async function buildDirectory(directoryId) {
  console.log(`Building directory: ${directoryId}...`);
  
  // First, check if the directory exists in NocoDB
  try {
    const directoryExists = await getDirectory(directoryId);
    if (!directoryExists) {
      console.error(`Directory ${directoryId} not found in NocoDB`);
      return false;
    }
  } catch (error) {
    console.error(`Error checking directory ${directoryId} in NocoDB:`, error);
    return false;
  }
  
  // Set the current directory as an environment variable for the build
  process.env.CURRENT_DIRECTORY = directoryId;
  
  // Run Astro build with specific output
  try {
    execSync(`astro build --outDir ./dist/${directoryId}`, { 
      stdio: 'inherit',
      env: {...process.env}
    });
    
    // Fix nested directories
    cleanupNestedDirectories(directoryId);
    
    // Add this line to copy public assets after the build
    copyPublicAssetsToDirectory(directoryId);
    
    console.log(`Build complete for ${directoryId}`);
    return true;
  } catch (error) {
    console.error(`Error building ${directoryId}:`, error);
    return false;
  }
}

// Build all specified directories
async function runSelectiveBuild() {
  const changedPath = process.env.CHANGED_PATH || '';
  const directoriesToBuild = await getDirectoriesToBuild(changedPath);
  
  console.log(`Will build the following directories: ${directoriesToBuild.join(', ')}`);
  
  const results = [];
  
  for (const directoryId of directoriesToBuild) {
    const success = await buildDirectory(directoryId);
    results.push({ directoryId, success });
  }
  
  // Output build results
  console.log('\n=== Build Results ===');
  console.table(results);
  
  // Create an index file in the dist directory
  createIndexFile(results);
  
  // Report failures if any
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.error(`Failed to build ${failures.length} directories`);
    process.exit(1);
  }

  console.log('Selective build completed successfully!');
  process.exit(0);
}

// Create an index file listing all built directories
function createIndexFile(results) {
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Directory Sites</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
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
  <p>Last build: ${new Date().toLocaleString()}</p>
  <ul>
    ${results.map(({ directoryId, success }) => `
      <li>
        <strong>${directoryId}</strong>
        <span class="${success ? 'success' : 'failure'}">[${success ? 'Success' : 'Failed'}]</span><br>
        ${success ? `<a href="./${directoryId}/">View Local Build</a>` : 'Build failed'}
      </li>
    `).join('')}
  </ul>
</body>
</html>
  `;
  
  fs.writeFileSync(path.resolve(`${BUILD_DIR}/index.html`), indexHtml);
  console.log('Build index created at dist/index.html');
}

// Run the selective build
runSelectiveBuild().catch(error => {
  console.error('Selective build failed:', error);
  process.exit(1);
});