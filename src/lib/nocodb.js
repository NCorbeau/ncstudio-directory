/**
 * NocoDB v2 API client for fetching data with caching
 * Handles field mapping between NocoDB conventions and JavaScript conventions
 */
import { cachedFetch, cacheTTL } from './cache.js';

// NocoDB API configuration - Browser-safe environment variable access
const NOCODB_API_URL = import.meta.env?.NOCODB_API_URL || 'https://nocodb.ncstudio.click/api/v2';
const NOCODB_AUTH_TOKEN = import.meta.env?.NOCODB_AUTH_TOKEN || '';

// Base headers for API requests - updated for v2 API
const headers = {
  'xc-token': NOCODB_AUTH_TOKEN,
  'Content-Type': 'application/json'
};

// Log only in development mode
if (import.meta.env.DEV) {
  console.log('NOCODB_API_URL:', NOCODB_API_URL);
  console.log('NOCODB_AUTH_TOKEN:', NOCODB_AUTH_TOKEN ? '****' : 'Not Set'); // Hide token in logs
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
  'Id': 'autoId', // Mapping the auto-increment ID to a different name to avoid confusion
  'Identifier': 'id', // Map Identifier to id in our code
  
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
  'Address': 'address',
  'Website': 'website',
  'Phone': 'phone',
  'Rating': 'rating',
  'Tags': 'tags',
  'Opening_Hours': 'openingHours',
  'Custom_Fields': 'customFields',
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
 * Map fields from NocoDB naming to JavaScript naming
 * @param {object} data - Data from NocoDB
 * @returns {object} - Data with JavaScript naming
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
 * @param {string} field - Field name in JavaScript naming
 * @returns {string} - Field name in NocoDB naming
 */
function mapJsFieldToNocoDb(field) {
  return REVERSE_FIELD_MAPPINGS[field] || field;
}

/**
 * Map query conditions from JavaScript naming to NocoDB naming for v2 API
 * @param {object} conditions - Query conditions with JavaScript naming
 * @returns {string} - Query conditions formatted for NocoDB v2 API
 */
function mapQueryConditions(conditions) {
  if (!conditions) return null;
  
  // Handle simple conditions
  if (typeof conditions === 'object' && !conditions._or && !conditions._and) {
    // Format for v2 API: (field,eq,value)
    const formattedConditions = Object.entries(conditions).map(([key, value]) => {
      const nocoKey = mapJsFieldToNocoDb(key);
      
      if (typeof value === 'object' && value !== null) {
        // Handle operators like eq, neq, like, etc.
        const op = Object.keys(value)[0];
        return `(${nocoKey},${op},${value[op]})`;
      } else {
        // Handle direct value (assume equality)
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
 * Helper function for safely parsing JSON with a fallback value
 * @param {string} jsonString - JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} - Parsed object or fallback value
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
 * Sanitize search query to prevent SQL injection
 * @param {string} query - Raw search query
 * @returns {string} - Sanitized query
 */
function sanitizeSearchQuery(query) {
  if (!query) return '';
  
  // Basic sanitization to remove SQL injection risks
  // Escape % and _ which are SQL wildcards
  let sanitized = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
  
  // Remove any potentially harmful characters
  sanitized = sanitized.replace(/['";]/g, '');
  
  return sanitized;
}

/**
 * Enhanced fetchFromNocoDB with pagination support
 * @param {string} endpoint - API endpoint
 * @param {object} params - Query parameters
 * @param {number} ttl - Time to live in seconds
 * @param {boolean} fetchAll - Whether to fetch all pages (use with caution)
 * @returns {Promise<any>} - Response data
 */
async function fetchFromNocoDB(endpoint, params = {}, ttl = cacheTTL.directories, fetchAll = false) {
  // Format query parameters for v2 API
  const queryParams = {};
  
  // Map 'where' conditions if present to v2 format
  if (params.where) {
    queryParams.where = mapQueryConditions(params.where);
  }
  
  // Handle other parameters with direct mapping
  ['fields', 'sort', 'offset', 'limit'].forEach(param => {
    if (params[param]) {
      queryParams[param] = params[param];
    }
  });
  
  // Set default limit if not provided and not fetching all
  if (!queryParams.limit && !fetchAll) {
    queryParams.limit = 100; // Set a reasonable default
  }
  
  // Build query string
  const queryString = Object.keys(queryParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(typeof queryParams[key] === 'object' ? JSON.stringify(queryParams[key]) : queryParams[key])}`)
    .join('&');
  
  const url = `${NOCODB_API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  try {
    // Add agent: false to prevent connection hanging
    const fetchOptions = { 
      headers, 
      agent: false // This prevents connection hanging by using a new agent for each request 
    };
    
    const response = await cachedFetch(url, fetchOptions, ttl);
    
    // Handle pagination if fetchAll is true
    if (fetchAll && response.pageInfo && response.pageInfo.hasNextPage) {
      const allResults = [...response.list];
      let currentPage = 1;
      
      // Fetch additional pages
      while (response.pageInfo.hasNextPage && currentPage < 10) { // Safety limit to avoid infinite loops
        const nextOffset = currentPage * (queryParams.limit || 100);
        const nextPageParams = {
          ...queryParams,
          offset: nextOffset
        };
        
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
      
      // Return combined results
      return {
        list: allResults.map(mapNocoDbToJs),
        pageInfo: {
          ...response.pageInfo,
          isLastPage: true
        }
      };
    }
    
    // Handle list response (map each item)
    if (response.list && Array.isArray(response.list)) {
      return {
        list: response.list.map(mapNocoDbToJs),
        pageInfo: response.pageInfo
      };
    }
    
    // Handle single object response
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
 * Get all directory configurations
 * @returns {Promise<Array>} - Array of directory configurations
 */
export async function getDirectories() {
  const response = await fetchFromNocoDB(`/tables/${TABLES.directories}/records`, {}, cacheTTL.directories);
  
  // Transform the response to match the expected format
  return response.list.map(directory => ({
    id: directory.id, // This is now from Identifier field
    data: {
      name: directory.name,
      description: directory.description,
      domain: directory.domain,
      theme: directory.theme || 'default',
      availableLayouts: directory.availableLayouts.split(','),
      defaultLayout: directory.defaultLayout || 'Card',
      primaryColor: directory.primaryColor || '#3366cc',
      secondaryColor: directory.secondaryColor,
      logo: directory.logo,
      categories: safeParseJSON(directory.categories, []),
      metaTags: safeParseJSON(directory.metaTags, {}),
      socialLinks: safeParseJSON(directory.socialLinks, []),
      deployment: safeParseJSON(directory.deployment, {})
    }
  }));
}

/**
 * Get a specific directory configuration by ID
 * @param {string} id - Directory ID (Identifier in NocoDB)
 * @returns {Promise<object|null>} - Directory configuration or null if not found
 */
export async function getDirectory(id) {
  try {
    // In v2 API, use the specific recordId endpoint
    const response = await fetchFromNocoDB(`/tables/${TABLES.directories}/records`, {
      where: {
        // Use Identifier column instead of Id
        id: { eq: id }
      },
      limit: 1
    }, cacheTTL.directories);
    
    // If no results, return null
    if (!response.list || response.list.length === 0) {
      return null;
    }
    
    const directory = response.list[0];
    
    // Transform to expected format
    return {
      id: directory.id,
      data: {
        id: directory.id,
        name: directory.name,
        description: directory.description,
        domain: directory.domain,
        theme: directory.theme || 'default',
        availableLayouts: directory.availableLayouts.split(','),
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
  } catch (error) {
    console.error(`Error fetching directory ${id}:`, error);
    return null;
  }
}

/**
 * Get all listings for a specific directory
 * @param {string} directoryId - Directory ID
 * @param {boolean} fetchAll - Whether to fetch all pages (default: true)
 * @returns {Promise<Array>} - Array of listings
 */
export async function getListings(directoryId, fetchAll = true) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: {
      directory: { eq: directoryId }
    }
  }, cacheTTL.listings, fetchAll);
  
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
        images: safeParseJSON(listing.images, []),
        address: listing.address,
        website: listing.website,
        phone: listing.phone,
        rating: listing.rating,
        tags: safeParseJSON(listing.tags, []),
        openingHours: safeParseJSON(listing.openingHours, []),
        customFields: safeParseJSON(listing.customFields, {}),
        updatedAt: listing.updatedAt
      },
      // Add a render function that returns the pre-rendered content
      render: () => ({ Content: renderedContent })
    };
  }));
}

/**
 * Get a specific listing by directory and slug
 * @param {string} directoryId - Directory ID
 * @param {string} slug - Listing slug
 * @returns {Promise<object|null>} - Listing data or null if not found
 */
export async function getListing(directoryId, slug) {
  try {
    const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
      where: {
        directory: { eq: directoryId },
        slug: { eq: slug }
      },
      limit: 1
    }, cacheTTL.listings);
    
    // If no results, return null
    if (!response.list || response.list.length === 0) {
      return null;
    }
    
    const listing = response.list[0];
    
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
        images: safeParseJSON(listing.images, []),
        address: listing.address,
        website: listing.website,
        phone: listing.phone,
        rating: listing.rating,
        tags: safeParseJSON(listing.tags, []),
        openingHours: safeParseJSON(listing.openingHours, []),
        customFields: safeParseJSON(listing.customFields, {}),
        updatedAt: listing.updatedAt
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
 * Get listings for a specific category
 * @param {string} directoryId - Directory ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Array>} - Array of listings for the category
 */
export async function getCategoryListings(directoryId, categoryId) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: {
      directory: { eq: directoryId },
      category: { eq: categoryId }
    }
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
        images: safeParseJSON(listing.images, []),
        address: listing.address,
        website: listing.website,
        phone: listing.phone,
        rating: listing.rating,
        tags: safeParseJSON(listing.tags, []),
        openingHours: safeParseJSON(listing.openingHours, []),
        customFields: safeParseJSON(listing.customFields, {}),
        updatedAt: listing.updatedAt
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
  if (!query || query.trim() === '') {
    return [];
  }
  
  // Sanitize the search query
  const sanitizedQuery = sanitizeSearchQuery(query.trim());
  
  // Use object format with logical operators for complex queries
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: {
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
    }
  }, cacheTTL.search);
  
  // For JSON fields like tags, we need to filter client-side
  const allResults = await Promise.all(response.list.map(async listing => {
    // Convert markdown content to HTML
    const renderedContent = await renderMarkdown(listing.content);
    
    // Parse JSON fields
    const tags = safeParseJSON(listing.tags, []);
    
    // Additional client-side filtering for JSON fields
    const tagsMatch = tags.some(tag => 
      tag.toLowerCase().includes(sanitizedQuery.toLowerCase())
    );
    
    // Include if it matched the SQL query or tags match
    return {
      matchesTags: tagsMatch,
      listing: {
        slug: `${listing.directory}/${listing.slug}`,
        data: {
          title: listing.title,
          description: listing.description,
          directory: listing.directory,
          category: listing.category,
          featured: listing.featured === 1 || listing.featured === true,
          images: safeParseJSON(listing.images, []),
          address: listing.address,
          website: listing.website,
          phone: listing.phone,
          rating: listing.rating,
          tags: tags,
          openingHours: safeParseJSON(listing.openingHours, []),
          customFields: safeParseJSON(listing.customFields, {}),
          updatedAt: listing.updatedAt
        },
        render: () => ({ Content: renderedContent })
      }
    };
  }));
  
  // Return all matches (from SQL or client-side filtering)
  return allResults
    .filter(result => result.matchesTags || true) // Include SQL matches or tag matches
    .map(result => result.listing);
}

/**
 * Get all landing pages for a specific directory
 * @param {string} directoryId - Directory ID
 * @returns {Promise<Array>} - Array of landing pages
 */
export async function getLandingPages(directoryId) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.landingPages}/records`, {
    where: {
      directory: { eq: directoryId }
    }
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
        keywords: safeParseJSON(page.keywords, []),
        relatedCategories: safeParseJSON(page.relatedCategories, []),
        updatedAt: page.updatedAt
      },
      // Add a render function that returns the pre-rendered content
      render: () => ({ Content: renderedContent })
    };
  }));
}

/**
 * Get featured listings for a directory
 * @param {string} directoryId - Directory ID
 * @param {number} limit - Maximum number of listings to return
 * @returns {Promise<Array>} - Array of featured listings
 */
export async function getFeaturedListings(directoryId, limit = 6) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: {
      directory: { eq: directoryId },
      featured: { eq: 1 }
    },
    limit
  }, cacheTTL.listings);
  
  // Transform and limit results
  const listings = await Promise.all(response.list.map(async listing => {
    // Convert markdown content to HTML
    const renderedContent = await renderMarkdown(listing.content);
    
    return {
      slug: `${listing.directory}/${listing.slug}`,
      data: {
        title: listing.title,
        description: listing.description,
        directory: listing.directory,
        category: listing.category,
        featured: true,
        images: safeParseJSON(listing.images, []),
        address: listing.address,
        website: listing.website,
        phone: listing.phone,
        rating: listing.rating,
        tags: safeParseJSON(listing.tags, []),
        openingHours: safeParseJSON(listing.openingHours, []),
        customFields: safeParseJSON(listing.customFields, {}),
        updatedAt: listing.updatedAt
      },
      render: () => ({ Content: renderedContent })
    };
  }));
  
  return listings;
}

/**
 * Get recent listings for a directory
 * @param {string} directoryId - Directory ID
 * @param {number} limit - Maximum number of listings to return
 * @returns {Promise<Array>} - Array of recent listings
 */
export async function getRecentListings(directoryId, limit = 4) {
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: {
      directory: { eq: directoryId }
    },
    sort: '-UpdatedAt',
    limit
  }, cacheTTL.listings);
  
  // Transform results
  const listings = await Promise.all(response.list.map(async listing => {
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
        images: safeParseJSON(listing.images, []),
        address: listing.address,
        website: listing.website,
        phone: listing.phone,
        rating: listing.rating,
        tags: safeParseJSON(listing.tags, []),
        openingHours: safeParseJSON(listing.openingHours, []),
        customFields: safeParseJSON(listing.customFields, {}),
        updatedAt: listing.updatedAt
      },
      render: () => ({ Content: renderedContent })
    };
  }));
  
  return listings;
}

/**
 * Get related listings for a specific listing
 * @param {string} directoryId - Directory ID
 * @param {object} listing - The listing to find related items for
 * @param {number} limit - Maximum number of listings to return
 * @returns {Promise<Array>} - Array of related listings
 */
export async function getRelatedListings(directoryId, listing, limit = 3) {
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

/**
 * Cache invalidation for webhook-based updates
 * @param {string} [type] - Specific cache type to clear, or all if not specified
 * @param {string} [directoryId] - Specific directory to clear cache for
 */
export function clearCache(type, directoryId) {
  if (typeof globalThis.__memoryCache !== 'undefined') {
    // If a specific type and directory are requested
    if (type && directoryId) {
      const tableName = TABLES[type] || type;
      const cachePattern = new RegExp(`/tables/${tableName}/.*${directoryId}`);
      
      Object.keys(globalThis.__memoryCache.cache).forEach(key => {
        if (cachePattern.test(key)) {
          globalThis.__memoryCache.delete(key);
        }
      });
      
      console.log(`Cleared cache for ${type} in directory ${directoryId}`);
    }
    // If only a type is specified
    else if (type) {
      const tableName = TABLES[type] || type;
      const cachePattern = new RegExp(`/tables/${tableName}/`);
      
      Object.keys(globalThis.__memoryCache.cache).forEach(key => {
        if (cachePattern.test(key)) {
          globalThis.__memoryCache.delete(key);
        }
      });
      
      console.log(`Cleared all ${type} caches`);
    }
    // Clear all caches
    else {
      globalThis.__memoryCache.clear();
      console.log('Cleared all caches');
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
  
  try {
    // Import the markdown parser
    const { marked } = await import('marked');
    const html = marked(markdown);
    
    // Return a function that Astro can use to render HTML
    return () => html;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return () => `<p>Error rendering content</p>`;
  }
}