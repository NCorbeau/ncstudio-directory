/**
 * Enhanced Build Script for Cloudflare Pages deployment
 * Supports selective builds based on directory changes
 * Includes sitemap and robots.txt generation for SEO
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { 
  loadDirectories, 
  getDirectoryIds, 
  getDirectoryThemeMapping, 
  getDomainDirectoryMapping,
  generateRedirectRules 
} from './directory-loader.js';
import { generateAllSitemaps } from './generate-sitemaps.js';
import { generateAllRobots } from './generate-robots.js';
import { cleanupNestedDirectories, fixDistDirectory } from './cleanup-build.js';

// Load environment variables
dotenv.config();

// Directories
const BUILD_DIR = path.resolve('./dist');
const PUBLIC_DIR = path.resolve('./public');
const FUNCTIONS_DIR = path.resolve('./functions');
const HEADERS_FILE = path.resolve('./public/_headers');
const REDIRECTS_FILE = path.resolve('./public/_redirects');

// Copy all public assets to a directory's build output
function copyPublicAssetsToDirectory(directoryId) {
  const publicDir = path.resolve('./public');
  const targetDir = path.resolve(`./dist/${directoryId}`);
  
  console.log(`Copying public assets from ${publicDir} to ${targetDir}...`);
  
  // Function to copy directory recursively
  const copyDir = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      // Skip _headers and _redirects as they're handled separately
      if (entry.name === '_headers' || entry.name === '_redirects') {
        continue;
      }
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  
  copyDir(publicDir, targetDir);
  console.log(`Copied public assets to ${directoryId}`);
}

// Get changed files from Git (if in CI environment)
function getChangedFiles() {
  try {
    if (process.env.CF_PAGES_BRANCH) {
      // Try different approaches to get changed files
      try {
        // Attempt to fetch more history if needed
        execSync('git fetch --unshallow || true', { stdio: 'ignore' });

        // For a full build, just return empty array which will trigger building all directories
        if (process.env.CF_PAGES_COMMIT_MESSAGE && 
            process.env.CF_PAGES_COMMIT_MESSAGE.includes('[full-build]')) {
          console.log('Full build requested via commit message');
          return [];
        }

        let changedFiles = [];

        // Try different git commands to get changed files
        try {
          // First attempt: compare with previous commit
          changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' })
            .split('\n')
            .filter(file => file.trim() !== '');
          
          console.log('Got changed files using HEAD~1');
        } catch (e) {
          try {
            // Second attempt: Get files changed in the latest commit
            changedFiles = execSync('git show --name-only --pretty="" HEAD', { encoding: 'utf8' })
              .split('\n')
              .filter(file => file.trim() !== '');
            
            console.log('Got changed files using git show HEAD');
          } catch (e2) {
            console.log('Could not determine changed files, will build all directories');
            return [];
          }
        }

        return changedFiles;
      } catch (error) {
        console.warn('Error getting detailed git info:', error);
        return [];
      }
    }
  } catch (error) {
    console.warn('Error in getChangedFiles:', error);
  }
  
  // Default to empty array if not in CI or error occurred
  console.log('No changed files information available, building all directories');
  return [];
}

// Determine which directories need to be built based on changed files
async function getDirectoriesToBuild(changedFiles) {
  // If no changed files available, build all
  if (!changedFiles || changedFiles.length === 0) {
    console.log('No changed files detected, building all directories');
    return 'all';
  }
  
  // Get theme to directory mapping
  const directories = await loadDirectories();
  const themeToDirectories = {};
  
  // Create mapping of themes to directories
  directories.forEach(dir => {
    const theme = dir.data.theme || 'default';
    if (!themeToDirectories[theme]) {
      themeToDirectories[theme] = [];
    }
    themeToDirectories[theme].push(dir.id);
  });
  
  // Initialize affected directories
  const affectedDirectories = new Set();
  
  // Map of file paths to themes that should be rebuilt
  const DEPENDENCIES = {
    'src/components/core/': ['all'],
    'src/layouts/': ['all'],
    'src/lib/': ['all'],
    'src/utils/': ['all'],
    'src/styles/global.css': ['all'],
    'public/styles/global.css': ['all'],
    'src/styles/themes/elegant.css': ['elegant'],
    'public/styles/themes/elegant.css': ['elegant'],
    'src/styles/themes/nature.css': ['nature'],
    'public/styles/themes/nature.css': ['nature'],
    'functions/': ['all'], // Changes to functions affect all directories
  };
  
  // Check each changed file
  changedFiles.forEach(file => {
    // Core file changes affect all directories
    if (file.startsWith('src/components/core/') || 
        file.startsWith('src/layouts/') ||
        file.startsWith('src/lib/') ||
        file.startsWith('src/utils/') ||
        file.startsWith('src/styles/global') ||
        file.startsWith('public/styles/global') ||
        file.startsWith('functions/')) {
      affectedDirectories.add('all');
      return;
    }

    // Check specific theme dependencies
    for (const theme of Object.keys(themeToDirectories)) {
      if (file.includes(`/${theme}.css`)) {
        // Add all directories with this theme
        themeToDirectories[theme].forEach(dirId => {
          affectedDirectories.add(dirId);
        });
      }
    }

    // Directory-specific content changes
    if (file.includes('/content/')) {
      // Extract directory from path (assumes content is organized by directory)
      const dirMatch = file.match(/\/content\/([^\/]+)/);
      if (dirMatch && dirMatch[1]) {
        affectedDirectories.add(dirMatch[1]);
      }
    }

    // Check for changes in directory-specific components or layouts
    if (file.includes('/components/themes/')) {
      const themeMatch = file.match(/\/themes\/([^\/]+)/);
      if (themeMatch && themeMatch[1]) {
        const theme = themeMatch[1];
        // Add all directories with this theme
        if (themeToDirectories[theme]) {
          themeToDirectories[theme].forEach(dirId => {
            affectedDirectories.add(dirId);
          });
        }
      }
    }
  });
  
  // If 'all' is in the set, build everything
  if (affectedDirectories.has('all')) {
    return 'all';
  }
  
  // Return array of affected directories
  return Array.from(affectedDirectories);
}

// Copy public files to the dist directory
function copyPublicFiles() {
  // Copy _headers and _redirects to the dist folder if they exist
  if (fs.existsSync(HEADERS_FILE)) {
    fs.copyFileSync(HEADERS_FILE, path.join(BUILD_DIR, '_headers'));
    console.log('Copied _headers file to dist folder');
  }

  // Don't copy static _redirects, we'll generate it dynamically
  // We'll handle this with generateRedirects() instead

  // Ensure functions directory is properly set up
  if (fs.existsSync(FUNCTIONS_DIR)) {
    // Create the functions directory in the output if it doesn't exist
    const outputFunctionsDir = path.join(BUILD_DIR, 'functions');
    if (!fs.existsSync(outputFunctionsDir)) {
      fs.mkdirSync(outputFunctionsDir, { recursive: true });
    }

    // Function to copy directory recursively
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    // Copy the functions
    copyDir(FUNCTIONS_DIR, outputFunctionsDir);
    console.log('Copied functions to dist folder');
  }
}

// Generate the dynamic domain-to-directory mapping for asset rewriting
async function generateDomainMappings() {
  try {
    // Get domain mapping
    const domainMapping = await getDomainDirectoryMapping();
    
    // Create the functions/domain-mapping.js file
    const mappingContent = `/**
 * Auto-generated domain-to-directory mapping
 * This file is generated during the build process
 */
