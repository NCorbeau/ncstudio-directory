// src/utils/directory-helpers.js
import { 
  getDirectory, 
  getDirectories, 
  getListings, 
  getListing,
  getLandingPages,
  getCategoryListings as fetchCategoryListings,
  getFeaturedListings as fetchFeaturedListings,
  getRecentListings as fetchRecentListings,
  searchListings,
  getRelatedListings as fetchRelatedListings,
  getListingsByFilter
} from '../lib/nocodb.js';

/**
 * Get the current directory ID from environment variable (single directory mode)
 * @param {URL} url - The current URL (unused in single directory mode)
 * @returns {string} The directory ID
 */
export function getCurrentDirectoryId(url) {
  // Always use environment variable in single directory mode
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
 * Get all directories (single directory mode - returns current directory only)
 * @returns {Promise<Array>} Array of directory configurations
 */
export async function getAllDirectories() {
  // Always return only the current directory in single directory mode
  const currentDirId = process.env.CURRENT_DIRECTORY;
  if (!currentDirId) {
    console.error('getAllDirectories: CURRENT_DIRECTORY is not set');
    return [];
  }
  
  console.log(`Single directory mode: Only fetching directory ${currentDirId}`);
  const dirConfig = await getDirectoryConfig(currentDirId);
  return dirConfig ? [dirConfig] : [];
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
 * Get a specific listing by slug (legacy support)
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
 * Get a specific listing by full path
 * @param {string} directoryId - The directory ID
 * @param {string} fullPath - The full URL path
 * @returns {Promise<object|null>} The listing or null if not found
 */
export async function getListingByFullPath(directoryId, fullPath) {
  if (!directoryId || !fullPath) {
    console.error(`getListingByFullPath: Invalid parameters - directoryId: ${directoryId}, fullPath: ${fullPath}`);
    return null;
  }

  try {
    // Query by full_path field
    const filters = {
      directory: directoryId,
      full_path: fullPath
    };
    
    const results = await getListingsByFilter(filters);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error(`Error loading listing by path ${fullPath} for directory ${directoryId}:`, error);
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
 * Get a specific landing page by slug
 * @param {string} directoryId - The directory ID
 * @param {string} slug - The landing page slug
 * @returns {Promise<object|null>} The landing page or null if not found
 */
export async function getLandingPageBySlug(directoryId, slug) {
  if (!directoryId || !slug) {
    console.error(`getLandingPageBySlug: Invalid parameters - directoryId: ${directoryId}, slug: ${slug}`);
    return null;
  }

  try {
    const landingPages = await getLandingPages(directoryId);
    
    // Find the landing page with the matching slug
    const landingPage = landingPages.find(page => {
      const pageSlug = page.slug.replace(`${directoryId}/`, '');
      return pageSlug === slug;
    });
    
    return landingPage || null;
  } catch (error) {
    console.error(`Error loading landing page ${slug} for directory ${directoryId}:`, error);
    return null;
  }
}

/**
 * Get listings for a specific category in a directory
 * @param {string} directoryId - The directory ID
 * @param {string} categoryId - The category ID
 * @param {object} additionalFilters - Additional filters (e.g., location)
 * @returns {Promise<Array>} Array of listings
 */
export async function getCategoryListings(directoryId, categoryId, additionalFilters = {}) {
  if (!directoryId || !categoryId) {
    console.error(`getCategoryListings: Invalid parameters - directoryId: ${directoryId}, categoryId: ${categoryId}`);
    return [];
  }

  try {
    // Build filters
    const filters = {
      directory: directoryId,
      category: categoryId,
      ...additionalFilters
    };
    
    return await getListingsByFilter(filters);
  } catch (error) {
    console.error(`Error loading category listings for ${directoryId}/${categoryId}:`, error);
    return [];
  }
}

/**
 * Get listings for a specific location
 * @param {string} directoryId - The directory ID
 * @param {object} locationFilters - Location filters
 * @returns {Promise<Array>} Array of listings
 */
export async function getLocationListings(directoryId, locationFilters) {
  if (!directoryId || !locationFilters) {
    console.error(`getLocationListings: Invalid parameters - directoryId: ${directoryId}`);
    return [];
  }

  try {
    const filters = {
      directory: directoryId,
      ...locationFilters
    };
    
    return await getListingsByFilter(filters);
  } catch (error) {
    console.error(`Error loading location listings for ${directoryId}:`, error);
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
  if (!directoryId) {
    console.error('getFeaturedListings: directoryId is undefined');
    return [];
  }

  try {
    return await fetchFeaturedListings(directoryId, limit);
  } catch (error) {
    console.error(`Error loading featured listings for ${directoryId}:`, error);
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
    return await fetchRecentListings(directoryId, limit);
  } catch (error) {
    console.error(`Error loading recent listings for ${directoryId}:`, error);
    return [];
  }
}

/**
 * Get related listings
 * @param {string} directoryId - The directory ID
 * @param {string} listingId - The current listing ID
 * @param {string} category - The category to match
 * @param {number} limit - Maximum number of listings to return
 * @returns {Promise<Array>} Array of related listings
 */
export async function getRelatedListings(directoryId, listingId, category, limit = 4) {
  if (!directoryId || !listingId) {
    console.error('getRelatedListings: Invalid parameters');
    return [];
  }

  try {
    return await fetchRelatedListings(directoryId, listingId, category, limit);
  } catch (error) {
    console.error(`Error loading related listings:`, error);
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
  if (!directoryId || !query) {
    console.error('searchDirectoryListings: Invalid parameters');
    return [];
  }

  try {
    return await searchListings(directoryId, query);
  } catch (error) {
    console.error(`Error searching listings:`, error);
    return [];
  }
}

/**
 * Get all unique locations for a directory
 * @param {string} directoryId - The directory ID
 * @returns {Promise<Array>} Array of unique locations
 */
export async function getDirectoryLocations(directoryId) {
  if (!directoryId) {
    console.error('getDirectoryLocations: directoryId is undefined');
    return [];
  }

  try {
    const listings = await getListings(directoryId);
    const locations = new Map();
    
    // Extract unique locations from listings
    listings.forEach(listing => {
      if (listing.data.location_data) {
        const locationData = listing.data.location_data;
        
        // Add cities
        if (locationData.city) {
          locations.set(locationData.city, {
            type: 'city',
            name: locationData.city,
            slug: locationData.city,
            count: (locations.get(locationData.city)?.count || 0) + 1
          });
        }
        
        // Add districts
        if (locationData.district && locationData.city) {
          const key = `${locationData.city}/${locationData.district}`;
          locations.set(key, {
            type: 'district',
            name: locationData.district,
            parent: locationData.city,
            slug: locationData.district,
            count: (locations.get(key)?.count || 0) + 1
          });
        }
      }
    });
    
    return Array.from(locations.values());
  } catch (error) {
    console.error(`Error loading locations for ${directoryId}:`, error);
    return [];
  }
}