// scripts/directory-loader.js
/**
 * Utility to load directory data from NocoDB 
 * Can be used during build time and within functions
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getDirectories } from '../src/lib/nocodb.js';

// Load environment variables
dotenv.config();

// Try to load .env.local if it exists (overrides .env)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

/**
 * Get all directory information from NocoDB
 * With caching for build performance
 * @param {boolean} [useCache=true] - Whether to use cached results
 * @returns {Promise<Array>} Array of directory objects
 */
export async function loadDirectories(useCache = true) {
  const cacheFile = path.resolve('./node_modules/.cache/directories.json');
  
  // Check if we have a cached result and it's not older than 10 minutes
  if (useCache && fs.existsSync(cacheFile)) {
    try {
      const stats = fs.statSync(cacheFile);
      const cacheAge = Date.now() - stats.mtimeMs;
      
      // Cache is valid if less than 10 minutes old
      if (cacheAge < 10 * 60 * 1000) {
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        console.log('Using cached directory data');
        return cachedData;
      }
    } catch (error) {
      console.warn('Error reading cache file:', error);
    }
  }
  
  try {
    console.log('Fetching directories from NocoDB...');
    const directories = await getDirectories();
    
    // Cache the results
    try {
      const cacheDir = path.dirname(cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(cacheFile, JSON.stringify(directories, null, 2));
    } catch (cacheError) {
      console.warn('Error writing cache file:', cacheError);
    }
    
    return directories;
  } catch (error) {
    console.error('Error fetching directories from NocoDB:', error);
    
    // Fallback to environment variable if available
    const directoriesEnv = process.env.DIRECTORIES;
    if (directoriesEnv) {
      const directoryIds = directoriesEnv.split(',');
      return directoryIds.map(id => ({ 
        id, 
        data: { 
          name: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          theme: id.includes('french') ? 'elegant' : id.includes('dog') ? 'nature' : 'default'
        } 
      }));
    }
    
    // Last resort fallback
    return [
      { id: 'french-desserts', data: { name: 'French Desserts', theme: 'elegant' } },
      { id: 'dog-parks-warsaw', data: { name: 'Dog Parks Warsaw', theme: 'nature' } }
    ];
  }
}

/**
 * Get directory to theme mappings
 * @returns {Promise<Object>} Object mapping directory IDs to theme names
 */
export async function getDirectoryThemeMapping() {
  const directories = await loadDirectories();
  const mapping = {};
  
  directories.forEach(dir => {
    mapping[dir.id] = dir.data.theme || 'default';
  });
  
  return mapping;
}

/**
 * Get domain to directory mappings
 * @returns {Promise<Object>} Object mapping domain names to directory IDs
 */
export async function getDomainDirectoryMapping() {
  const directories = await loadDirectories();
  const mapping = {};
  
  directories.forEach(dir => {
    if (dir.data.domain) {
      mapping[dir.data.domain] = dir.id;
    }
  });
  
  return mapping;
}

/**
 * Generate redirect rules for all directories
 * @returns {Promise<string>} Formatted redirect rules
 */
export async function generateRedirectRules() {
  const directories = await loadDirectories();
  let rules = "# Custom domains - Dynamically generated\n";
  
  // Add custom domain rules
  directories.forEach(dir => {
    if (dir.data.domain) {
      rules += `/* /${dir.id}/:splat 200 Host=${dir.data.domain}\n`;
    }
  });
  
  // Add main domain paths
  rules += "\n# Main domain paths\n";
  directories.forEach(dir => {
    rules += `/${dir.id}/* /${dir.id}/:splat 200\n`;
  });
  
  // Add default path
  rules += "\n# Default path\n";
  rules += "/ /directory-selector/ 200\n";
  rules += "/* /404.html 404";
  
  return rules;
}

/**
 * Generate route rules for Cloudflare Pages
 * @returns {Promise<Object>} JSON object with route rules
 */
export async function generateRouteRules() {
  const directories = await loadDirectories();
  
  const routeRules = {
    "version": 1,
    "include": ["/*"],
    "exclude": ["/api/*"],
    "routes": []
  };
  
  // Add host-based rules for custom domains
  directories.forEach(dir => {
    if (dir.data.domain) {
      routeRules.routes.push({
        "src": "/",
        "dest": `/${dir.id}/index.html`,
        "has": [
          {
            "type": "host",
            "value": dir.data.domain
          }
        ]
      });
    }
  });
  
  // Add default selector route
  routeRules.routes.push({
    "src": "/",
    "dest": "/directory-selector/index.html"
  });
  
  // Add generic directory routes
  routeRules.routes.push(
    {
      "src": "/:directory",
      "dest": "/:directory/index.html"
    },
    {
      "src": "/:directory/",
      "dest": "/:directory/index.html"
    },
    {
      "src": "/:directory/*",
      "dest": "/:directory/:splat"
    }
  );
  
  // Add API and asset routes
  routeRules.routes.push(
    {
      "src": "/api/search",
      "dest": "/api/search.js"
    },
    {
      "src": "/api/webhook",
      "dest": "/api/webhook.js"
    },
    {
      "src": "/_astro/*.js",
      "headers": {
        "Content-Type": "application/javascript"
      },
      "continue": true
    },
    {
      "src": "/*.js",
      "headers": {
        "Content-Type": "application/javascript"
      },
      "continue": true
    },
    {
      "src": "/_astro/*.css",
      "headers": {
        "Content-Type": "text/css"
      },
      "continue": true
    },
    {
      "src": "/*.css",
      "headers": {
        "Content-Type": "text/css"
      },
      "continue": true
    },
    {
      "src": "/_astro/*.js",
      "dest": "/_astro/:splat.js"
    }
  );
  
  return routeRules;
}

// Helper to get all directory IDs as an array
export async function getDirectoryIds() {
  const directories = await loadDirectories();
  return directories.map(dir => dir.id);
}

// Helper to get theme for a specific directory
export async function getDirectoryTheme(directoryId) {
  const directories = await loadDirectories();
  const directory = directories.find(dir => dir.id === directoryId);
  return directory?.data?.theme || 'default';
}

// If this script is run directly, output the directories to console
if (process.argv[1] === import.meta.url) {
  loadDirectories().then(directories => {
    console.log('Directories from NocoDB:');
    console.table(directories.map(dir => ({
      id: dir.id,
      name: dir.data.name,
      domain: dir.data.domain || 'N/A',
      theme: dir.data.theme || 'default'
    })));
  }).catch(error => {
    console.error('Error:', error);
  });
}