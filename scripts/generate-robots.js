/**
 * Simplified Robots.txt Generator for Single Directory Projects
 * Only handles the specific case of a single directory build
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getDirectory } from '../src/lib/nocodb.js';

// Load environment variables
dotenv.config();

/**
 * Generate robots.txt for a single directory build
 * @param {string} directoryId - The directory ID to generate robots.txt for
 * @param {string} outputDir - The output directory path
 * @returns {Promise<void>}
 */
export async function generateSingleRobotsTxt(directoryId, outputDir = './dist') {
  try {
    console.log(`Generating robots.txt for single directory build: ${directoryId}`);
    
    // Get directory data
    const directory = await getDirectory(directoryId);
    
    if (!directory) {
      throw new Error(`Directory not found: ${directoryId}`);
    }
    
    // Determine domain URL - for single directory builds, use root domain
    let domain;
    
    if (directory.data.domain) {
      // Use custom domain if available
      domain = `https://${directory.data.domain}`;
    } else {
      // Use a default domain or environment variable
      domain = process.env.SITE_URL || 'https://example.com';
    }
    
    // Get custom robots content if available
    let customRules = '';
    if (directory.data.metaTags?.robotsTxt) {
      customRules = directory.data.metaTags.robotsTxt;
    }
    
    // Generate robots.txt content for single directory
    const robotsTxt = `# robots.txt for ${directory.data.name}
User-agent: *
${directory.data.metaTags?.noindex ? 'Disallow: /' : 'Allow: /'}

# Block sensitive routes
Disallow: /admin/
Disallow: /login/
Disallow: /logout/
Disallow: /account/

# Allow all crawlers to access sitemap
Sitemap: ${domain}/sitemap.xml

${customRules}
`;
    
    // Write robots.txt to file in the output directory
    const outputPath = path.resolve(outputDir, 'robots.txt');
    fs.writeFileSync(outputPath, robotsTxt);
    
    console.log(`Single directory robots.txt generated at ${outputPath}`);
    
    return {
      id: directoryId,
      domain: domain
    };
  } catch (error) {
    console.error(`Error generating single directory robots.txt for ${directoryId}:`, error);
    throw error;
  }
}

// If run directly, generate robots.txt for the specified directory
if (process.argv[1] === import.meta.url) {
  const directoryId = process.argv[2] || process.env.CURRENT_DIRECTORY;
  
  if (!directoryId) {
    console.error('Error: Directory ID is required.');
    console.error('Usage: node generate-robots.js <directoryId>');
    process.exit(1);
  }
  
  generateSingleRobotsTxt(directoryId)
    .then(() => {
      console.log('Robots.txt generation completed successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error generating robots.txt:', error);
      process.exit(1);
    });
}