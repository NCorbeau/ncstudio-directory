/**
 * Robots.txt Generator for Multi-Directory Project
 * Creates robots.txt files for each directory and the main site
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getDirectories } from '../src/lib/nocodb.js';

// Load environment variables
dotenv.config();

// Base domain if no custom domain is specified
const BASE_DOMAIN = process.env.SITE_URL || 'https://multi-directory-generator.pages.dev';

/**
 * Generate robots.txt for a specific directory
 * @param {string} directoryId - Directory ID
 * @param {object} directoryData - Directory configuration data
 */
async function generateDirectoryRobots(directoryId, directoryData) {
  try {
    console.log(`Generating robots.txt for ${directoryId}...`);
    
    // Determine domain URL
    const domain = directoryData.domain 
      ? `https://${directoryData.domain}` 
      : `${BASE_DOMAIN}/${directoryId}`;
    
    // Define directory output path
    const outputPath = path.resolve(`./dist/${directoryId}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // Get custom robots content if available
    let customRules = '';
    if (directoryData.metaTags?.robotsTxt) {
      customRules = directoryData.metaTags.robotsTxt;
    }
    
    // Generate robots.txt content
    const robotsTxt = `# robots.txt for ${directoryData.name}
User-agent: *
${directoryData.metaTags?.noindex ? 'Disallow: /' : 'Allow: /'}

# Block admin routes if they exist
Disallow: /admin/
Disallow: /login/
Disallow: /logout/
Disallow: /account/

# Allow all crawlers to access sitemap
Sitemap: ${domain}/sitemap.xml

${customRules}
`;
    
    // Write robots.txt to file
    fs.writeFileSync(path.join(outputPath, 'robots.txt'), robotsTxt);
    console.log(`robots.txt generated for ${directoryId} at ${outputPath}/robots.txt`);
    
    return {
      id: directoryId,
      domain: domain
    };
  } catch (error) {
    console.error(`Error generating robots.txt for ${directoryId}:`, error);
    return null;
  }
}

/**
 * Generate root robots.txt for the main domain
 * @param {Array} directories - Array of directory information
 */
function generateRootRobots(directories) {
  try {
    console.log('Generating root robots.txt...');
    
    // Start with basic rules
    let robotsTxt = `# robots.txt for Multi-Directory Generator
User-agent: *
Allow: /

# Block sensitive directories
Disallow: /api/
Disallow: /functions/

# Sitemaps
Sitemap: ${BASE_DOMAIN}/sitemap.xml
`;
    
    // Add references to directory sitemaps
    for (const dir of directories) {
      if (dir) {
        robotsTxt += `Sitemap: ${dir.domain}/sitemap.xml\n`;
      }
    }
    
    // Write robots.txt to file
    fs.writeFileSync(path.resolve('./dist/robots.txt'), robotsTxt);
    console.log('Root robots.txt generated at dist/robots.txt');
  } catch (error) {
    console.error('Error generating root robots.txt:', error);
  }
}

/**
 * Main function to generate all robots.txt files
 */
async function generateAllRobots() {
  try {
    // Get all directories
    const directories = await getDirectories();
    
    if (!directories || directories.length === 0) {
      throw new Error('No directories found');
    }
    
    console.log(`Found ${directories.length} directories`);
    
    // Generate robots.txt for each directory
    const robotsPromises = directories.map(directory => 
      generateDirectoryRobots(directory.id, directory.data)
    );
    
    // Wait for all robots.txt files to be generated
    const robotsResults = await Promise.all(robotsPromises);
    
    // Filter out null results (errors)
    const validResults = robotsResults.filter(r => r !== null);
    
    // Generate root robots.txt
    generateRootRobots(validResults);
    
    console.log('All robots.txt files generated successfully');
  } catch (error) {
    console.error('Error generating robots.txt files:', error);
  }
}

// Run the robots.txt generator
generateAllRobots().catch(error => {
  console.error('Unhandled error in robots.txt generation:', error);
  process.exit(1);
});