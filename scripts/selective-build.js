/**
 * Selective build script for multi-directory project
 * This script builds only the specified directory, or all directories if none is specified
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Directory to save builds
const BUILD_DIR = path.resolve('./dist');

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
function getDirectoriesToBuild(changedPath) {
  // If specific directory provided and no deps, just build that one
  if (directoryToBuild && directoryToBuild !== 'all') {
    return [directoryToBuild];
  }
  
  // If path matches a dependency, build all affected directories
  if (changedPath) {
    for (const [pattern, directories] of Object.entries(DEPENDENCIES)) {
      if (changedPath.includes(pattern)) {
        if (directories.includes('all')) {
          return getAllDirectories();
        }
        return directories;
      }
    }
  }
  
  // Default: build all directories
  return getAllDirectories();
}

// Get all directory IDs from content/directories folder or config
function getAllDirectories() {
  // If we're using NocoDB, we'll need to look at our directory configs
  // Either in environment variables or a local cache
  const directoriesEnv = process.env.DIRECTORIES;
  if (directoriesEnv) {
    return directoriesEnv.split(',');
  }
  
  // Fallback to checking directories in the codebase
  try {
    const dirFilePattern = /.*\.yml$/;
    const directoriesPath = path.resolve('./src/content/directories');
    if (fs.existsSync(directoriesPath)) {
      return fs.readdirSync(directoriesPath)
        .filter(file => dirFilePattern.test(file))
        .map(file => path.basename(file, path.extname(file)));
    }
  } catch (error) {
    console.warn('Error reading directories from filesystem:', error);
  }
  
  // Hardcoded fallback
  return ['french-desserts', 'dog-parks-warsaw'];
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
  const directoriesToBuild = getDirectoriesToBuild(changedPath);
  
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