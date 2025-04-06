/**
 * Sitemap Generator for Multi-Directory Project
 * Generates individual sitemaps for each directory and a site index for the root domain
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getDirectories, getListings, getLandingPages } from '../src/lib/nocodb.js';

// Load environment variables
dotenv.config();

// Base domain if no custom domain is specified
const BASE_DOMAIN = process.env.SITE_URL || 'https://ncstudio-directory.pages.dev';

/**
 * Format date to ISO string for sitemaps
 * @param {string|Date} date - Date to format
 * @returns {string} - ISO formatted date string
 */
function formatDate(date) {
  if (!date) return new Date().toISOString();
  
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  
  return date.toISOString();
}

/**
 * Generate sitemap for a specific directory
 * @param {string} directoryId - Directory ID
 * @param {object} directoryData - Directory configuration data
 */
async function generateDirectorySitemap(directoryId, directoryData) {
  try {
    console.log(`Generating sitemap for ${directoryId}...`);
    
    // Determine domain URL - more flexible handling
    let domain;
    
    if (directoryData.domain) {
      // Use custom domain if available
      domain = `https://${directoryData.domain}`;
    } else if (process.env.SITE_URL) {
      // Use SITE_URL from environment with directory path
      if (process.env.SITE_URL.endsWith('/')) {
        domain = `${process.env.SITE_URL}${directoryId}`;
      } else {
        domain = `${process.env.SITE_URL}/${directoryId}`;
      }
    } else {
      // Fallback to a placeholder URL format that follows your path structure
      domain = `https://YOUR-PROJECT-NAME.pages.dev/${directoryId}`;
      console.warn(`No domain or SITE_URL configured for ${directoryId}, using placeholder URL: ${domain}`);
    }
    
    // Define directory output path
    const outputPath = path.resolve(`./dist/${directoryId}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // Fetch all listings for the directory
    const listings = await getListings(directoryId);
    
    // Fetch all landing pages for the directory
    const landingPages = await getLandingPages(directoryId);
    
    // Start sitemap XML string
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                            http://www.google.com/schemas/sitemap-image/1.1
                            http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">
  
  <!-- Homepage -->
  <url>
    <loc>${domain}/</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Search page -->
  <url>
    <loc>${domain}/search</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    
    // Add category pages
    if (directoryData.categories && directoryData.categories.length > 0) {
      for (const category of directoryData.categories) {
        sitemap += `
  <!-- Category: ${category.name} -->
  <url>
    <loc>${domain}/category/${category.id}</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }
    
    // Add listing pages
    for (const listing of listings) {
      const slug = listing.slug.replace(`${directoryId}/`, '');
      const lastMod = listing.data.updatedAt || new Date();
      
      sitemap += `
  <!-- Listing: ${listing.data.title} -->
  <url>
    <loc>${domain}/${slug}</loc>
    <lastmod>${formatDate(lastMod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;
      
      // Add images if available
      if (listing.data.images && listing.data.images.length > 0) {
        for (const image of listing.data.images) {
          sitemap += `
    <image:image>
      <image:loc>${image}</image:loc>
      <image:title>${listing.data.title}</image:title>
    </image:image>`;
        }
      }
      
      sitemap += `
  </url>`;
    }
    
    // Add landing pages
    for (const page of landingPages) {
      const slug = page.slug.replace(`${directoryId}/`, '');
      const lastMod = page.data.updatedAt || new Date();
      
      sitemap += `
  <!-- Landing Page: ${page.data.title} -->
  <url>
    <loc>${domain}/page/${slug}</loc>
    <lastmod>${formatDate(lastMod)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>`;
      
      // Add featured image if available
      if (page.data.featuredImage) {
        sitemap += `
    <image:image>
      <image:loc>${page.data.featuredImage}</image:loc>
      <image:title>${page.data.title}</image:title>
    </image:image>`;
      }
      
      sitemap += `
  </url>`;
    }
    
    // Close sitemap XML
    sitemap += `
</urlset>`;
    
    // Write sitemap to file
    fs.writeFileSync(path.join(outputPath, 'sitemap.xml'), sitemap);
    console.log(`Sitemap generated for ${directoryId} at ${outputPath}/sitemap.xml`);
    
    return {
      id: directoryId,
      domain: domain,
      url: `${domain}/sitemap.xml`
    };
  } catch (error) {
    console.error(`Error generating sitemap for ${directoryId}:`, error);
    return null;
  }
}

/**
 * Generate sitemap index for the main domain
 * @param {Array} sitemaps - Array of sitemap info
 */
function generateSitemapIndex(sitemaps) {
  try {
    console.log('Generating sitemap index...');
    
    // Start sitemap index XML
    let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    // Add each sitemap
    for (const sitemap of sitemaps) {
      if (sitemap) {
        sitemapIndex += `
  <sitemap>
    <loc>${sitemap.url}</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
  </sitemap>`;
      }
    }
    
    // Close sitemap index
    sitemapIndex += `
</sitemapindex>`;
    
    // Write sitemap index to file
    fs.writeFileSync(path.resolve('./dist/sitemap.xml'), sitemapIndex);
    console.log('Sitemap index generated at dist/sitemap.xml');
  } catch (error) {
    console.error('Error generating sitemap index:', error);
  }
}

/**
 * Main function to generate all sitemaps
 */
async function generateAllSitemaps() {
  try {
    // Get all directories
    const directories = await getDirectories();
    
    if (!directories || directories.length === 0) {
      throw new Error('No directories found');
    }
    
    console.log(`Found ${directories.length} directories`);
    
    // Generate sitemap for each directory
    const sitemapPromises = directories.map(directory => 
      generateDirectorySitemap(directory.id, directory.data)
    );
    
    // Wait for all sitemaps to be generated
    const sitemaps = await Promise.all(sitemapPromises);
    
    // Filter out null results (errors)
    const validSitemaps = sitemaps.filter(s => s !== null);
    
    // Generate sitemap index
    generateSitemapIndex(validSitemaps);
    
    console.log('All sitemaps generated successfully');
  } catch (error) {
    console.error('Error generating sitemaps:', error);
  }
}

// Run the sitemap generator
generateAllSitemaps().catch(error => {
  console.error('Unhandled error in sitemap generation:', error);
  process.exit(1);
});