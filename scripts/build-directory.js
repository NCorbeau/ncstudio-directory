/**
 * Build script for a single directory
 * Used by Cloudflare Pages projects to build a specific directory
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory to build from environment variable
const TARGET_DIRECTORY = process.env.CURRENT_DIRECTORY;

// Validation
if (!TARGET_DIRECTORY) {
  console.error('ERROR: TARGET_DIRECTORY environment variable is required');
  console.error('Please set TARGET_DIRECTORY to specify which directory to build');
  process.exit(1);
}

// Output directory - by default Cloudflare Pages expects output in 'dist'
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'dist';

console.log(`Building directory: ${TARGET_DIRECTORY}`);
console.log(`Output directory: ${OUTPUT_DIR}`);

// Execute the build
try {
  // Set the current directory environment variable for the Astro build
  process.env.CURRENT_DIRECTORY = TARGET_DIRECTORY;
  
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Run the Astro build
  // This will build just the specific directory and output directly to the dist folder
  // rather than to dist/[directory]
  execSync(`astro build --outDir ./${OUTPUT_DIR}`, { 
    stdio: 'inherit',
    env: {...process.env}
  });
  
  // Copy necessary static files from the public directory
  const PUBLIC_DIR = path.resolve('./public');
  if (fs.existsSync(PUBLIC_DIR)) {
    console.log('Copying static assets from public directory...');
    
    // Function to copy directory recursively
    const copyDir = (src, dest, skipFiles = []) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        // Skip certain files (like _redirects that are specific to the multi-directory setup)
        if (skipFiles.includes(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath, skipFiles);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    // Skip files that don't apply to individual directory deployments
    const skipFiles = ['_redirects', '_routes.json'];
    copyDir(PUBLIC_DIR, OUTPUT_DIR, skipFiles);
  }
  
  // Create a build info file
  const buildInfoContent = {
    directory: TARGET_DIRECTORY,
    buildTime: new Date().toISOString(),
    buildScript: 'build-directory.js'
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'build-info.json'),
    JSON.stringify(buildInfoContent, null, 2)
  );
  
  console.log('Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}