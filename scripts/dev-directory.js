// scripts/dev-directory.js
// This script runs the development server for a specific directory

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env and .env.local if they exist
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

// Get the directory to run from command line args
const directoryToBuild = process.argv[2];

if (!directoryToBuild) {
  console.error('Please specify a directory ID. Example: npm run dev:directory french-desserts');
  process.exit(1);
}

// Check if we're using local API
const useLocalApi = process.env.PUBLIC_USE_LOCAL_API === 'true' || process.env.USE_LOCAL_API === 'true';
const apiBaseUrl = process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '';

console.log(`Starting dev server for directory: ${directoryToBuild}`);
if (useLocalApi) {
  console.log('✅ Using LOCAL API handlers for development');
} else if (apiBaseUrl) {
  console.log(`✅ Using REMOTE API at: ${apiBaseUrl}`);
} else {
  console.warn('⚠️ No API_BASE_URL set - API calls may fail. Set API_BASE_URL in .env.local');
}

// Set environment variables for development
process.env.CURRENT_DIRECTORY = directoryToBuild;
process.env.NODE_ENV = 'development';

// Ensure the .env.local file exists with the current directory and API settings
try {
  // Read existing .env.local content if it exists
  let existingContent = '';
  if (fs.existsSync('.env.local')) {
    existingContent = fs.readFileSync('.env.local', 'utf8');
  }

  // Parse existing content into key-value pairs
  const envVars = {};
  existingContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    }
  });

  // Update/add our variables
  envVars['CURRENT_DIRECTORY'] = directoryToBuild;
  
  // Don't override API settings if they already exist
  if (!('PUBLIC_USE_LOCAL_API' in envVars)) {
    envVars['PUBLIC_USE_LOCAL_API'] = useLocalApi ? 'true' : 'false';
  }
  
  if (!('PUBLIC_API_BASE_URL' in envVars) && apiBaseUrl) {
    envVars['PUBLIC_API_BASE_URL'] = apiBaseUrl;
  }

  // Convert back to string
  const newContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Write updated .env.local
  const envContent = `# Auto-generated by dev-directory.js
${newContent}
`;
  fs.writeFileSync('.env.local', envContent);
  console.log(`Updated .env.local with development settings`);
} catch (error) {
  console.warn('Could not write .env.local file:', error);
}

// Run Astro dev with the current directory set
try {
  execSync('astro dev', { 
    stdio: 'inherit',
    env: {...process.env}
  });
} catch (error) {
  console.error('Error running development server:', error);
  process.exit(1);
}