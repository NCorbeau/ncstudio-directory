/**
 * Single Directory Build Script
 * Builds ONLY the specified directory and outputs it directly to dist root
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory to build from command line or environment variable
const TARGET_DIRECTORY = process.argv[2] || process.env.CURRENT_DIRECTORY;

// Validation
if (!TARGET_DIRECTORY) {
  console.error('ERROR: Target directory is required');
  console.error('Usage: node scripts/build-single-directory.js [directory-id]');
  console.error('Or set the CURRENT_DIRECTORY environment variable');
  process.exit(1);
}

// Output directory - direct to dist root
const OUTPUT_DIR = path.resolve('./dist');
const TEMP_DIR = path.resolve('./temp-build');

console.log(`🚀 Building ONLY directory: ${TARGET_DIRECTORY} to root output`);

try {
  // Clean previous builds
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  
  // Create directories
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  
  // Set environment variables for the Astro build
  const buildEnv = {
    ...process.env,
    CURRENT_DIRECTORY: TARGET_DIRECTORY,
    BUILD_MODE: 'single',  // Signal that this is a single directory build
    BASE_PATH: ''
  };
  
  console.log('Step 1: Building with Astro to temporary directory...');
  
  // Run the Astro build with special flags
  execSync(`astro build --outDir ${TEMP_DIR} --base ""`, { 
    stdio: 'inherit',
    env: buildEnv
  });
  
  console.log('Step 2: Moving files from directory subfolder to root...');
  
  // Find the directory-specific folder in the temp build
  const dirPath = path.join(TEMP_DIR, TARGET_DIRECTORY);
  
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory output folder ${dirPath} was not created by build`);
  }
  
  // Move all files from the specific directory to the root output
  // First, copy shared assets
  console.log('Step 3: Copying shared assets...');
  
  // Copy _astro folder (contains all JS and CSS)
  const astroDir = path.join(TEMP_DIR, '_astro');
  if (fs.existsSync(astroDir)) {
    fs.cpSync(astroDir, path.join(OUTPUT_DIR, '_astro'), { recursive: true });
  }
  
  // Copy styles folder
  const stylesDir = path.join(TEMP_DIR, 'styles');
  if (fs.existsSync(stylesDir)) {
    fs.cpSync(stylesDir, path.join(OUTPUT_DIR, 'styles'), { recursive: true });
  }
  
  // Copy favicon and other root assets
  const rootFiles = fs.readdirSync(TEMP_DIR)
    .filter(file => !fs.statSync(path.join(TEMP_DIR, file)).isDirectory() || 
                   file.startsWith('_') || 
                   file === 'styles' || 
                   file === '_astro' ||
                   file === 'favicon.svg');
  
  rootFiles.forEach(file => {
    const sourcePath = path.join(TEMP_DIR, file);
    const destPath = path.join(OUTPUT_DIR, file);
    if (fs.statSync(sourcePath).isDirectory()) {
      fs.cpSync(sourcePath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
  
  // Now move the pages from directory subfolder to root
  console.log(`Step 4: Moving ${TARGET_DIRECTORY} content to root...`);
  
  // Function to copy files, transforming paths if needed
  function copyToRoot(source, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(source);
    
    files.forEach(file => {
      const sourcePath = path.join(source, file);
      const destPath = path.join(dest, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        copyToRoot(sourcePath, destPath);
      } else {
        // For HTML files, we need to transform paths
        if (file.endsWith('.html')) {
          let content = fs.readFileSync(sourcePath, 'utf8');
          
          // Replace any references to /directory/ with /
          const regex = new RegExp(`\\/${TARGET_DIRECTORY}\\/`, 'g');
          content = content.replace(regex, '/');
          
          fs.writeFileSync(destPath, content);
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    });
  }
  
  // Copy all content from the directory subfolder to root
  copyToRoot(dirPath, OUTPUT_DIR);
  
  // Move the index.html to root
  const indexPath = path.join(dirPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Transform paths in the root index.html
    const regex = new RegExp(`\\/${TARGET_DIRECTORY}\\/`, 'g');
    indexContent = indexContent.replace(regex, '/');
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexContent);
  }
  
  console.log('Step 5: Creating specialized configuration files...');
  
  // Create _routes.json for proper handling
  const routesJson = {
    "version": 1,
    "include": ["/*"],
    "exclude": ["/api/*"],
    "routes": [
      {
        "src": "/_astro/*.js",
        "headers": {
          "Content-Type": "application/javascript"
        },
        "continue": true
      },
      {
        "src": "/_astro/*.css",
        "headers": {
          "Content-Type": "text/css"
        },
        "continue": true
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_routes.json'),
    JSON.stringify(routesJson, null, 2)
  );
  
  // Copy files from public directory (except multi-directory specific ones)
  console.log('Step 6: Copying public assets...');
  const PUBLIC_DIR = path.resolve('./public');
  
  if (fs.existsSync(PUBLIC_DIR)) {
    const skipFiles = ['_redirects', '_routes.json']; // Skip multi-directory files
    
    fs.readdirSync(PUBLIC_DIR).forEach(file => {
      if (skipFiles.includes(file)) return;
      
      const sourcePath = path.join(PUBLIC_DIR, file);
      const destPath = path.join(OUTPUT_DIR, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        fs.cpSync(sourcePath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    });
  }
  
  // Create a build info file
  const buildInfoContent = {
    directory: TARGET_DIRECTORY,
    buildTime: new Date().toISOString(),
    mode: 'single'
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'build-info.json'),
    JSON.stringify(buildInfoContent, null, 2)
  );
  
  // Clean up temp directory
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  
  console.log('✨ Single directory build completed successfully!');
  console.log(`Directory "${TARGET_DIRECTORY}" has been built to ${OUTPUT_DIR}`);
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}