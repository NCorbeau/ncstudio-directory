// scripts/dev-directory.js
// This script runs the development server for a specific directory

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Try to load local env file if it exists
const localEnvPath = join(process.cwd(), '.env.local');
if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

// Get the directory to use for development
function getDirectoryToUse() {
  // Priority 1: Command line argument
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args[0];
  }
  
  // Priority 2: Existing CURRENT_DIRECTORY from environment
  if (process.env.CURRENT_DIRECTORY) {
    return process.env.CURRENT_DIRECTORY;
  }
  
  // Priority 3: First directory from config if available
  try {
    // Try to read available directories
    const configPath = join(process.cwd(), 'src', 'config', 'directories.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      if (config.directories && config.directories.length > 0) {
        return config.directories[0].id;
      }
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  
  // Default fallback
  return 'dog-parks-warsaw';
}

// Get the directory to use
const directoryId = getDirectoryToUse();

console.log(`\n🚀 Starting development server in multi-directory mode`);
console.log(`📂 Primary directory: ${directoryId}`);
console.log(`🔄 All directories will be accessible\n`);

// Clear terminal
process.stdout.write('\x1Bc');

// Set environment variables for the dev process
const env = {
  ...process.env,
  CURRENT_DIRECTORY: directoryId,
  NODE_ENV: 'development',
  // Important: Make sure we're using the standard dev server without custom base paths
  BASE_URL: '',
  // Indicate we're in multi-directory mode
  MULTI_DIRECTORY_MODE: 'true'
};

// Start the Astro dev server
const devProcess = spawn('astro', ['dev'], {
  env,
  stdio: 'inherit',
  shell: true
});

devProcess.on('error', (error) => {
  console.error('Failed to start development server:', error);
});

devProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Development server exited with code ${code}`);
  }
});