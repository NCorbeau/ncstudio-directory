/**
 * NocoDB v2 API client for fetching data with caching
 * Handles field mapping between NocoDB conventions and JavaScript conventions
 */

let dotenv;
if (typeof window === 'undefined') {
  // We're in a Node.js environment
  dotenv = await import('dotenv');
  dotenv.config();
}

import { cachedFetch, cacheTTL } from './cache.js';

const NOCODB_API_URL = typeof window !== 'undefined' 
  ? (import.meta.env?.NOCODB_API_URL || 'https://nocodb.ncstudio.click/api/v2')
  : (process.env?.NOCODB_API_URL || 'https://nocodb.ncstudio.click/api/v2');

const NOCODB_AUTH_TOKEN = typeof window !== 'undefined'
  ? import.meta.env?.NOCODB_AUTH_TOKEN
  : process.env?.NOCODB_AUTH_TOKEN;

// Base headers for API requests - updated for v2 API
const headers = {
  'xc-token': NOCODB_AUTH_TOKEN,
  'Content-Type': 'application/json'
};

if (typeof window === 'undefined') {
  console.log('NOCODB_API_URL:', NOCODB_API_URL);
  console.log('NOCODB_AUTH_TOKEN:', NOCODB_AUTH_TOKEN ? '****' : 'Not Set');
}

// Table mapping to handle NocoDB naming conventions
const TABLES = {
  directories: 'm823s0ww0l4mekb',
  listings: 'mvy1lrp2wr35vo0',
  landingPages: 'mbrnluso1gxfwd4'
};

// Field mappings from NocoDB convention to JavaScript convention
const FIELD_MAPPINGS = {
  // Common fields
  'Id': 'autoId',
  'Identifier': 'id',
  
  // Directories table
  'Name': 'name',
  'Description': 'description',
  'Domain': 'domain',
  'Theme': 'theme',
  'Available Layouts': 'availableLayouts',
  'Default Layout': 'defaultLayout',
  'Primary_Color': 'primaryColor',
  'Secondary_Color': 'secondaryColor',
  'Logo': 'logo',
  'Categories': 'categories',
  'Meta_Tags': 'metaTags',
  'Social_Links': 'socialLinks',
  'Deployment': 'deployment',
  'URL Pattern': 'urlPattern',
  'URL Segments': 'urlSegments',
  
  // Listings table
  'Title': 'title',
  'Content': 'content',
  'Slug': 'slug',
  'Directory Identifier': 'directory',
  'Category': 'category',
  'Featured': 'featured',
  'Images': 'images',
  'Tags': 'tags',
  'Fields': 'fields',
  'CreatedAt': 'createdAt',
  'UpdatedAt': 'updatedAt',
  'Location Data': 'locationData',
  'Category Slug': 'categorySlug',
  'Full Path': 'fullPath',
  
  // Landing Pages table
  'Featured_Image': 'featuredImage',
  'Keywords': 'keywords',
  'Related_Categories': 'relatedCategories'
};

// Reverse mapping for queries (JavaScript to NocoDB)
const REVERSE_FIELD_MAPPINGS = Object.entries(FIELD_MAPPINGS)
  .reduce((map, [key, value]) => {
    map[value] = key;
    return map;
  }, {});

/**
 * Helper function for safely parsing JSON with a fallback value
 */
function safeParseJSON(jsonString, fallback) {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`Error parsing JSON: ${error}`);
    return fallback;
  }
}

/**
 * Convert markdown to HTML
 */
async function renderMarkdown(markdown) {
  if (!markdown) return () => '';
  
  try {
    const { marked } = await import('marked');
    const html = marked(markdown);
    return () => html;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return () => `<p>Error rendering content</p>`;
  }
}

/**
 * Map fields from NocoDB naming to JavaScript naming
 */
function mapNocoDbToJs(data) {
  if (!data) return null;
  
  const result = {};
  
  Object.entries(data).forEach(([key, value]) => {
    const jsKey = FIELD_MAPPINGS[key] || key;
    result[jsKey] = value;
  });
  
  return result;
}

/**
 * Map a query field from JavaScript naming to NocoDB naming
 */
function mapJsFieldToNocoDb(field) {
  return REVERSE_FIELD_MAPPINGS[field] || field;
}

/**
 * Map query conditions from JavaScript naming to NocoDB naming for v2 API
 */