export const __DOMAIN_DIRECTORY_MAPPING__ = ${JSON.stringify(domainMapping, null, 2)};
`;
    
    // Make sure functions directory exists
    const functionsDir = path.join(BUILD_DIR, 'functions');
    if (!fs.existsSync(functionsDir)) {
      fs.mkdirSync(functionsDir, { recursive: true });
    }
    
    // Write the mapping file
    fs.writeFileSync(path.join(functionsDir, 'domain-mapping.js'), mappingContent);
    
    console.log('Generated domain mapping for asset rewriting');
    
    return domainMapping;
  } catch (error) {
    console.error('Error generating domain mappings:', error);
    return {};
  }
}

// Generate dynamic redirects file
async function generateRedirects() {
  try {
    const redirectRules = await generateRedirectRules();
    fs.writeFileSync(path.join(BUILD_DIR, '_redirects'), redirectRules);
    console.log('Generated _redirects file from NocoDB data');
  } catch (error) {
    console.error('Error generating redirects:', error);
    // Copy the static file as fallback if it exists
    if (fs.existsSync(path.join(PUBLIC_DIR, '_redirects'))) {
      fs.copyFileSync(
        path.join(PUBLIC_DIR, '_redirects'), 
        path.join(BUILD_DIR, '_redirects')
      );
      console.log('Used static _redirects file as fallback');
    }
  }
}

// Create a directory selector page for the main domain
async function createDirectorySelector() {
  const selectorDir = path.join(BUILD_DIR, 'directory-selector');
  if (!fs.existsSync(selectorDir)) {
    fs.mkdirSync(selectorDir, { recursive: true });
  }

  // Get directory information from NocoDB
  let directories = [];
  try {
    const dirObjects = await loadDirectories();
    directories = dirObjects.map(dir => ({
      id: dir.id,
      name: dir.data.name,
      description: dir.data.description || `Directory for ${dir.id}`,
      domain: dir.data.domain,
      primaryColor: dir.data.primaryColor || '#3366cc'
    }));
  } catch (error) {
    console.error('Error fetching directories from NocoDB:', error);
    // Fallback to the dist folders if NocoDB fetch fails
    const distFolders = fs.readdirSync(BUILD_DIR)
      .filter(folder => {
        const folderPath = path.join(BUILD_DIR, folder);
        return fs.statSync(folderPath).isDirectory() && 
          folder !== 'directory-selector' &&
          folder !== 'functions' &&
          !folder.startsWith('.');
      });
    
    for (const folder of distFolders) {
      directories.push({
        id: folder,
        name: folder.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        description: `Directory for ${folder}`,
        domain: `${folder}.ncstudio.click`,
        primaryColor: '#3366cc'
      });
    }
  }

  // Create an index.html file with links to all directories
  const selectorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Directory Selector</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 {
      text-align: center;
      margin-bottom: 2rem;
    }
    .directory-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
    }
    .directory-card {
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .directory-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
    }
    .card-header {
      padding: 1.5rem;
      color: white;
    }
    .card-content {
      padding: 1.5rem;
    }
    .card-content h2 {
      margin-top: 0;
      margin-bottom: 0.5rem;
    }
    .card-content p {
      margin-bottom: 1.5rem;
      color: #666;
    }
    .card-links {
      display: flex;
      gap: 1rem;
    }
    .card-links a {
      display: inline-block;
      padding: 0.5rem 1rem;
      background-color: #f5f5f5;
      border-radius: 4px;
      text-decoration: none;
      color: #333;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .card-links a:hover {
      background-color: #e5e5e5;
    }
    .domain-link {
      font-weight: normal;
      color: #666;
      font-size: 0.9rem;
      display: block;
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <h1>Directory Selector</h1>
  <div class="directory-grid">
    ${directories.map(dir => `
      <div class="directory-card">
        <div class="card-header" style="background-color: ${dir.primaryColor}">
          <h2>${dir.name}</h2>
        </div>
        <div class="card-content">
          <p>${dir.description}</p>
          <div class="card-links">
            <a href="/${dir.id}/">View Directory</a>
            ${dir.domain ? `<a href="//${dir.domain}" target="_blank">Visit Website</a>` : ''}
          </div>
          ${dir.domain ? `<span class="domain-link">${dir.domain}</span>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(selectorDir, 'index.html'), selectorHtml);
  console.log('Created directory selector page');
}

// Function to build all directories
async function buildAllDirectories() {
  console.log('Building all directories for Cloudflare Pages...');
  
  // Run the normal build-all script
  execSync('node scripts/build-all.js', { stdio: 'inherit' });
  
  // After building all directories, fix the directory structure
  fixDistDirectory();
  
  // Now copy public assets to each directory
  const directories = await loadDirectories();
  for (const dir of directories) {
    copyPublicAssetsToDirectory(dir.id);
  }
  
  // Generate dynamic configuration files
  await generateDomainMappings();
  await generateRedirects();
  
  // Copy public files to build folder
  copyPublicFiles();
  
  // Create a directory selector page for the main domain
  await createDirectorySelector();
  
  // Generate sitemaps for SEO
  console.log('Generating sitemaps for SEO...');
  try {
    // Import the sitemap generator function and call it directly
    await generateAllSitemaps();
    console.log('Sitemaps generated successfully');
  } catch (error) {
    console.error('Error generating sitemaps:', error);
    // Don't fail the build for sitemap errors
  }
  
  // Generate robots.txt files
  console.log('Generating robots.txt files...');
  try {
    // Import the robots.txt generator function and call it directly
    await generateAllRobots();
    console.log('Robots.txt files generated successfully');
  } catch (error) {
    console.error('Error generating robots.txt files:', error);
    // Don't fail the build for robots.txt errors
  }
  
  console.log('Cloudflare Pages build completed successfully!');
}

// Also update the same approach in buildSelectiveDirectories function
async function buildSelectiveDirectories(directories) {
  console.log(`Building selective directories: ${directories.join(', ')}...`);

  for (const dir of directories) {
    console.log(`Building directory: ${dir}`);

    // Set environment variable for the build
    process.env.CURRENT_DIRECTORY = dir;
    
    // Run the build for this directory
    try {
      execSync(`node scripts/selective-build.js ${dir}`, { 
        stdio: 'inherit',
        env: {...process.env}
      });
      
      // Clean up nested directories
      await cleanupNestedDirectories(dir);

      // Add this line to copy public assets after each directory build
      copyPublicAssetsToDirectory(dir);
    } catch (error) {
      console.error(`Error building directory ${dir}:`, error);
    }
  }

  // Generate dynamic configuration files
  await generateDomainMappings();
  await generateRedirects();

  // Copy public files to build folder
  copyPublicFiles();
  
  // Create a directory selector page for the main domain
  await createDirectorySelector();

  // Generate sitemaps for SEO
  console.log('Generating sitemaps for SEO...');
  try {
    // Import the sitemap generator function and call it directly
    await generateAllSitemaps();
    console.log('Sitemaps generated successfully');
  } catch (error) {
    console.error('Error generating sitemaps:', error);
    // Don't fail the build for sitemap errors
  }
  
  // Generate robots.txt files
  console.log('Generating robots.txt files...');
  try {
    // Import the robots.txt generator function and call it directly
    await generateAllRobots();
    console.log('Robots.txt files generated successfully');
  } catch (error) {
    console.error('Error generating robots.txt files:', error);
    // Don't fail the build for robots.txt errors
  }

  console.log('Selective build completed successfully!');
}

// Main build function
async function runBuild() {
  // Create build directory if it doesn't exist
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  // Check if this is the first build
  const isFirstBuild = process.env.CF_PAGES_BRANCH && 
                       (!fs.existsSync(path.join(BUILD_DIR, 'first-build-completed')));

  if (isFirstBuild) {
    console.log('🚀 First deployment detected - performing full build of all directories...');
    await buildAllDirectories();
    
    // Create a marker file to indicate first build is done
    fs.writeFileSync(path.join(BUILD_DIR, 'first-build-completed'), 'Build completed at: ' + new Date().toISOString());

    console.log('First build completed successfully!');
    process.exit(0);
    return;
  }

  // Standard build process for subsequent builds
  const changedFiles = getChangedFiles();
  console.log('Changed files:', changedFiles);
  
  // Determine which directories to build
  const directoriesToBuild = await getDirectoriesToBuild(changedFiles);

  // Build the appropriate directories
  if (directoriesToBuild === 'all') {
    await buildAllDirectories();
  } else {
    await buildSelectiveDirectories(directoriesToBuild);
  }

  console.log('Build completed successfully!');
  process.exit(0);
}

// Run the build process
runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});