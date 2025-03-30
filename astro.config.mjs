import { defineConfig } from 'astro/config';

// Get the current directory from environment variable (set by build script)
const currentDirectory = process.env.CURRENT_DIRECTORY || 'default';

// Import the directory configuration
import fs from 'fs';
import yaml from 'js-yaml';
let directoryConfig = {};

try {
  const configPath = `./src/content/directories/${currentDirectory}.yml`;
  directoryConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn(`No configuration found for directory: ${currentDirectory}, using defaults`);
}

// https://astro.build/config
export default defineConfig({
  site: directoryConfig.domain || 'http://localhost:3000',
  base: '/',
  outDir: `./dist/${currentDirectory}`,
  build: {
    // Only include pages for the current directory
    excludePages: ['**/*']
      .concat([`src/pages/[directory]/**`]) // Exclude all dynamic directory pages
      .concat([`src/pages/${currentDirectory}/**`]), // Include only current directory
  },
  vite: {
    define: {
      'import.meta.env.CURRENT_DIRECTORY': JSON.stringify(currentDirectory),
      'import.meta.env.DIRECTORY_CONFIG': JSON.stringify(directoryConfig),
    },
  },
});