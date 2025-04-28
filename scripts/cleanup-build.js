// scripts/cleanup-build.js
// This script removes unwanted nested directories in the build output and fixes cross-contamination

import fs from "fs";
import path from "path";
import { getDirectoryIds } from "./directory-loader.js";

/**
 * Identify and clean up nested directory folders in build output
 * @param {string} directoryId - The directory ID being processed
 */
export function cleanupNestedDirectories(directoryId) {
  console.log(`Cleaning up nested directories in ${directoryId} build...`);

  const distDir = path.resolve(`./dist/${directoryId}`);

  // Check if the directory exists
  if (!fs.existsSync(distDir)) {
    console.warn(`Directory ${distDir} does not exist, skipping cleanup.`);
    return;
  }

  // Look specifically for the nested duplicate directory
  const nestedDirPath = path.join(distDir, directoryId);

  // If this nested directory exists, we need to clean it up
  if (fs.existsSync(nestedDirPath) && fs.statSync(nestedDirPath).isDirectory()) {
    console.log(`Found nested directory: ${nestedDirPath}`);
    
    // Move all files from nested directory up to parent
    moveFilesUp(nestedDirPath, distDir);
    console.log(`Moved files from ${nestedDirPath} to ${distDir}`);
  }

  // Remove other directory content that doesn't belong here (cross-contamination)
  removeOtherDirectoryContent(distDir, directoryId);

  console.log(`Cleanup complete for ${directoryId}`);
}

/**
 * Helper function to move files from a subdirectory up one level
 * @param {string} sourceDir - Source directory
 * @param {string} targetDir - Target directory
 */
function moveFilesUp(sourceDir, targetDir) {
  // Get all files and subdirectories
  const items = fs.readdirSync(sourceDir);

  // Process each item
  for (const item of items) {
    const sourcePath = path.join(sourceDir, item);
    const targetPath = path.join(targetDir, item);

    try {
      // If it's a directory, create it in the target and move its contents recursively
      if (fs.statSync(sourcePath).isDirectory()) {
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
        moveFilesUp(sourcePath, targetPath);
      } else {
        // Move the file, but first ensure the target directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Copy the file (don't worry if it already exists)
        try {
          fs.copyFileSync(sourcePath, targetPath);
        } catch (err) {
          // If file already exists, this is fine
          if (err.code !== 'EEXIST') {
            console.warn(`Warning: Could not copy ${sourcePath} to ${targetPath}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      console.warn(`Warning: Error processing ${sourcePath}: ${err.message}`);
    }
  }

  // Clean up the source directory after moving everything
  try {
    fs.rmSync(sourceDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Warning: Could not remove directory ${sourceDir}: ${err.message}`);
  }
}

/**
 * Remove content from other directories (fix cross-contamination)
 * @param {string} distDir - The dist directory for the current directory
 * @param {string} directoryId - Current directory ID
 */
async function removeOtherDirectoryContent(distDir, directoryId) {
  // Get all directories dynamically from NocoDB
  let knownDirectories;
  try {
    knownDirectories = await getDirectoryIds();
  } catch (error) {
    console.error('Error fetching directories from NocoDB:', error);
    // Fallback to discovering directories from dist folder
    knownDirectories = fs.readdirSync(path.resolve('./dist'))
      .filter(dir => {
        const dirPath = path.join(path.resolve('./dist'), dir);
        return fs.statSync(dirPath).isDirectory() && 
          dir !== 'directory-selector' &&
          dir !== 'functions' &&
          !dir.startsWith('.');
      });
  }
  
  // Remove other directories that don't belong here
  knownDirectories.forEach(otherId => {
    if (otherId !== directoryId) {
      const otherDirPath = path.join(distDir, otherId);
      if (fs.existsSync(otherDirPath) && fs.statSync(otherDirPath).isDirectory()) {
        console.log(`Removing cross-contaminated directory ${otherDirPath}`);
        fs.rmSync(otherDirPath, { recursive: true, force: true });
      }
    }
  });
}

/**
 * Fix the entire dist directory
 * This can be called as a standalone function after a complete build
 */
export async function fixDistDirectory() {
  console.log("Fixing the entire dist directory structure...");
  
  const distDir = path.resolve('./dist');
  if (!fs.existsSync(distDir)) {
    console.warn('Dist directory does not exist, nothing to fix.');
    return;
  }
  
  // Get all directories in dist (except special ones)
  const directories = fs.readdirSync(distDir).filter(dir => {
    const dirPath = path.join(distDir, dir);
    return fs.statSync(dirPath).isDirectory() && 
      dir !== 'directory-selector' &&
      dir !== 'functions' &&
      !dir.startsWith('.');
  });
  
  console.log(`Found directories to fix: ${directories.join(', ')}`);
  
  // Process each directory
  for (const directoryId of directories) {
    await cleanupNestedDirectories(directoryId);
  }
  
  console.log("Fixed all directories!");
}

// If script is run directly, fix all directories
if (process.argv[1] === import.meta.url) {
  fixDistDirectory().catch(error => {
    console.error('Error fixing directories:', error);
    process.exit(1);
  });
}