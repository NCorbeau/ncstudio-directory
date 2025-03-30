import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Directory to save builds
const BUILD_DIR = path.resolve('./dist');

// Create build directory if it doesn't exist
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR);
}

// Function to build a specific directory
async function buildDirectory(directoryId) {
  console.log(`Building directory: ${directoryId}...`);
  
  // Set the current directory as an environment variable for the build
  process.env.CURRENT_DIRECTORY = directoryId;
  
  // Run Astro build with specific output
  execSync(`astro build --outDir ./dist/${directoryId}`, { 
    stdio: 'inherit',
    env: {...process.env}
  });
  
  console.log(`Build complete for ${directoryId}`);
  
  // Get the domain from the directory config
  const configPath = path.resolve(`./src/content/directories/${directoryId}.yml`);
  const directoryConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));
  
  // Create a CNAME file for GitHub Pages (optional)
  if (directoryConfig.domain) {
    fs.writeFileSync(
      path.resolve(`./dist/${directoryId}/CNAME`),
      directoryConfig.domain
    );
  }
  
  return directoryConfig.domain;
}

// Get all directory IDs from content/directories folder
const directoriesPath = path.resolve('./src/content/directories');
const directoryFiles = fs.readdirSync(directoriesPath)
  .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

const directoryIds = directoryFiles.map(file => path.basename(file, path.extname(file)));

// Build each directory
async function buildAll() {
  const results = [];
  
  for (const id of directoryIds) {
    const domain = await buildDirectory(id);
    results.push({ id, domain });
  }
  
  // Output build results
  console.log('\n=== Build Results ===');
  console.table(results);
  
  // Create an index file in the dist directory that lists all built sites
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Directory Sites</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { border-bottom: 1px solid #eee; padding-bottom: 1rem; }
    ul { list-style-type: none; padding: 0; }
    li { margin: 1rem 0; padding: 1rem; border: 1px solid #eee; border-radius: 4px; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Generated Directory Sites</h1>
  <ul>
    ${results.map(({ id, domain }) => `
      <li>
        <strong>${id}</strong><br>
        Domain: ${domain || 'Not specified'}<br>
        <a href="./${id}/">View Local Build</a>
      </li>
    `).join('')}
  </ul>
</body>
</html>
  `;
  
  fs.writeFileSync(path.resolve(`${BUILD_DIR}/index.html`), indexHtml);
  console.log('\nBuild index created at dist/index.html');
}

buildAll().catch(console.error);