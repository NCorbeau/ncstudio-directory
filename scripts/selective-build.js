// scripts/selective-build.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { loadDirectories, getDirectoryIds } from './directory-loader.js';
import { cleanupNestedDirectories } from './cleanup-build.js';
import { 
  copyPublicAssetsToDirectory, 
  ensureDirectoryExists,
  createIndexFile 
} from './build-utils.js';

// Load environment variables
dotenv.config();

// Directory to save builds
const BUILD_DIR = path.resolve('./dist');

// Get the directory to build from command line args
const directoryToBuild = process.argv[2];

console.log(`Starting selective build for: ${directoryToBuild || 'all directories'}`);

// Create build directory if it doesn't exist
ensureDirectoryExists(BUILD_DIR);

// Dependency map - if any of these paths change, rebuild the specified directories
const DEPENDENCIES = {
  'src/components/core/': ['all'],
  'src/layouts/': ['all'],
  'src/lib/': ['all'],
  'src/utils/': ['all'],
  'src/styles/global.css': ['all'],
  'src/styles/themes/elegant.css': ['elegant'], // Map by theme instead of directory
  'src/styles/themes/nature.css': ['nature'],   // Map by theme instead of directory
};

// Get directories to build based on dependencies
async function getDirectoriesToBuild(changedPath) {
  // If specific directory provided and no deps, just build that one
  if (directoryToBuild && directoryToBuild !== 'all') {
    return [directoryToBuild];
  }
  
  // Get directory-theme mapping
  const directories = await loadDirectories();
  const directoryThemes = {};
  
  directories.forEach(dir => {
    const theme = dir.data.theme || 'default';
    if (!directoryThemes[theme]) {
      directoryThemes[theme] = [];
    }
    directoryThemes[theme].push(dir.id);
  });
  
  // If path matches a dependency, build all affected directories
  if (changedPath) {
    for (const [pattern, affectedThemes] of Object.entries(DEPENDENCIES)) {
      if (changedPath.includes(pattern)) {
        if (affectedThemes.includes('all')) {
          return await getDirectoryIds();
        }
        
        // Get all directories with the affected themes
        let affectedDirectories = [];
        affectedThemes.forEach(theme => {
          if (directoryThemes[theme]) {
            affectedDirectories = [...affectedDirectories, ...directoryThemes[theme]];
          }
        });
        
        return affectedDirectories;
      }
    }
  }
  
  // Default: build all directories
  return await getDirectoryIds();
}

// Function to build a specific directory
async function buildDirectory(directoryId) {
  console.log(`Building directory: ${directoryId}...`);
  
  // First, check if the directory exists in NocoDB
  try {
    const allDirectories = await loadDirectories();
    const directoryExists = allDirectories.some(dir => dir.id === directoryId);
    
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
    await cleanupNestedDirectories(directoryId);
    
    // Copy public assets after the build using our centralized utility
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
  
  // Create an index file in the dist directory using our utility
  createIndexFile(results, BUILD_DIR);
  
  // Report failures if any
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.error(`Failed to build ${failures.length} directories`);
    process.exit(1);
  }

  console.log('Selective build completed successfully!');
  process.exit(0);
}

// Run the selective build
runSelectiveBuild().catch(error => {
  console.error('Selective build failed:', error);
  process.exit(1);
});