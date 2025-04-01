/**
 * Build script for Cloudflare Pages deployment
 * This script builds all directories and creates the necessary structure
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Directories
const BUILD_DIR = path.resolve('./dist');
const PUBLIC_DIR = path.resolve('./public');
const HEADERS_FILE = path.resolve('./_headers');
const REDIRECTS_FILE = path.resolve('./_redirects');

// Function to build all directories
async function buildAllDirectories() {
  console.log('Building all directories for Cloudflare Pages...');
  
  // Run the normal build-all script
  execSync('node scripts/build-all.js', { stdio: 'inherit' });
  
  // Copy _headers and _redirects to the dist folder
  if (fs.existsSync(HEADERS_FILE)) {
    fs.copyFileSync(HEADERS_FILE, path.join(BUILD_DIR, '_headers'));
    console.log('Copied _headers file to dist folder');
  }
  
  if (fs.existsSync(REDIRECTS_FILE)) {
    fs.copyFileSync(REDIRECTS_FILE, path.join(BUILD_DIR, '_redirects'));
    console.log('Copied _redirects file to dist folder');
  }
  
  // Create a directory selector page for the main domain
  createDirectorySelector();
  
  console.log('Cloudflare Pages build completed successfully!');
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

// Run the build process
buildAllDirectories().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});