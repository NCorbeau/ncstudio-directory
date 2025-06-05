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

/**
 * Transform directory data from NocoDB to expected format
 */
function transformDirectory(directory) {
  return {
    id: directory.id,
    data: {
      id: directory.id,
      name: directory.name,
      description: directory.description,
      domain: directory.domain,
      theme: directory.theme || 'default',
      availableLayouts: directory.availableLayouts?.split(',') || ['Card'],
      defaultLayout: directory.defaultLayout || 'Card',
      primaryColor: directory.primaryColor || '#3366cc',
      secondaryColor: directory.secondaryColor,
      logo: directory.logo,
      categories: safeParseJSON(directory.categories, []),
      metaTags: safeParseJSON(directory.metaTags, {}),
      socialLinks: safeParseJSON(directory.socialLinks, []),
      deployment: safeParseJSON(directory.deployment, {})
    }
  };
}

/**
 * Transform listing data from NocoDB to expected format
 */
async function transformListing(listing) {
  const renderedContent = await renderMarkdown(listing.content);
  
  return {
    slug: `${listing.directory}/${listing.slug}`,
    data: {
      title: listing.title,
      description: listing.description,
      directory: listing.directory,
      category: listing.category,
      featured: listing.featured === 1 || listing.featured === true,
      images: safeParseJSON(listing.images, []),
      tags: safeParseJSON(listing.tags, []),
      fields: safeParseJSON(listing.fields, {}),
      updatedAt: listing.updatedAt
    },
    render: () => ({ Content: renderedContent() })
  };
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
      where: { id: { eq: id } },
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