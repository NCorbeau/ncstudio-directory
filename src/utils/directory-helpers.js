// src/utils/directory-helpers.js
import { 
  getDirectory, 
  getDirectories, 
  getListings, 
  getListing,
  getLandingPages,
  getCategoryListings as fetchCategoryListings, // Rename to avoid confusion
  getFeaturedListings as fetchFeaturedListings, // Rename to avoid confusion
  searchListings
} from '../lib/nocodb.js';

/**
 * Get the current directory ID from the URL or environment variable
 * @param {URL} url - The current URL
 * @returns {string} The directory ID
 */
export function getCurrentDirectoryId(url) {
  // Defensive check for url parameter
  if (!url) {
    console.error('getCurrentDirectoryId: URL is undefined');
    return process.env.CURRENT_DIRECTORY || 'default';
  }

  // Try to get directory from URL path
  try {
    const urlParts = url.pathname.split('/');
    const directoryFromUrl = urlParts[1];
    
    // Fallback to environment variable if available
    if (directoryFromUrl) {
      return directoryFromUrl;
    } 
  } catch (error) {
    console.error('Error parsing URL in getCurrentDirectoryId:', error);
  }
  
  // Return from environment or default
  return process.env.CURRENT_DIRECTORY || 'default';
}

/**
 * Get the configuration for the specified directory
 * @param {string} directoryId - The directory ID
 * @returns {Promise<object|null>} The directory configuration or null if not found
 */
export async function getDirectoryConfig(directoryId) {
  if (!directoryId) {
    console.error('getDirectoryConfig: directoryId is undefined');
    return null;
  }

  try {
    return await getDirectory(directoryId);
  } catch (error) {
    console.error(`Error loading directory config for ${directoryId}:`, error);
    return null;
  }
}

/**
 * Get all listings for a specific directory
 * @param {string} directoryId - The directory ID
 * @returns {Promise<Array>} Array of listings for the directory
 */
export async function getDirectoryListings(directoryId) {
  if (!directoryId) {
    console.error('getDirectoryListings: directoryId is undefined');
    return [];
  }

  try {
    return await getListings(directoryId);
  } catch (error) {
    console.error(`Error loading listings for directory ${directoryId}:`, error);
    return [];
  }
}

/**
 * Get a specific listing by slug
 * @param {string} directoryId - The directory ID
 * @param {string} slug - The listing slug
 * @returns {Promise<object|null>} The listing or null if not found
 */
export async function getListingBySlug(directoryId, slug) {
  if (!directoryId || !slug) {
    console.error(`getListingBySlug: Invalid parameters - directoryId: ${directoryId}, slug: ${slug}`);
    return null;
  }

  try {
    return await getListing(directoryId, slug);
  } catch (error) {
    console.error(`Error loading listing ${slug} for directory ${directoryId}:`, error);
    return null;
  }
}

/**
 * Get landing pages for a directory
 * @param {string} directoryId - The directory ID
 * @returns {Promise<Array>} Array of landing pages
 */
export async function getDirectoryLandingPages(directoryId) {
  if (!directoryId) {
    console.error('getDirectoryLandingPages: directoryId is undefined');
    return [];
  }

  try {
    return await getLandingPages(directoryId);
  } catch (error) {
    console.error(`Error loading landing pages for directory ${directoryId}:`, error);
    return [];
  }
}

/**
 * Get listings for a specific category in a directory
 * Using the imported function, not creating a recursive call
 */
export async function getCategoryListings(directoryId, categoryId) {
  if (!directoryId || !categoryId) {
    console.error(`getCategoryListings: Invalid parameters - directoryId: ${directoryId}, categoryId: ${categoryId}`);
    return [];
  }

  try {
    return await fetchCategoryListings(directoryId, categoryId); // Using renamed import
  } catch (error) {
    console.error(`Error loading category listings for ${directoryId}/${categoryId}:`, error);
    return [];
  }
}

/**
 * Get featured listings for a directory
 * Using the imported function, not creating a recursive call
 */
export async function getFeaturedListings(directoryId, limit = 6) {
  if (!directoryId) {
    console.error('getFeaturedListings: directoryId is undefined');
    return [];
  }

  try {
    return await fetchFeaturedListings(directoryId, limit); // Using renamed import
  } catch (error) {
    console.error(`Error loading featured listings for ${directoryId}:`, error);
    return [];
  }
}

/**
 * Search listings in a directory
 * @param {string} directoryId - The directory ID
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of matching listings
 */
export async function searchDirectoryListings(directoryId, query) {
  if (!directoryId) {
    console.error('searchDirectoryListings: directoryId is undefined');
    return [];
  }

  try {
    return await searchListings(directoryId, query);
  } catch (error) {
    console.error(`Error searching listings for ${directoryId}:`, error);
    return [];
  }
}

/**
 * Get all directory configurations
 * @returns {Promise<Array>} Array of directory configurations
 */
export async function getAllDirectories() {
  try {
    return await getDirectories();
  } catch (error) {
    console.error('Error loading all directories:', error);
    return [];
  }
}

/**
 * Get recent listings for a directory
 * @param {string} directoryId - The directory ID
 * @param {number} limit - Maximum number of listings to return
 * @returns {Promise<Array>} Array of recent listings
 */
export async function getRecentListings(directoryId, limit = 4) {
  if (!directoryId) {
    console.error('getRecentListings: directoryId is undefined');
    return [];
  }

  try {
    const allListings = await getListings(directoryId);
    
    // Sort by updatedAt date (newest first)
    const sortedListings = [...allListings].sort((a, b) => {
      const dateA = a.data.updatedAt ? new Date(a.data.updatedAt) : new Date(0);
      const dateB = b.data.updatedAt ? new Date(b.data.updatedAt) : new Date(0);
      return dateB - dateA;
    });
    
    // Return the most recent listings
    return sortedListings.slice(0, limit);
  } catch (error) {
    console.error(`Error loading recent listings for ${directoryId}:`, error);
    return [];
  }
}

/**
 * Get related listings for a specific listing
 * @param {string} directoryId - The directory ID
 * @param {object} listing - The listing to find related items for
 * @param {number} limit - Maximum number of listings to return
 * @returns {Promise<Array>} Array of related listings
 */
export async function getRelatedListings(directoryId, listing, limit = 3) {
  if (!directoryId || !listing) {
    console.error('getRelatedListings: Missing required parameters');
    return [];
  }

  try {
    // Get all listings except the current one
    const allListings = await getListings(directoryId);
    const otherListings = allListings.filter(item => 
      item.slug !== listing.slug
    );
    
    // Calculate relevance score for each listing
    const scoredListings = otherListings.map(item => {
      let score = 0;
      
      // Same category gets highest score
      if (item.data.category === listing.data.category) {
        score += 5;
      }
      
      // Matching tags add to score
      if (item.data.tags && listing.data.tags) {
        const matchingTags = item.data.tags.filter(tag => 
          listing.data.tags.includes(tag)
        );
        score += matchingTags.length * 2;
      }
      
      return { listing: item, score };
    });
    
    // Sort by score and take top results
    const relatedListings = scoredListings
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.listing);
    
    return relatedListings;
  } catch (error) {
    console.error(`Error getting related listings for ${directoryId}:`, error);
    return [];
  }
}