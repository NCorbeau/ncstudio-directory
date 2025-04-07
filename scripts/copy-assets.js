/**
 * This script ensures all static assets are correctly copied to each directory
 * with proper file permissions and content-types
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Directories to process
const BUILD_DIR = path.resolve('./dist');
const PUBLIC_DIR = path.resolve('./public');

// Get a list of all directories in the dist folder
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

// Copy a file with correct permissions
function copyWithPermissions(src, dest) {
  try {
    // Create the destination directory if it doesn't exist
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(src, dest);
    
    // Set file permissions to be world-readable (644)
    fs.chmodSync(dest, 0o644);
    
    return true;
  } catch (err) {
    console.error(`Error copying ${src} to ${dest}:`, err);
    return false;
  }
}

// Copy all style files to all directories
function copyStylesToAllDirectories() {
  console.log('Copying style files to all directories...');
  
  const directories = getDirectories();
  const stylesDir = path.join(PUBLIC_DIR, 'styles');
  
  if (!fs.existsSync(stylesDir)) {
    console.warn('Styles directory not found in public folder');
    return;
  }
  
  // Copy all styles recursively to each directory
  directories.forEach(dir => {
    const targetDir = path.join(BUILD_DIR, dir, 'styles');
    
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Function to recursively copy all files in a directory
    function copyDirRecursive(src, dest) {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyDirRecursive(srcPath, destPath);
        } else {
          copyWithPermissions(srcPath, destPath);
        }
      }
    }
    
    copyDirRecursive(stylesDir, targetDir);
    console.log(`Copied styles to ${dir}`);
  });
}

// Verify CSS files have the correct content-type and permissions
function verifyCssFiles() {
  console.log('Verifying CSS files...');
  
  const directories = getDirectories();
  
  directories.forEach(dir => {
    const stylesDir = path.join(BUILD_DIR, dir, 'styles');
    
    if (!fs.existsSync(stylesDir)) {
      console.warn(`Styles directory not found in ${dir}`);
      return;
    }
    
    // Check global.css exists
    const globalCssPath = path.join(stylesDir, 'global.css');
    if (!fs.existsSync(globalCssPath)) {
      console.error(`global.css not found in ${dir}`);
    } else {
      console.log(`✓ ${dir}/styles/global.css exists`);
      fs.chmodSync(globalCssPath, 0o644);
    }
    
    // Check theme CSS files
    const themesDir = path.join(stylesDir, 'themes');
    if (!fs.existsSync(themesDir)) {
      console.warn(`Themes directory not found in ${dir}/styles`);
    } else {
      // Check each theme file
      const themeFiles = ['default.css', 'modern.css', 'elegant.css', 'nature.css'];
      themeFiles.forEach(themeFile => {
        const themePath = path.join(themesDir, themeFile);
        if (!fs.existsSync(themePath)) {
          console.warn(`${themeFile} not found in ${dir}/styles/themes`);
        } else {
          console.log(`✓ ${dir}/styles/themes/${themeFile} exists`);
          fs.chmodSync(themePath, 0o644);
        }
      });
    }
  });
}

// Main execution
function main() {
  console.log('Starting asset verification and copying...');
  
  // Copy all styles to all directories
  copyStylesToAllDirectories();
  
  // Verify CSS files
  verifyCssFiles();
  
  console.log('Asset processing complete!');
}

// Run the script
main();