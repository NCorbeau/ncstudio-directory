// src/lib/nocodb.js
/**
 * NocoDB API client for fetching data with caching
 */
import { cachedFetch, cacheTTL } from './cache';

// NocoDB API configuration
const NOCODB_API_URL = import.meta.env.NOCODB_API_URL || 'https://your-nocodb-instance.com/api/v1';
const NOCODB_AUTH_TOKEN = import.meta.env.NOCODB_AUTH_TOKEN;

// Base headers for API requests
const headers = {
  'xc-auth': NOCODB_AUTH_TOKEN,
  'Content-Type': 'application/json'
};

/**
 * Fetch data from NocoDB with caching
 * @param {string} endpoint - API endpoint
 * @param {object} params - Query parameters
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Response data
 */
async function fetchFromNocoDB(endpoint, params = {}, ttl = cacheTTL.directories) {
  // Build query string from params
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const url = `${NOCODB_API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  try {
    return await cachedFetch(url, { headers }, ttl);
  } catch (error) {
    console.error('Error fetching from NocoDB:', error);
    throw error;
  }
}

/**
 * Get all directory configurations
 * @returns {Promise<Array>} - Array of directory configurations
 */
export async function getDirectories() {
  const response = await fetchFromNocoDB('/tables/directories/rows', {}, cacheTTL.directories);
  
  // Transform the response to match the expected format
  return response.list.map(directory => ({
    id: directory.id,
    data: {
      name: directory.name,
      description: directory.description,
      domain: directory.domain,
      theme: directory.theme,
      primaryColor: directory.primaryColor,
      secondaryColor: directory.secondaryColor,
      logo: directory.logo,
      categories: JSON.parse(directory.categories || '[]'),
      metaTags: JSON.parse(directory.metaTags || '{}'),
      socialLinks: JSON.parse(directory.socialLinks || '[]'),
      deployment: JSON.parse(directory.deployment || '{}')
    }
  }));
}

/**
 * Get a specific directory configuration by ID
 * @param {string} id - Directory ID
 * @returns {Promise<object|null>} - Directory configuration or null if not found
 */
export async function getDirectory(id) {
  try {
    const response = await fetchFromNocoDB(`/tables/directories/rows/find-one`, {
      where: JSON.stringify({
        id: { eq: id }
      })
    }, cacheTTL.directories);
    
    if (!response) return null;
    
    // Transform to expected format
    return {
      id: response.id,
      data: {
        name: response.name,
        description: response.description,
        domain: response.domain,
        theme: response.theme,
        primaryColor: response.primaryColor,
        secondaryColor: response.secondaryColor,
        logo: response.logo,
        categories: JSON.parse(response.categories || '[]'),
        metaTags: JSON.parse(response.metaTags || '{}'),
        socialLinks: JSON.parse(response.socialLinks || '[]'),
        deployment: JSON.parse(response.deployment || '{}')
      }
    };
  } catch (error) {
    console.error(`Error fetching directory ${id}:`, error);
    return null;
  }
}

/**
 * Get all listings for a specific directory
 * @param {string} directoryId - Directory ID
 * @returns {Promise<Array>} - Array of listings
 */
export async function getListings(directoryId) {
  const response = await fetchFromNocoDB('/tables/listings/rows', {
    where: JSON.stringify({
      directory: { eq: directoryId }
    })
  }, cacheTTL.listings);
  
  // Transform to match expected format with rendered markdown content
  return Promise.all(response.list.map(async listing => {
    // Convert markdown content to HTML
    const renderedContent = await renderMarkdown(listing.content);
    
    return {
      slug: `${listing.directory}/${listing.slug}`,
      data: {
        title: listing.title,
        description: listing.description,
        directory: listing.directory,
        category: listing.category,
        featured: listing.featured === 1 || listing.featured === true,
        images: JSON.parse(listing.images || '[]'),
        address: listing.address,
        website: listing.website,
        phone: listing.phone,
        rating: listing.rating,
        tags: JSON.parse(listing.tags || '[]'),
        openingHours: JSON.parse(listing.openingHours || '[]'),
        customFields: JSON.parse(listing.customFields || '{}'),
        updatedAt: listing.updatedAt
      },
      // Add a render function that returns the pre-rendered content
      render: () => ({ Content: renderedContent })
    };
  }));
}

/**
 * Get listings for a specific category in a directory
 * @param {string} directoryId - Directory ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Array>} - Array of listings for the category
 */
export async function getCategoryListings(directoryId, categoryId) {
  const response = await fetchFromNocoDB('/tables/listings/rows', {
    where: JSON.stringify({
      directory: { eq: directoryId },
      category: { eq: categoryId }
    })
  }, cacheTTL.categories);
  
  // Transform to match expected format with rendered markdown content
  return Promise.all(response.list.map(async listing => {
    // Convert markdown content to HTML
    const renderedContent = await renderMarkdown(listing.content);
    
    return {
      slug: `${listing.directory}/${listing.slug}`,
      data: {
        title: listing.title,
        description: listing.description,
        directory: listing.directory,
        category: listing.category,
        featured: listing.featured === 1 || listing.featured === true,
        images: JSON.parse(listing.images || '[]'),
        address: listing.address,
        website: listing.website,
        phone: listing.phone,
        rating: listing.rating,
        tags: JSON.parse(listing.tags || '[]'),
        openingHours: JSON.parse(listing.openingHours || '[]'),
        customFields: JSON.parse(listing.customFields || '{}')
      },
      // Add a render function that returns the pre-rendered content
      render: () => ({ Content: renderedContent })
    };
  }));
}

/**
 * Search listings in a directory
 * @param {string} directoryId - Directory ID
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching listings
 */
export async function searchListings(directoryId, query) {
  // For simple implementations, we can fetch all and filter
  // For production, you would implement a proper search API endpoint
  const allListings = await getListings(directoryId);
  const lowercaseQuery = query.toLowerCase();
  
  return allListings.filter(listing => {
    const data = listing.data;
    return (
      data.title.toLowerCase().includes(lowercaseQuery) ||
      data.description.toLowerCase().includes(lowercaseQuery) ||
      (data.tags && data.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))) ||
      (data.address && data.address.toLowerCase().includes(lowercaseQuery))
    );
  });
}

/**
 * Get a specific listing by directory and slug
 * @param {string} directoryId - Directory ID
 * @param {string} slug - Listing slug
 * @returns {Promise<object|null>} - Listing data or null if not found
 */
export async function getListing(directoryId, slug) {
  try {
    const response = await fetchFromNocoDB('/tables/listings/rows/find-one', {
      where: JSON.stringify({
        directory: { eq: directoryId },
        slug: { eq: slug }
      })
    }, cacheTTL.listings);
    
    if (!response) return null;
    
    // Convert markdown content to HTML
    const renderedContent = await renderMarkdown(response.content);
    
    return {
      slug: `${response.directory}/${response.slug}`,
      data: {
        title: response.title,
        description: response.description,
        directory: response.directory,
        category: response.category,
        featured: response.featured === 1 || response.featured === true,
        images: JSON.parse(response.images || '[]'),
        address: response.address,
        website: response.website,
        phone: response.phone,
        rating: response.rating,
        tags: JSON.parse(response.tags || '[]'),
        openingHours: JSON.parse(response.openingHours || '[]'),
        customFields: JSON.parse(response.customFields || '{}')
      },
      // Add a render function that returns the pre-rendered content
      render: () => ({ Content: renderedContent })
    };
  } catch (error) {
    console.error(`Error fetching listing ${directoryId}/${slug}:`, error);
    return null;
  }
}

/**
 * Get all landing pages for a specific directory
 * @param {string} directoryId - Directory ID
 * @returns {Promise<Array>} - Array of landing pages
 */
export async function getLandingPages(directoryId) {
  const response = await fetchFromNocoDB('/tables/landing_pages/rows', {
    where: JSON.stringify({
      directory: { eq: directoryId }
    })
  }, cacheTTL.landingPages);
  
  // Transform to match expected format with rendered markdown content
  return Promise.all(response.list.map(async page => {
    // Convert markdown content to HTML
    const renderedContent = await renderMarkdown(page.content);
    
    return {
      slug: `${page.directory}/${page.slug}`,
      data: {
        title: page.title,
        description: page.description,
        directory: page.directory,
        featuredImage: page.featuredImage,
        keywords: JSON.parse(page.keywords || '[]'),
        relatedCategories: JSON.parse(page.relatedCategories || '[]')
      },
      // Add a render function that returns the pre-rendered content
      render: () => ({ Content: renderedContent })
    };
  }));
}

/**
 * Force clear all caches - useful for webhook-based cache invalidation
 * @param {string} [type] - Specific cache type to clear, or all if not specified
 */
export function clearCache(type) {
  if (typeof globalThis.__memoryCache !== 'undefined') {
    // If a specific type is requested, only clear those caches
    if (type) {
      const cachePattern = new RegExp(`/tables/${type}/`);
      
      Object.keys(globalThis.__memoryCache.cache).forEach(key => {
        if (cachePattern.test(key)) {
          globalThis.__memoryCache.delete(key);
        }
      });
    } else {
      // Clear all caches
      globalThis.__memoryCache.clear();
    }
  }
}

/**
 * Convert markdown to HTML
 * @param {string} markdown - Markdown content
 * @returns {Promise<Function>} - Function that returns HTML component
 */
async function renderMarkdown(markdown) {
  if (!markdown) return () => '';
  
  // Import the markdown parser
  const { marked } = await import('marked');
  const html = marked(markdown);
  
  // Return a function that Astro can use to render HTML
  return () => html;
}