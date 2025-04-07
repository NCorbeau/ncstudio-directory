/**
 * Enhanced script to fix CSS file issues
 * - Creates a separate styles directory at the root level
 * - Ensures CSS files have correct MIME types
 * - Creates a proper output structure for Cloudflare Pages
 */

import fs from 'fs';
import path from 'path';

// Directories
const BUILD_DIR = path.resolve('./dist');
const PUBLIC_DIR = path.resolve('./public');

// Make sure the global styles directory exists at the root level
function ensureRootStylesDirectory() {
  console.log('Setting up root level styles directory...');
  
  // Create the root styles directory
  const rootStylesDir = path.join(BUILD_DIR, 'styles');
  if (!fs.existsSync(rootStylesDir)) {
    fs.mkdirSync(rootStylesDir, { recursive: true });
  }
  
  // Create the themes directory
  const rootThemesDir = path.join(rootStylesDir, 'themes');
  if (!fs.existsSync(rootThemesDir)) {
    fs.mkdirSync(rootThemesDir, { recursive: true });
  }
  
  // Copy global.css to the root styles directory
  const sourceGlobalCss = path.join(PUBLIC_DIR, 'styles', 'global.css');
  const destGlobalCss = path.join(rootStylesDir, 'global.css');
  
  if (fs.existsSync(sourceGlobalCss)) {
    fs.copyFileSync(sourceGlobalCss, destGlobalCss);
    console.log('✓ Copied global.css to root styles directory');
  } else {
    console.error('❌ global.css not found in public/styles');
  }
  
  // Copy theme files to the root themes directory
  const sourceThemesDir = path.join(PUBLIC_DIR, 'styles', 'themes');
  if (fs.existsSync(sourceThemesDir)) {
    const themeFiles = fs.readdirSync(sourceThemesDir);
    
    themeFiles.forEach(file => {
      if (file.endsWith('.css')) {
        const sourceFile = path.join(sourceThemesDir, file);
        const destFile = path.join(rootThemesDir, file);
        fs.copyFileSync(sourceFile, destFile);
        console.log(`✓ Copied ${file} to root themes directory`);
      }
    });
  } else {
    console.error('❌ themes directory not found in public/styles');
  }
}

// Create a CSS file with basic rules if global.css doesn't exist
function createFallbackCssFiles() {
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

  const rootStylesDir = path.join(BUILD_DIR, 'styles');
  if (!fs.existsSync(rootStylesDir)) {
    fs.mkdirSync(rootStylesDir, { recursive: true });
  }
  
  const rootThemesDir = path.join(rootStylesDir, 'themes');
  if (!fs.existsSync(rootThemesDir)) {
    fs.mkdirSync(rootThemesDir, { recursive: true });
  }
  
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

// Create special files for Cloudflare Pages to handle MIME types
function createCloudflareSpecialFiles() {
  // Create a .gitattributes file to ensure MIME types
  const gitattributesContent = `
# Force CSS files to have text/css MIME type
*.css text/css
`;

  const gitattributesPath = path.join(BUILD_DIR, '.gitattributes');
  fs.writeFileSync(gitattributesPath, gitattributesContent);
  console.log('Created .gitattributes file');
  
  // Create a type.json file for Cloudflare Pages
  const typesContent = `{
  "routes": {
    "/*.css": {
      "content-type": "text/css"
    },
    "/styles/*.css": {
      "content-type": "text/css"
    },
    "/styles/themes/*.css": {
      "content-type": "text/css"
    },
    "/_astro/*.css": {
      "content-type": "text/css"
    }
  }
}`;

  const typesPath = path.join(BUILD_DIR, 'types.json');
  fs.writeFileSync(typesPath, typesContent);
  console.log('Created types.json file for Cloudflare Pages');
}

// Main function
async function main() {
  console.log('Starting enhanced CSS fix...');
  
  // Make sure we have CSS files at the root level
  ensureRootStylesDirectory();
  
  // Create fallback CSS files if needed
  createFallbackCssFiles();
  
  // Create special files for Cloudflare Pages
  createCloudflareSpecialFiles();
  
  console.log('CSS fixes completed!');
}

// Run the script
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});