/**
 * Optimized Single Directory Build Script
 * Only fetches and builds content for the target directory
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

console.log(`🚀 Building ONLY directory: ${TARGET_DIRECTORY} directly to root output`);

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
    ASTRO_OUT_DIR: TEMP_DIR, // Build to temp directory first
    BASE_PATH: ''
  };
  
  console.log('Step 1: Building with Astro to temporary directory...');
  
  // Run the Astro build to temp directory
  execSync(`astro build --outDir "${TEMP_DIR}" --base ""`, { 
    stdio: 'inherit',
    env: buildEnv
  });
  
  console.log('Step 2: Moving files to correct locations...');
  
  // Copy all shared files and directories first
  // (_astro, favicon.svg, styles, etc.)
  fs.readdirSync(TEMP_DIR).forEach(item => {
    const itemPath = path.join(TEMP_DIR, item);
    
    // Skip the target directory - we'll handle that separately
    if (item === TARGET_DIRECTORY) return;
    
    // Copy everything else
    if (fs.statSync(itemPath).isDirectory()) {
      fs.cpSync(itemPath, path.join(OUTPUT_DIR, item), { recursive: true });
    } else {
      fs.copyFileSync(itemPath, path.join(OUTPUT_DIR, item));
    }
  });
  
  // Now handle the directory content - move it to the root level
  console.log(`Step 3: Moving content from ${TARGET_DIRECTORY}/ to root...`);
  
  const directoryPath = path.join(TEMP_DIR, TARGET_DIRECTORY);
  
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory folder ${directoryPath} not found in build output!`);
  }
  
  // First, copy the root index.html file to the root directory
  const sourceIndexPath = path.join(directoryPath, 'index.html');
  if (fs.existsSync(sourceIndexPath)) {
    let indexContent = fs.readFileSync(sourceIndexPath, 'utf8');
    
    // Replace any directory paths in the HTML content
    indexContent = indexContent.replace(new RegExp(`/${TARGET_DIRECTORY}/`, 'g'), '/');
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexContent);
    console.log('Root index.html created from directory index');
  }
  
  // Function to copy directory content with path fixing
  const copyDirectoryContent = (source, destination) => {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    fs.readdirSync(source).forEach(item => {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      
      // Skip root index.html since we already handled it
      if (sourcePath === sourceIndexPath) return;
      
      if (fs.statSync(sourcePath).isDirectory()) {
        copyDirectoryContent(sourcePath, destPath);
      } else {
        if (item.endsWith('.html')) {
          // Fix HTML paths
          let content = fs.readFileSync(sourcePath, 'utf8');
          content = content.replace(new RegExp(`/${TARGET_DIRECTORY}/`, 'g'), '/');
          fs.writeFileSync(destPath, content);
        } else {
          // Copy as-is for non-HTML files
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    });
  };
  
  // Copy all subdirectories and files from the directory folder
  fs.readdirSync(directoryPath).forEach(item => {
    const sourcePath = path.join(directoryPath, item);
    
    // Skip the root index.html since we already handled it
    if (item === 'index.html') return;
    
    // Copy subdirectories directly to root
    if (fs.statSync(sourcePath).isDirectory()) {
      const destPath = path.join(OUTPUT_DIR, item);
      copyDirectoryContent(sourcePath, destPath);
    } else {
      // For files, copy to root with path fixing if needed
      const destPath = path.join(OUTPUT_DIR, item);
      
      if (item.endsWith('.html')) {
        let content = fs.readFileSync(sourcePath, 'utf8');
        content = content.replace(new RegExp(`/${TARGET_DIRECTORY}/`, 'g'), '/');
        fs.writeFileSync(destPath, content);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  });
  
  console.log('Step 4: Creating specialized configuration files...');
  
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
  console.log('Step 5: Copying public assets...');
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
  
  // List the root directory to check structure
  console.log('\nRoot directory contains:');
  const rootContents = fs.readdirSync(OUTPUT_DIR);
  console.log(rootContents.join(', '));
  if (rootContents.includes('index.html')) {
    console.log('✅ Root index.html is present');
  } else {
    console.warn('⚠️ Root index.html not found!');
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}