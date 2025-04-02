/**
 * NocoDB v2 API client for fetching data with caching
 * Handles field mapping between NocoDB conventions and JavaScript conventions
 */
import { cachedFetch, cacheTTL } from './cache.js';
import dotenv from 'dotenv';

dotenv.config();
// NocoDB API configuration
const NOCODB_API_URL = import.meta.env?.NOCODB_API_URL || process.env?.NOCODB_API_URL || 'https://nocodb.ncstudio.click/api/v2';
const NOCODB_AUTH_TOKEN = import.meta.env?.NOCODB_AUTH_TOKEN || process.env?.NOCODB_AUTH_TOKEN;

// Base headers for API requests - updated for v2 API
const headers = {
  'xc-token': NOCODB_AUTH_TOKEN,
  'Content-Type': 'application/json'
};

console.log('NOCODB_API_URL:', NOCODB_API_URL);
console.log('NOCODB_AUTH_TOKEN:', NOCODB_AUTH_TOKEN);

// Table mapping to handle NocoDB naming conventions
const TABLES = {
  directories: 'm823s0ww0l4mekb',
  listings: 'mbrnluso1gxfwd4',
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
  'Directory': 'directory',
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
  'Created_At': 'createdAt',
  'Updated_At': 'updatedAt',
  
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
 * Fetch data from NocoDB v2 API with caching
 * @param {string} endpoint - API endpoint
 * @param {object} params - Query parameters
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Response data
 */
async function fetchFromNocoDB(endpoint, params = {}, ttl = cacheTTL.directories) {
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
  
  // Build query string
  const queryString = Object.keys(queryParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(typeof queryParams[key] === 'object' ? JSON.stringify(queryParams[key]) : queryParams[key])}`)
    .join('&');
  
  const url = `${NOCODB_API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  try {
    const response = await cachedFetch(url, { headers }, ttl);
    
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
      primaryColor: directory.primaryColor || '#3366cc',
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
        name: directory.name,
        description: directory.description,
        domain: directory.domain,
        theme: directory.theme || 'default',
        primaryColor: directory.primaryColor || '#3366cc',
        secondaryColor: directory.secondaryColor,
        logo: directory.logo,
        categories: JSON.parse(directory.categories || '[]'),
        metaTags: JSON.parse(directory.metaTags || '{}'),
        socialLinks: JSON.parse(directory.socialLinks || '[]'),
        deployment: JSON.parse(directory.deployment || '{}')
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
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: {
      directory: { eq: directoryId }
    }
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
 * Get a specific listing by directory and slug
 * @param {string} directoryId - Directory ID
 * @param {string} slug - Listing slug
 * @returns {Promise<object|null>} - Listing data or null if not found
 */
export async function getListing(directoryId, slug) {
  try {
    const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
      where: `(Directory,eq,${directoryId})~and(Slug,eq,${slug})`,
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
    where: `(Directory,eq,${directoryId})~and(Category,eq,${categoryId})`
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
  if (!query || query.trim() === '') {
    return [];
  }
  
  // For NocoDB v2, we need to create a more complex query
  // This will search in title, description, and content
  const whereCondition = `(Directory,eq,${directoryId})~and((Title,like,%${query}%)~or(Description,like,%${query}%)~or(Content,like,%${query}%))`;
  
  const response = await fetchFromNocoDB(`/tables/${TABLES.listings}/records`, {
    where: whereCondition
  }, cacheTTL.search);
  
  // For JSON fields like tags, we need to filter client-side
  const allResults = await Promise.all(response.list.map(async listing => {
    // Convert markdown content to HTML
    const renderedContent = await renderMarkdown(listing.content);
    
    // Parse JSON fields
    const tags = JSON.parse(listing.tags || '[]');
    
    // Additional client-side filtering for JSON fields
    const tagsMatch = tags.some(tag => 
      tag.toLowerCase().includes(query.toLowerCase())
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
          images: JSON.parse(listing.images || '[]'),
          address: listing.address,
          website: listing.website,
          phone: listing.phone,
          rating: listing.rating,
          tags: tags,
          openingHours: JSON.parse(listing.openingHours || '[]'),
          customFields: JSON.parse(listing.customFields || '{}')
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
        keywords: JSON.parse(page.keywords || '[]'),
        relatedCategories: JSON.parse(page.relatedCategories || '[]')
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
    where: `(Directory,eq,${directoryId})~and(Featured,eq,1)`,
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
        images: JSON.parse(listing.images || '[]'),
        address: listing.address,
        website: listing.website,
        phone: listing.phone,
        rating: listing.rating,
        tags: JSON.parse(listing.tags || '[]'),
        openingHours: JSON.parse(listing.openingHours || '[]'),
        customFields: JSON.parse(listing.customFields || '{}')
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
    sort: '-Updated_At',
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
 * Force clear all caches - useful for webhook-based cache invalidation
 * @param {string} [type] - Specific cache type to clear, or all if not specified
 */
export function clearCache(type) {
  if (typeof globalThis.__memoryCache !== 'undefined') {
    // If a specific type is requested, only clear those caches
    if (type) {
      const tableName = TABLES[type] || type;
      const cachePattern = new RegExp(`/tables/${tableName}/`);
      
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
