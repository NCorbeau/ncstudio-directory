// src/utils/directory-helpers.js
import { 
  getDirectory, 
  getDirectories, 
  getListings, 
  getListing,
  getCategoryListings,
  getLandingPages,
  searchListings as searchNocoDBListings
} from '../lib/nocodb';

/**
 * Get the current directory ID from the URL or environment variable
 * @param {URL} url - The current URL
 * @returns {string} The directory ID
 */
export function getCurrentDirectoryId(url) {
  // Try to get directory from URL path
  const urlParts = url.pathname.split('/');
  const directoryFromUrl = urlParts[1];
  
  // Fallback to environment variable if available
  if (directoryFromUrl) {
    return directoryFromUrl;
  } else if (import.meta.env.CURRENT_DIRECTORY) {
    return import.meta.env.CURRENT_DIRECTORY;
  }
  
  // Default fallback
  return 'default';
}

/**
 * Get the configuration for the specified directory
 * @param {string} directoryId - The directory ID
 * @returns {Promise<object|null>} The directory configuration or null if not found
 */
export async function getDirectoryConfig(directoryId) {
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
  try {
    return await getListing(directoryId, slug);
  } catch (error) {
    console.error(`Error loading listing ${slug} for directory ${directoryId}:`, error);
    return null;
  }
}

/**
 * Get listings for a specific category in a directory
 * @param {string} directoryId - The directory ID
 * @param {string} categoryId - The category ID
 * @returns {Promise<Array>} Array of listings for the category
 */
export async function getCategoryListings(directoryId, categoryId) {
  try {
    return await getCategoryListings(directoryId, categoryId);
  } catch (error) {
    console.error(`Error loading category listings for ${directoryId}/${categoryId}:`, error);
    return [];
  }
}

/**
 * Get featured listings for a directory
 * @param {string} directoryId - The directory ID
 * @param {number} limit - Maximum number of listings to return
 * @returns {Promise<Array>} Array of featured listings
 */
export async function getFeaturedListings(directoryId, limit = 6) {
  try {
    const allListings = await getDirectoryListings(directoryId);
    const featuredListings = allListings
      .filter(listing => listing.data.featured)
      .slice(0, limit);
    
    return featuredListings;
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
export async function searchListings(directoryId, query) {
  if (!query) return [];
  
  try {
    return await searchNocoDBListings(directoryId, query);
  } catch (error) {
    console.error(`Error searching listings for ${directoryId}:`, error);
    return [];
  }
}

/**
 * Get landing pages for a directory
 * @param {string} directoryId - The directory ID
 * @returns {Promise<Array>} Array of landing pages
 */
export async function getDirectoryLandingPages(directoryId) {
  try {
    return await getLandingPages(directoryId);
  } catch (error) {
    console.error(`Error loading landing pages for directory ${directoryId}:`, error);
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
 * Get related listings based on category and tags
 * @param {string} directoryId - The directory ID
 * @param {object} currentListing - The current listing
 * @param {number} limit - Maximum number of listings to return
 * @returns {Promise<Array>} Array of related listings
 */
export async function getRelatedListings(directoryId, currentListing, limit = 3) {
  try {
    const allListings = await getDirectoryListings(directoryId);
    
    // Filter out the current listing
    const otherListings = allListings.filter(listing => 
      listing.slug !== currentListing.slug
    );
    
    // Calculate relevance score for each listing
    const scoredListings = otherListings.map(listing => {
      let score = 0;
      
      // Same category gets highest score
      if (listing.data.category === currentListing.data.category) {
        score += 5;
      }
      
      // Matching tags add to score
      if (listing.data.tags && currentListing.data.tags) {
        const matchingTags = listing.data.tags.filter(tag => 
          currentListing.data.tags.includes(tag)
        );
        score += matchingTags.length * 2;
      }
      
      return { listing, score };
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