function mapQueryConditions(conditions) {
  if (!conditions) return null;
  
  // Handle simple conditions
  if (typeof conditions === 'object' && !conditions._or && !conditions._and) {
    const formattedConditions = Object.entries(conditions).map(([key, value]) => {
      const nocoKey = mapJsFieldToNocoDb(key);
      
      if (typeof value === 'object' && value !== null) {
        const op = Object.keys(value)[0];
        return `(${nocoKey},${op},${value[op]})`;
      } else {
        return `(${nocoKey},eq,${value})`;
      }
    });
    
    return formattedConditions.join('~and');
  }
  
  // Handle logical operators
  let result = '';
  
  if (conditions._and) {
    const andConditions = conditions._and.map(cond => mapQueryConditions(cond));
    result = andConditions.join('~and');
  } else if (conditions._or) {
    const orConditions = conditions._or.map(cond => mapQueryConditions(cond));
    result = orConditions.join('~or');
  }
  
  return result;
}

/**
 * Sanitize search query to prevent SQL injection
 */
function sanitizeSearchQuery(query) {
  if (!query) return '';
  
  let sanitized = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
  sanitized = sanitized.replace(/['";]/g, '');
  
  return sanitized;
}

/**
 * Enhanced fetchFromNocoDB with pagination support
 */
async function fetchFromNocoDB(endpoint, params = {}, ttl = cacheTTL.directories, fetchAll = false) {
  const queryParams = {};
  
  if (params.where) {
    queryParams.where = mapQueryConditions(params.where);
  }
  
  ['fields', 'sort', 'offset', 'limit'].forEach(param => {
    if (params[param]) {
      queryParams[param] = params[param];
    }
  });
  
  if (!queryParams.limit && !fetchAll) {
    queryParams.limit = 100;
  }
  
  const queryString = Object.keys(queryParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(typeof queryParams[key] === 'object' ? JSON.stringify(queryParams[key]) : queryParams[key])}`)
    .join('&');
  
  const url = `${NOCODB_API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  try {
    const fetchOptions = { headers, agent: false };
    const response = await cachedFetch(url, fetchOptions, ttl);
    
    // Handle pagination if fetchAll is true
    if (fetchAll && response.pageInfo && response.pageInfo.hasNextPage) {
      const allResults = [...response.list];
      let currentPage = 1;
      
      while (response.pageInfo.hasNextPage && currentPage < 10) {
        const nextOffset = currentPage * (queryParams.limit || 100);
        const nextPageParams = { ...queryParams, offset: nextOffset };
        
        const nextPageQueryString = Object.keys(nextPageParams)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(typeof nextPageParams[key] === 'object' ? JSON.stringify(nextPageParams[key]) : nextPageParams[key])}`)
          .join('&');
        
        const nextPageUrl = `${NOCODB_API_URL}${endpoint}?${nextPageQueryString}`;
        const nextPageResponse = await cachedFetch(nextPageUrl, fetchOptions, ttl);
        
        if (nextPageResponse.list && nextPageResponse.list.length > 0) {
          allResults.push(...nextPageResponse.list);
          currentPage++;
          
          if (!nextPageResponse.pageInfo.hasNextPage) {
            break;
          }
        } else {
          break;
        }
      }
      
      return {
        list: allResults.map(mapNocoDbToJs),
        pageInfo: { ...response.pageInfo, isLastPage: true }
      };
    }
    
    if (response.list && Array.isArray(response.list)) {
      return {
        list: response.list.map(mapNocoDbToJs),
        pageInfo: response.pageInfo
      };
    }
    
    if (response && typeof response === 'object') {
      return mapNocoDbToJs(response);
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching from NocoDB:', error);
    throw error;
  }
}
// src/lib/nocodb.js - Updated sections for URL pattern support

// Add to existing imports and setup...

/**
 * Get listings by custom filter
 * @param {object} filters - Filter object with field names and values
 * @returns {Promise<Array>} Array of listings matching the filters
 */
export async function getListingsByFilter(filters) {
  // Build where conditions from filters
  const whereConditions = {
    _and: []
  };
  
  // Handle directory filter
  if (filters.directory) {
    whereConditions._and.push({ directory: { eq: filters.directory } });
  }
  
  // Handle category filter
  if (filters.category) {
    whereConditions._and.push({ category: { eq: filters.category } });
  }
  
  // Handle category_slug filter
  if (filters.category_slug) {
    whereConditions._and.push({ category_slug: { eq: filters.category_slug } });
  }
  
  // Handle full_path filter
  if (filters.full_path) {
    whereConditions._and.push({ full_path: { eq: filters.full_path } });
  }
  
  // Handle location filters (nested JSON fields)
  if (filters['location_data.city']) {
    // For JSON fields, we'll need to do client-side filtering
    // as NocoDB doesn't support deep JSON queries well
  }
  
  // If no conditions, return empty array
  if (whereConditions._and.length === 0) {
    return [];
  }
  
  // Fetch listings with basic filters
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: whereConditions._and.length === 1 ? whereConditions._and[0] : whereConditions
  }, cacheTTL.listings);
  
  let listings = await Promise.all(response.list.map(transformListing));
  
  // Apply client-side filters for JSON fields
  if (filters['location_data.city']) {
    listings = listings.filter(listing => 
      listing.data.location_data?.city === filters['location_data.city']
    );
  }
  
  if (filters['location_data.district']) {
    listings = listings.filter(listing => 
      listing.data.location_data?.district === filters['location_data.district']
    );
  }
  
  return listings;
}

/**
 * Transform directory data from NocoDB to expected format
 * Updated to include URL pattern fields
 */
function transformDirectory(directory) {
  // Handle URL Pattern - remove extra quotes if present
  let urlPattern = directory.url_pattern || directory['URL Pattern'] || directory.urlPattern || '{slug}';
  if (typeof urlPattern === 'string' && urlPattern.startsWith('"') && urlPattern.endsWith('"')) {
    urlPattern = urlPattern.slice(1, -1); // Remove outer quotes
  }
  
  // Handle available layouts - could be string or array
  let availableLayouts = directory.availableLayouts || directory['Available Layouts'] || 'Card';
  if (typeof availableLayouts === 'string') {
    availableLayouts = availableLayouts.split(',').map(l => l.trim());
  }
  
  return {
    id: directory.id || directory.Identifier || directory.identifier,
    data: {
      name: directory.name || directory.Name,
      description: directory.description || directory.Description,
      domain: directory.domain || directory.Domain,
      theme: directory.theme || directory.Theme || 'default',
      availableLayouts: availableLayouts,
      defaultLayout: directory.defaultLayout || directory['Default Layout'] || 'Card',
      primaryColor: directory.primaryColor || directory['Primary Color'],
      secondaryColor: directory.secondaryColor || directory['Secondary Color'],
      logo: directory.logo || directory.Logo,
      categories: safeParseJSON(directory.categories || directory.Categories, []),
      metaTags: safeParseJSON(directory.metaTags || directory['Meta Tags'], {}),
      socialLinks: safeParseJSON(directory.socialLinks || directory['Social Links'], []),
      deployment: safeParseJSON(directory.deployment || directory.Deployment, {}),
      // New URL pattern fields
      url_pattern: urlPattern,
      url_segments: safeParseJSON(directory.url_segments || directory['URL Segments'] || directory.urlSegments, {})
    }
  };
}

/**
 * Transform listing data from NocoDB to expected format
 * Updated to include location data and full path
 */
async function transformListing(listing) {
  const renderedContent = await renderMarkdown(listing.content);
  
  // Generate full path if not present
  let fullPath = listing.full_path || listing.fullPath;
  if (!fullPath) {
    // Try to generate full path based on directory URL pattern
    try {
      const directory = await getDirectory(listing.directory);
      if (directory && directory.data.url_pattern && directory.data.url_pattern !== '{slug}') {
        const { generateUrlFromPattern } = await import('../utils/url-pattern.js');
        fullPath = generateUrlFromPattern(
          directory.data.url_pattern,
          directory.data.url_segments || {},
          listing
        );
      } else {
        // Fallback to slug
        fullPath = listing.slug;
      }
    } catch (error) {
      console.warn(`Error generating full path for listing ${listing.slug}:`, error);
      fullPath = listing.slug;
    }
  }
  
  return {
    slug: listing.slug || listing.Slug, // Keep original slug
    data: {
      title: listing.title || listing.Title,
      description: listing.description || listing.Description,
      directory: listing.directory || listing['Directory Identifier'],
      category: listing.category || listing.Category,
      category_slug: listing.category_slug || listing['Category Slug'] || listing.categorySlug || slugify((listing.category || listing.Category) || ''),
      featured: (listing.featured === 1 || listing.featured === true) || (listing.Featured === 1 || listing.Featured === true),
      images: safeParseJSON(listing.images || listing.Images, []),
      tags: safeParseJSON(listing.tags || listing.Tags, []),
      fields: safeParseJSON(listing.fields || listing.Fields, {}),
      // New fields for URL patterns
      location_data: safeParseJSON(listing.location_data || listing['Location Data'] || listing.locationData, {}),
      full_path: fullPath,
      fullPath: fullPath, // Also add as fullPath for compatibility
      updatedAt: listing.updatedAt || listing.UpdatedAt
    },
    render: () => ({ Content: renderedContent() })
  };
}

/**
 * Create or update a listing with full path generation
 * @param {string} directoryId - The directory ID
 * @param {object} listingData - The listing data
 * @returns {Promise<object>} The created/updated listing
 */
export async function createOrUpdateListing(directoryId, listingData) {
  // Get directory config to access URL pattern
  const directory = await getDirectory(directoryId);
  if (!directory) {
    throw new Error(`Directory ${directoryId} not found`);
  }
  
  const pattern = directory.data.url_pattern || '{slug}';
  const segmentConfig = directory.data.url_segments || {};
  
  // Generate full path if not provided
  if (!listingData.full_path && pattern !== '{slug}') {
    const { generateUrlFromPattern } = await import('../utils/url-pattern.js');
    listingData.full_path = generateUrlFromPattern(pattern, segmentConfig, listingData);
  }
  
  // Ensure slug is clean
  if (!listingData.slug) {
    listingData.slug = slugify(listingData.title, { lower: true, strict: true });
  }
  
  // Prepare data for NocoDB
  const nocdbData = {
    title: listingData.title,
    description: listingData.description,
    content: listingData.content || '',
    slug: listingData.slug,
    directory: directoryId,
    category: listingData.category,
    category_slug: listingData.category_slug || slugify(listingData.category || ''),
    featured: listingData.featured || false,
    images: JSON.stringify(listingData.images || []),
    tags: JSON.stringify(listingData.tags || []),
    fields: JSON.stringify(listingData.fields || {}),
    location_data: JSON.stringify(listingData.location_data || {}),
    full_path: listingData.full_path
  };
  
  // Check if listing exists
  const existingListings = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: {
      _and: [
        { directory: { eq: directoryId } },
        { slug: { eq: listingData.slug } }
      ]
    }
  });
  
  let response;
  if (existingListings.list.length > 0) {
    // Update existing listing
    const listingId = existingListings.list[0].Id;
    response = await fetch(`${NOCODB_API_URL}/tables/${TABLES.listings}/records`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        Id: listingId,
        ...nocdbData
      })
    });
  } else {
    // Create new listing
    response = await fetch(`${NOCODB_API_URL}/tables/${TABLES.listings}/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(nocdbData)
    });
  }
  
  if (!response.ok) {
    throw new Error(`Failed to save listing: ${response.statusText}`);
  }
  
  const savedListing = await response.json();
  return transformListing(savedListing);
}

/**
 * Batch create/update listings
 * @param {string} directoryId - The directory ID
 * @param {Array} listings - Array of listing data
 * @returns {Promise<Array>} Array of created/updated listings
 */
export async function batchCreateOrUpdateListings(directoryId, listings) {
  const results = [];
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(listing => createOrUpdateListing(directoryId, listing))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Helper function to slugify text
 */
function slugify(text, options = {}) {
  const defaults = {
    lower: true,
    strict: true,
    locale: 'en'
  };
  
  const opts = { ...defaults, ...options };
  
  let slug = text
    .toString()
    .normalize('NFD') // Normalize unicode
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove multiple hyphens
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens
  
  return slug;
}

/**
 * Transform landing page data from NocoDB to expected format
 */
async function transformLandingPage(page) {
  const renderedContent = await renderMarkdown(page.content);
  
  return {
    slug: `${page.directory}/${page.slug}`,
    data: {
      title: page.title,
      description: page.description,
      directory: page.directory,
      featuredImage: page.featuredImage,
      keywords: safeParseJSON(page.keywords, []),
      relatedCategories: safeParseJSON(page.relatedCategories, []),
      updatedAt: page.updatedAt
    },
    render: () => ({ Content: renderedContent() })
  };
}

/**
 * Fetch and transform multiple listings
 */
async function fetchListings(whereConditions, ttl = cacheTTL.listings, fetchAll = true) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: whereConditions
  }, ttl, fetchAll);
  
  return Promise.all(response.list.map(transformListing));
}

