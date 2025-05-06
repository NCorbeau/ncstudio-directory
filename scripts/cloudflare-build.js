/**
 * Simplified Build Script for Cloudflare Pages deployment
 * Builds all directories without trying to selectively determine what needs to be built
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { 
  loadDirectories, 
  getDomainDirectoryMapping,
  generateRedirectRules 
} from './directory-loader.js';
import { generateAllSitemaps } from './generate-sitemaps.js';
import { generateAllRobots } from './generate-robots.js';
import { fixDistDirectory } from './cleanup-build.js';
import {
  copyPublicAssetsToDirectory,
  ensureDirectoryExists,
  copySpecialFiles,
  createIndexFile,
  copyFile
} from './build-utils.js';

// Load environment variables
dotenv.config();

// Directories
const BUILD_DIR = path.resolve('./dist');
const PUBLIC_DIR = path.resolve('./public');
const FUNCTIONS_DIR = path.resolve('./functions');

// Ensure the build directory exists
ensureDirectoryExists(BUILD_DIR);

// Copy public files to the dist directory
function copyPublicFiles() {
  // Copy _headers file to the dist folder if it exists
  copySpecialFiles(PUBLIC_DIR, BUILD_DIR, ['_headers']);

  // Ensure functions directory is properly set up
  if (fs.existsSync(FUNCTIONS_DIR)) {
    // Copy the entire functions directory to the output
    const outputFunctionsDir = path.join(BUILD_DIR, 'functions');
    ensureDirectoryExists(outputFunctionsDir);
    
    // Function to copy directory recursively - we'll use our utility function
    copyPublicAssetsToDirectory('functions', {
      publicDir: FUNCTIONS_DIR,
      distDir: BUILD_DIR,
      skipFiles: [],
      verbose: true
    });
    
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
    ensureDirectoryExists(functionsDir);
    
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
    const staticRedirectsPath = path.join(PUBLIC_DIR, '_redirects');
    if (fs.existsSync(staticRedirectsPath)) {
      copyFile(staticRedirectsPath, path.join(BUILD_DIR, '_redirects'));
      console.log('Used static _redirects file as fallback');
    }
  }
}

// Create a directory selector page for the main domain
async function createDirectorySelector() {
  const selectorDir = path.join(BUILD_DIR, 'directory-selector');
  ensureDirectoryExists(selectorDir);

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
  
  // Now copy public assets to each directory using our centralized utility
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
    await generateAllSitemaps();
    console.log('Sitemaps generated successfully');
  } catch (error) {
    console.error('Error generating sitemaps:', error);
    // Don't fail the build for sitemap errors
  }
  
  // Generate robots.txt files
  console.log('Generating robots.txt files...');
  try {
    await generateAllRobots();
    console.log('Robots.txt files generated successfully');
  } catch (error) {
    console.error('Error generating robots.txt files:', error);
    // Don't fail the build for robots.txt errors
  }
  
  console.log('Cloudflare Pages build completed successfully!');
}

// Main build function - simplified to always build all directories
async function runBuild() {
  console.log('🚀 Starting Cloudflare Pages build...');
  
  // Create build directory if it doesn't exist
  ensureDirectoryExists(BUILD_DIR);

  // Always build all directories - no selective builds
  await buildAllDirectories();

  console.log('Build completed successfully!');
  process.exit(0);
}

// Run the build process
runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});