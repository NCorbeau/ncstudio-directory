/**
 * Enhanced Build Script for Cloudflare Pages deployment
 * Supports selective builds based on directory changes
 * Includes sitemap and robots.txt generation for SEO
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Directories
const BUILD_DIR = path.resolve('./dist');
const PUBLIC_DIR = path.resolve('./public');
const FUNCTIONS_DIR = path.resolve('./functions');
const HEADERS_FILE = path.resolve('./public/_headers');
const REDIRECTS_FILE = path.resolve('./public/_redirects');

// Get changed files from Git (if in CI environment)
function getChangedFiles() {
  try {
    if (process.env.CF_PAGES_BRANCH) {
      // Get base branch to compare against
      const baseBranch = process.env.CF_PAGES_BRANCH === 'main' ? 
        'origin/main~1' : 'origin/main';
      console.log(`Base branch for comparison: ${baseBranch}`);
      
      // Get changed files between latest commit and base branch
      console.log('git diff --name-only', baseBranch, 'HEAD');
      const output = execSync(`git diff --name-only ${baseBranch} HEAD`, 
        { encoding: 'utf8' });
      
      return output.split('\n').filter(file => file.trim() !== '');
    }
  } catch (error) {
    console.warn('Error getting changed files:', error);
  }
  
  // Default to empty array if not in CI or error occurred
  return [];
}

// Determine which directories need to be built based on changed files
function getDirectoriesToBuild(changedFiles) {
  // If no changed files available, build all
  if (!changedFiles || changedFiles.length === 0) {
    console.log('No changed files detected, building all directories');
    return 'all';
  }
  
  // Initialize affected directories
  const affectedDirectories = new Set();
  
  // Map of file paths to directories that should be rebuilt
  const DEPENDENCIES = {
    'src/components/core/': ['all'],
    'src/layouts/': ['all'],
    'src/lib/': ['all'],
    'src/utils/': ['all'],
    'src/styles/global.css': ['all'],
    'public/styles/global.css': ['all'],
    'src/styles/themes/elegant.css': ['french-desserts'],
    'public/styles/themes/elegant.css': ['french-desserts'],
    'src/styles/themes/nature.css': ['dog-parks-warsaw'],
    'public/styles/themes/nature.css': ['dog-parks-warsaw'],
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
    if (file.includes('elegant.css')) {
      affectedDirectories.add('french-desserts');
    }
    
    if (file.includes('nature.css')) {
      affectedDirectories.add('dog-parks-warsaw');
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
        // Map theme name to directory
        const themeToDir = {
          'elegant': 'french-desserts',
          'nature': 'dog-parks-warsaw',
          'modern': 'modern-directory',
          'default': 'default'
        };
        
        if (themeToDir[themeMatch[1]]) {
          affectedDirectories.add(themeToDir[themeMatch[1]]);
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

// Function to build all directories
async function buildAllDirectories() {
  console.log('Building all directories for Cloudflare Pages...');
  
  // Run the normal build-all script
  execSync('node scripts/build-all.js', { stdio: 'inherit' });
  
  // Copy public files to build folder
  copyPublicFiles();
  
  // Create a directory selector page for the main domain
  createDirectorySelector();
  
  // Generate sitemaps for SEO
  console.log('Generating sitemaps for SEO...');
  try {
    execSync('node scripts/generate-sitemaps.js', { stdio: 'inherit' });
    console.log('Sitemaps generated successfully');
  } catch (error) {
    console.error('Error generating sitemaps:', error);
    // Don't fail the build for sitemap errors
  }
  
  // Generate robots.txt files
  console.log('Generating robots.txt files...');
  try {
    execSync('node scripts/generate-robots.js', { stdio: 'inherit' });
    console.log('Robots.txt files generated successfully');
  } catch (error) {
    console.error('Error generating robots.txt files:', error);
    // Don't fail the build for robots.txt errors
  }
  
  console.log('Cloudflare Pages build completed successfully!');
}

// Function to build selective directories
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
    } catch (error) {
      console.error(`Error building directory ${dir}:`, error);
    }
  }
  
  // Copy public files to build folder
  copyPublicFiles();
  
  // Create a directory selector page for the main domain
  createDirectorySelector();
  
  // Generate sitemaps for SEO
  console.log('Generating sitemaps for SEO...');
  try {
    execSync('node scripts/generate-sitemaps.js', { stdio: 'inherit' });
    console.log('Sitemaps generated successfully');
  } catch (error) {
    console.error('Error generating sitemaps:', error);
    // Don't fail the build for sitemap errors
  }
  
  // Generate robots.txt files
  console.log('Generating robots.txt files...');
  try {
    execSync('node scripts/generate-robots.js', { stdio: 'inherit' });
    console.log('Robots.txt files generated successfully');
  } catch (error) {
    console.error('Error generating robots.txt files:', error);
    // Don't fail the build for robots.txt errors
  }
  
  console.log('Selective build completed successfully!');
}

// Copy public files to the dist directory
function copyPublicFiles() {
  // Copy _headers and _redirects to the dist folder if they exist
  if (fs.existsSync(HEADERS_FILE)) {
    fs.copyFileSync(HEADERS_FILE, path.join(BUILD_DIR, '_headers'));
    console.log('Copied _headers file to dist folder');
  }
  
  if (fs.existsSync(REDIRECTS_FILE)) {
    fs.copyFileSync(REDIRECTS_FILE, path.join(BUILD_DIR, '_redirects'));
    console.log('Copied _redirects file to dist folder');
  }
  
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

// Create a directory selector page for the main domain
function createDirectorySelector() {
  const selectorDir = path.join(BUILD_DIR, 'directory-selector');
  if (!fs.existsSync(selectorDir)) {
    fs.mkdirSync(selectorDir, { recursive: true });
  }
  
  // Get all directory info
  const directories = [];
  const directoriesPath = path.resolve('./src/content/directories');
  
  if (fs.existsSync(directoriesPath)) {
    const dirFiles = fs.readdirSync(directoriesPath)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
    
    for (const file of dirFiles) {
      try {
        const filePath = path.join(directoriesPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(content);
        const directoryId = path.basename(file, path.extname(file));
        
        directories.push({
          id: directoryId,
          name: data.name,
          description: data.description,
          domain: data.domain,
          primaryColor: data.primaryColor || '#3366cc'
        });
      } catch (error) {
        console.error(`Error processing directory file ${file}:`, error);
      }
    }
  } else {
    // Fallback to the dist folders if no configuration files are found
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
        domain: `${folder}.example.com`,
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

// Main build function
async function runBuild() {
  // Create build directory if it doesn't exist
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }
  
  // Get changed files
  const changedFiles = getChangedFiles();
  console.log('Changed files:', changedFiles);
  
  // Determine which directories to build
  const directoriesToBuild = getDirectoriesToBuild(changedFiles);
  
  // Build the appropriate directories
  if (directoriesToBuild === 'all') {
    await buildAllDirectories();
  } else {
    await buildSelectiveDirectories(directoriesToBuild);
  }
}

// Run the build process
runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});