/**
 * Fetch and transform a single listing
 */
async function fetchSingleListing(whereConditions, ttl = cacheTTL.listings) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: whereConditions,
    limit: 1
  }, ttl);
  
  if (!response.list || response.list.length === 0) {
    return null;
  }
  
  return transformListing(response.list[0]);
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Get all directory configurations
 */
export async function getDirectories() {
  if (process.env.BUILD_MODE === 'single') {
    const currentDirId = process.env.CURRENT_DIRECTORY;
    if (!currentDirId) {
      console.error('getDirectories: CURRENT_DIRECTORY is not set in single directory mode');
      return [];
    }
    
    console.log(`Single directory mode: Only fetching directory ${currentDirId}`);
    
    try {
      const response = await fetchFromNocoDB(`/tables/${TABLES.directories}/records`, {
        where: { id: { eq: currentDirId } },
        limit: 1
      }, cacheTTL.directories);
      
      if (!response.list || response.list.length === 0) {
        return [];
      }
      
      return [transformDirectory(response.list[0])];
    } catch (error) {
      console.error(`Error fetching directory ${currentDirId}:`, error);
      return [];
    }
  }
  
  const response = await fetchFromNocoDB(`/tables/${TABLES.directories}/records`, {}, cacheTTL.directories);
  return response.list.map(transformDirectory);
}

