/**
 * Simplified Sitemap Generator for Single Directory Projects
 * Only handles the specific case of a single directory build
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getDirectory, getListings, getLandingPages } from '../src/lib/nocodb.js';

// Load environment variables
dotenv.config();

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
 * Generate sitemap for a single directory build
 * @param {string} directoryId - The directory ID to generate sitemap for
 * @param {string} outputDir - The output directory path
 * @returns {Promise<void>}
 */
export async function generateSingleSitemap(directoryId, outputDir = './dist') {
  try {
    console.log(`Generating sitemap for single directory build: ${directoryId}`);
    
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
    
    // Fetch listings and landing pages for the directory
    const listings = await getListings(directoryId);
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
    
    // Add category pages - important to use root paths for single directory build
    if (directory.data.categories && directory.data.categories.length > 0) {
      for (const category of directory.data.categories) {
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
    
    // Add listing pages - important to use root paths for single directory build
    for (const listing of listings) {
      // For single directory builds, we remove the directory prefix from the slug
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
    
    // Add landing pages - important to use root paths for single directory build
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
    
    // Write sitemap to file in the output directory
    const outputPath = path.resolve(outputDir, 'sitemap.xml');
    fs.writeFileSync(outputPath, sitemap);
    
    console.log(`Single directory sitemap generated at ${outputPath}`);
    
    return {
      id: directoryId,
      domain: domain,
      url: `${domain}/sitemap.xml`
    };
  } catch (error) {
    console.error(`Error generating single directory sitemap for ${directoryId}:`, error);
    throw error;
  }
}

// If run directly, generate sitemap for the specified directory
if (process.argv[1] === import.meta.url) {
  const directoryId = process.argv[2] || process.env.CURRENT_DIRECTORY;
  
  if (!directoryId) {
    console.error('Error: Directory ID is required.');
    console.error('Usage: node generate-sitemaps.js <directoryId>');
    process.exit(1);
  }
  
  generateSingleSitemap(directoryId)
    .then(() => {
      console.log('Sitemap generation completed successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error generating sitemap:', error);
      process.exit(1);
    });
}