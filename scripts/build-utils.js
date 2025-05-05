// scripts/build-utils.js
import fs from 'fs';
import path from 'path';

/**
 * Copy all public assets to a directory's build output
 * This ensures CSS files and other static assets are available in each directory's build
 * 
 * @param {string} directoryId - Directory ID to copy assets to
 * @param {Object} options - Optional configuration
 * @param {string} options.publicDir - Public directory path (default: './public')
 * @param {string} options.distDir - Distribution directory path (default: './dist')
 * @param {Array} options.skipFiles - Files to skip (default: ['_headers', '_redirects'])
 * @param {boolean} options.verbose - Whether to log detailed information (default: true)
 */
export function copyPublicAssetsToDirectory(directoryId, options = {}) {
  const {
    publicDir = path.resolve('./public'),
    distDir = path.resolve('./dist'),
    skipFiles = ['_headers', '_redirects'],
    verbose = true
  } = options;
  
  const targetDir = path.join(distDir, directoryId);
  
  if (verbose) {
    console.log(`Copying public assets from ${publicDir} to ${targetDir}...`);
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
      
      // Skip specified files
      if (skipFiles.includes(entry.name)) {
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
  
  if (verbose) {
    console.log(`Copied public assets to ${directoryId}`);
  }
  
  return targetDir;
}

/**
 * Create directory if it doesn't exist
 * 
 * @param {string} dirPath - Directory path to ensure exists
 * @returns {boolean} - Whether the directory was created
 */
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

/**
 * Copy a single file from source to destination
 * 
 * @param {string} sourcePath - Source file path
 * @param {string} destPath - Destination file path
 * @param {boolean} createDir - Whether to create destination directory if it doesn't exist
 * @returns {boolean} - Whether the file was copied successfully
 */
export function copyFile(sourcePath, destPath, createDir = true) {
  try {
    if (createDir) {
      const destDir = path.dirname(destPath);
      ensureDirectoryExists(destDir);
    }
    
    fs.copyFileSync(sourcePath, destPath);
    return true;
  } catch (error) {
    console.error(`Error copying file from ${sourcePath} to ${destPath}:`, error);
    return false;
  }
}

/**
 * Copy special files (_headers, _redirects, etc.) to the distribution root
 * 
 * @param {string} publicDir - Public directory path
 * @param {string} distDir - Distribution directory path
 * @param {Array} files - Files to copy
 */
export function copySpecialFiles(publicDir = './public', distDir = './dist', files = ['_headers', '_redirects']) {
  publicDir = path.resolve(publicDir);
  distDir = path.resolve(distDir);
  
  ensureDirectoryExists(distDir);
  
  for (const file of files) {
    const sourcePath = path.join(publicDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(sourcePath)) {
      copyFile(sourcePath, destPath);
      console.log(`Copied ${file} to ${distDir}`);
    }
  }
}

/**
 * Create an index file listing all built directories
 * 
 * @param {Array} results - Array of build results with directoryId and success properties
 * @param {string} distDir - Distribution directory path
 */
export function createIndexFile(results, distDir = './dist') {
  distDir = path.resolve(distDir);
  
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Directory Sites</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { border-bottom: 1px solid #eee; padding-bottom: 1rem; }
    ul { list-style-type: none; padding: 0; }
    li { margin: 1rem 0; padding: 1rem; border: 1px solid #eee; border-radius: 4px; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .success { color: green; }
    .failure { color: red; }
  </style>
</head>
<body>
  <h1>Generated Directory Sites</h1>
  <p>Last build: ${new Date().toLocaleString()}</p>
  <ul>
    ${results.map(({ directoryId, success }) => `
      <li>
        <strong>${directoryId}</strong>
        <span class="${success ? 'success' : 'failure'}">[${success ? 'Success' : 'Failed'}]</span><br>
        ${success ? `<a href="./${directoryId}/">View Local Build</a>` : 'Build failed'}
      </li>
    `).join('')}
  </ul>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);
  console.log('Build index created at dist/index.html');
}

/**
 * Create CSS file with basic rules if global.css doesn't exist
 * @param {string} distDir - Distribution directory path 
 */
export function createFallbackCssFiles(distDir = './dist') {
  const globalCssContent = `
/* Fallback global CSS */
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

h1, h2, h3 {
  margin-top: 0;
}

a {
  color: #3366cc;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
`;

  // Create basic theme CSS files
  const themeCssContent = (color, name) => `
/* Fallback ${name} theme CSS */
.theme-${name} {
  --primaryColor: ${color};
  --secondaryColor: #ff9900;
}

.theme-${name} .site-header {
  background-color: ${color};
  color: white;
  padding: 1rem 0;
}

.theme-${name} .site-name {
  font-size: 1.5rem;
  font-weight: bold;
}

.theme-${name} .main-nav a {
  color: white;
  text-decoration: none;
}
`;

  const rootStylesDir = path.join(distDir, 'styles');
  ensureDirectoryExists(rootStylesDir);
  
  const rootThemesDir = path.join(rootStylesDir, 'themes');
  ensureDirectoryExists(rootThemesDir);
  
  // Write global.css
  const globalCssPath = path.join(rootStylesDir, 'global.css');
  if (!fs.existsSync(globalCssPath)) {
    fs.writeFileSync(globalCssPath, globalCssContent);
    console.log('Created fallback global.css');
  }
  
  // Write theme CSS files
  const themes = [
    { name: 'default', color: '#3366cc' },
    { name: 'elegant', color: '#9c7c38' },
    { name: 'modern', color: '#0070f3' },
    { name: 'nature', color: '#4b7f52' }
  ];
  
  themes.forEach(theme => {
    const themeCssPath = path.join(rootThemesDir, `${theme.name}.css`);
    if (!fs.existsSync(themeCssPath)) {
      fs.writeFileSync(themeCssPath, themeCssContent(theme.color, theme.name));
      console.log(`Created fallback ${theme.name}.css`);
    }
  });
}

/**
 * Create a file with specified content
 * @param {string} filePath - Path where to create the file
 * @param {string} content - File content
 * @param {boolean} createDir - Whether to create parent directories if they don't exist
 * @returns {boolean} - Whether the file was created successfully
 */
export function createFile(filePath, content, createDir = true) {
  try {
    if (createDir) {
      const dir = path.dirname(filePath);
      ensureDirectoryExists(dir);
    }
    
    fs.writeFileSync(filePath, content);
    return true;
  } catch (error) {
    console.error(`Error creating file ${filePath}:`, error);
    return false;
  }
}

/**
 * Read and parse JSON file with error handling
 * @param {string} filePath - Path to JSON file
 * @param {any} defaultValue - Default value if file doesn't exist or is invalid
 * @returns {any} - Parsed JSON or default value
 */
export function readJsonFile(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return defaultValue;
  }
}

/**
 * Write object to JSON file
 * @param {string} filePath - Path to JSON file
 * @param {any} data - Data to write
 * @param {boolean} pretty - Whether to pretty-print the JSON
 * @param {boolean} createDir - Whether to create parent directories if they don't exist
 * @returns {boolean} - Whether the file was written successfully
 */
export function writeJsonFile(filePath, data, pretty = true, createDir = true) {
  try {
    if (createDir) {
      const dir = path.dirname(filePath);
      ensureDirectoryExists(dir);
    }
    
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(filePath, content);
    return true;
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    return false;
  }
}