/**
 * Get a specific directory configuration by ID
 */
export async function getDirectory(id) {
  try {
    const response = await fetchFromNocoDB(`/tables/${TABLES.directories}/records`, {
      where: { Identifier: { eq: id } },
      limit: 1
    }, cacheTTL.directories);
    
    if (!response.list || response.list.length === 0) {
      return null;
    }
    
    return transformDirectory(response.list[0]);
  } catch (error) {
    console.error(`Error fetching directory ${id}:`, error);
    return null;
  }
}

/**
 * Update a directory configuration
 * @param {string} id - Directory ID
 * @param {object} directoryData - Directory data to update
 * @returns {Promise<object>} Updated directory
 */
export async function updateDirectory(id, directoryData) {
  if (!id) {
    throw new Error('Directory ID is required');
  }
  
  try {
    // First, get the existing directory to get its database ID
    const existingDirectory = await fetchFromNocoDB(`/tables/${TABLES.directories}/records`, {
      where: { Identifier: { eq: id } },
      limit: 1
    }, cacheTTL.directories);
    
    if (!existingDirectory || !existingDirectory.list || existingDirectory.list.length === 0) {
      throw new Error(`Directory not found: ${id}`);
    }
    
    const dbId = existingDirectory.list[0].Id;
    
    // Prepare the update data
    const updateData = {
      Id: dbId,
      Name: directoryData.name,
      Description: directoryData.description,
      Domain: directoryData.domain,
      Theme: directoryData.theme,
      'Available Layouts': Array.isArray(directoryData.availableLayouts) 
        ? directoryData.availableLayouts.join(',') 
        : directoryData.availableLayouts,
      'Default Layout': directoryData.defaultLayout,
      'Primary_Color': directoryData.primaryColor,
      'Secondary_Color': directoryData.secondaryColor,
      Logo: directoryData.logo,
      Categories: JSON.stringify(directoryData.categories || []),
      'Meta_Tags': JSON.stringify(directoryData.metaTags || {}),
      'Social_Links': JSON.stringify(directoryData.socialLinks || []),
      Deployment: JSON.stringify(directoryData.deployment || {}),
      'URL Pattern': directoryData.url_pattern,
      'URL Segments': JSON.stringify(directoryData.url_segments || {})
    };
    
    // Update the directory using the specific record ID
    const response = await fetch(`${NOCODB_API_URL}/tables/${TABLES.directories}/records/${dbId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update directory: ${response.statusText}`);
    }
    
    const updatedDirectory = await response.json();
    
    // Clear cache for directories
    clearCache('directories');
    
    return transformDirectory(updatedDirectory);
  } catch (error) {
    console.error(`Error updating directory ${id}:`, error);
    throw error;
  }
}

