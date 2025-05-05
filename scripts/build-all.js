// scripts/build-all.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getDirectories, getDirectory } from '../src/lib/nocodb.js';
import { 
  copyPublicAssetsToDirectory, 
  ensureDirectoryExists, 
  createIndexFile 
} from './build-utils.js';
import { cleanupNestedDirectories, fixDistDirectory } from './cleanup-build.js';

// Load environment variables
dotenv.config();

// Directory to save builds
const BUILD_DIR = path.resolve('./dist');

// Create build directory if it doesn't exist
ensureDirectoryExists(BUILD_DIR);

// Function to build a specific directory
async function buildDirectory(directoryId) {
  console.log(`Building directory: ${directoryId}...`);
  
  // Set the current directory as an environment variable for the build
  process.env.CURRENT_DIRECTORY = directoryId;
  
  try {
    // Run Astro build with specific output
    execSync(`astro build --outDir ./dist/${directoryId}`, { 
      stdio: 'inherit',
      env: {...process.env}
    });
    
    // Clean up nested directories
    cleanupNestedDirectories(directoryId);
    
    // Add this line to copy public assets after the build
    copyPublicAssetsToDirectory(directoryId);
    
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
    
    // After building all directories, fix the entire dist structure
    console.log("\nFixing directory structure...");
    fixDistDirectory();
    
    // Output build results
    console.log('\n=== Build Results ===');
    console.table(results);
    
    // Create an index file in the dist directory that lists all built sites
    createIndexFile(results, BUILD_DIR);
    
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