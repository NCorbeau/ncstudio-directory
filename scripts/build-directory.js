// scripts/build-directory.js
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
  process.exit(1);
}

// Output directory - should be root of dist, not a subdirectory
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'dist';

console.log(`Building directory: ${TARGET_DIRECTORY} directly to root output`);

try {
  // Set environment variables for the Astro build
  process.env.CURRENT_DIRECTORY = TARGET_DIRECTORY;
  // CRITICAL: Set base to empty string for single directory deployment
  process.env.BASE_PATH = '';
  
  // Run the Astro build with empty base and output directly to dist
  execSync(`astro build --outDir ./${OUTPUT_DIR} --base ""`, { 
    stdio: 'inherit',
    env: {...process.env}
  });
  
  // Copy necessary static files
  const PUBLIC_DIR = path.resolve('./public');
  if (fs.existsSync(PUBLIC_DIR)) {
    console.log('Copying static assets from public directory...');
    
    // Copy directory recursively (skipping multi-directory files)
    const copyDir = (src, dest, skipFiles = []) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        // Skip files that are for multi-directory setup
        if (skipFiles.includes(entry.name)) continue;
        
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath, skipFiles);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    // Files that should be skipped in single directory mode
    const skipFiles = ['_redirects', '_routes.json'];
    copyDir(PUBLIC_DIR, OUTPUT_DIR, skipFiles);
  }
  
  // Create simplified _routes.json for the single directory
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
  
  // Create a build info file
  const buildInfoContent = {
    directory: TARGET_DIRECTORY,
    buildTime: new Date().toISOString(),
    mode: 'single-directory'
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'build-info.json'),
    JSON.stringify(buildInfoContent, null, 2)
  );
  
  console.log('Single directory build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}