/**
 * Get all listings for a specific directory
 */
export async function getListings(directoryId, fetchAll = true) {
  return fetchListings({ directory: { eq: directoryId } }, cacheTTL.listings, fetchAll);
}

/**
 * Get a specific listing by directory and slug
 */
export async function getListing(directoryId, slug) {
  return fetchSingleListing({
    directory: { eq: directoryId },
    slug: { eq: slug }
  }, cacheTTL.listings);
}

/**
 * Get listings for a specific category
 */
export async function getCategoryListings(directoryId, categoryId) {
  return fetchListings({
    directory: { eq: directoryId },
    category: { eq: categoryId }
  }, cacheTTL.categories);
}

/**
 * Search listings in a directory
 */
export async function searchListings(directoryId, query) {
  if (!query || query.trim() === '') {
    return [];
  }
  
  const sanitizedQuery = sanitizeSearchQuery(query.trim());
  
  const whereConditions = {
    _and: [
      { directory: { eq: directoryId } },
      { 
        _or: [
          { title: { like: `%${sanitizedQuery}%` } },
          { description: { like: `%${sanitizedQuery}%` } },
          { content: { like: `%${sanitizedQuery}%` } }
        ]
      }
    ]
  };
  
  const allResults = await fetchListings(whereConditions, cacheTTL.search, false);
  
  // Additional client-side filtering for JSON fields like tags
  return allResults.filter(result => {
    const tagsMatch = result.data.tags.some(tag => 
      tag.toLowerCase().includes(sanitizedQuery.toLowerCase())
    );
    return true; // Include SQL matches or tag matches
  });
}

