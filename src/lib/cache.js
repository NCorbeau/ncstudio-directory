/**
 * Simple in-memory cache with TTL (Time To Live) support
 * This helps reduce API calls to NocoDB during development and build
 */
class MemoryCache {
  constructor() {
    this.cache = {};
    this.ttls = {};
  }
  
  /**
   * Set a value in the cache with an optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {number} ttl - Time to live in seconds (0 = no expiration)
   */
  set(key, value, ttl = 60) {
    this.cache[key] = value;
    
    // Set expiration if TTL is provided
    if (ttl > 0) {
      const expiry = Date.now() + (ttl * 1000);
      this.ttls[key] = expiry;
      
      // Automatically clean up expired entry
      setTimeout(() => {
        if (this.ttls[key] <= Date.now()) {
          this.delete(key);
        }
      }, ttl * 1000);
    }
  }
  
  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    // Check if key exists and is not expired
    if (this.has(key)) {
      return this.cache[key];
    }
    
    return null;
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} - Whether the key exists and is valid
   */
  has(key) {
    // Check if key exists
    if (!(key in this.cache)) {
      return false;
    }
    
    // Check if key has an expiration and has expired
    if (key in this.ttls && this.ttls[key] <= Date.now()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a key from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    delete this.cache[key];
    delete this.ttls[key];
  }
  
  /**
   * Clear all entries from the cache
   */
  clear() {
    this.cache = {};
    this.ttls = {};
  }
}

/**
 * Function to create or retrieve global memory cache instance
 * @returns {MemoryCache} - Memory cache instance
 */
export function createMemoryCache() {
  // Use existing global cache if available (to persist during development)
  if (typeof globalThis.__memoryCache === 'undefined') {
    globalThis.__memoryCache = new MemoryCache();
  }
  
  return globalThis.__memoryCache;
}

/**
 * Cached fetch function with TTL support
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Fetched data
 */
export async function cachedFetch(url, options = {}, ttl = 60) {
  const cache = createMemoryCache();
  const cacheKey = `fetch:${url}:${JSON.stringify(options)}`;
  
  // Check if data is in cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  // Add agent: false to options if not explicitly set
  // This will prevent HTTP connections from hanging open
  if (!options.agent && typeof options.agent !== 'boolean') {
    options.agent = false;
  }
  
  // Fetch new data
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Store in cache
  cache.set(cacheKey, data, ttl);
  
  return data;
}

/**
 * Cache different types of content for different durations
 */
export const cacheTTL = {
  // Directory configurations rarely change
  directories: 3600, // 1 hour
  
  // Listings may be updated more frequently
  listings: 300,     // 5 minutes
  
  // Category listings may change as new items are added
  categories: 600,   // 10 minutes
  
  // Search results should be relatively fresh
  search: 60,        // 1 minute
  
  // Landing pages are typically static content
  landingPages: 3600 // 1 hour
};