/**
 * Get all landing pages for a specific directory
 */
export async function getLandingPages(directoryId) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.landingPages}/records`, {
    where: { directory: { eq: directoryId } }
  }, cacheTTL.landingPages);
  
  return Promise.all(response.list.map(transformLandingPage));
}

/**
 * Get featured listings for a directory
 */
export async function getFeaturedListings(directoryId, limit = 6) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: {
      directory: { eq: directoryId },
      featured: { eq: 1 }
    },
    limit
  }, cacheTTL.listings);
  
  return Promise.all(response.list.map(transformListing));
}

/**
 * Get recent listings for a directory
 */
export async function getRecentListings(directoryId, limit = 4) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: { directory: { eq: directoryId } },
    sort: '-UpdatedAt',
    limit
  }, cacheTTL.listings);
  
  return Promise.all(response.list.map(transformListing));
}

/**
 * Get related listings for a specific listing
 */
export async function getRelatedListings(directoryId, listing, limit = 3) {
  try {
    const allListings = await getListings(directoryId);
    const otherListings = allListings.filter(item => item.slug !== listing.slug);
    
    const scoredListings = otherListings.map(item => {
      let score = 0;
      
      if (item.data.category === listing.data.category) {
        score += 5;
      }
      
      if (item.data.tags && listing.data.tags) {
        const matchingTags = item.data.tags.filter(tag => 
          listing.data.tags.includes(tag)
        );
        score += matchingTags.length * 2;
      }
      
      return { listing: item, score };
    });
    
    return scoredListings
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.listing);
  } catch (error) {
    console.error(`Error getting related listings for ${directoryId}:`, error);
    return [];
  }
}

/**
 * Cache invalidation for webhook-based updates
 */
export function clearCache(type, directoryId) {
  if (typeof globalThis.__memoryCache !== 'undefined') {
    if (type && directoryId) {
      const tableName = TABLES[type] || type;
      const cachePattern = new RegExp(`/tables/${tableName}/.*${directoryId}`);
      
      Object.keys(globalThis.__memoryCache.cache).forEach(key => {
        if (cachePattern.test(key)) {
          globalThis.__memoryCache.delete(key);
        }
      });
      
      console.log(`Cleared cache for ${type} in directory ${directoryId}`);
    } else if (type) {
      const tableName = TABLES[type] || type;
      const cachePattern = new RegExp(`/tables/${tableName}/`);
      
      Object.keys(globalThis.__memoryCache.cache).forEach(key => {
        if (cachePattern.test(key)) {
          globalThis.__memoryCache.delete(key);
        }
      });
      
      console.log(`Cleared all ${type} caches`);
    } else {
      globalThis.__memoryCache.clear();
      console.log('Cleared all caches');
    }
  }
}
