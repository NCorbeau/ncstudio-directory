// src/utils/url-pattern.js
import slugify from 'slugify';

/**
 * Parse URL pattern and extract segment names
 * @param {string} pattern - e.g., "{location}/{category}/{slug}"
 * @returns {string[]} Array of segment names
 */
export function parseUrlPattern(pattern) {
  const regex = /{([^}]+)}/g;
  const segments = [];
  let match;
  
  while ((match = regex.exec(pattern)) !== null) {
    segments.push(match[1]);
  }
  
  return segments;
}

/**
 * Generate URL from pattern and data
 * @param {string} pattern - URL pattern with placeholders
 * @param {object} segmentConfig - Configuration for each segment
 * @param {object} listingData - The listing data
 * @returns {string} Generated URL path
 */
export function generateUrlFromPattern(pattern, segmentConfig, listingData) {
  let url = pattern;
  
  // Extract segments from pattern
  const segments = parseUrlPattern(pattern);
  
  // Replace each segment with actual values
  segments.forEach(segment => {
    const config = segmentConfig[segment];
    let value = '';
    
    if (segment === 'slug') {
      // Special handling for slug - always use the listing slug
      value = listingData.slug;
    } else if (config) {
      value = extractSegmentValue(listingData, config);
    }
    
    // Ensure value is slugified
    if (value && config?.slug_format !== false) {
      value = slugify(value, { 
        lower: true, 
        strict: true,
        locale: config.locale || 'en' // Support Polish characters
      });
    }
    
    url = url.replace(`{${segment}}`, value || '');
  });
  
  // Clean up any double slashes or empty segments
  url = url.replace(/\/+/g, '/').replace(/\/$/, '').replace(/^\//, '');
  
  return url;
}

/**
 * Extract segment value from listing data based on config
 */
function extractSegmentValue(listingData, config) {
  switch (config.source) {
    case 'listing_field':
      return getNestedValue(listingData, config.field);
    
    case 'category':
      // Handle category reference
      if (config.field === 'category_slug') {
        return listingData.category_slug || slugify(listingData.category || '', { lower: true, strict: true });
      }
      return listingData.category;
    
    case 'static':
      return config.value;
    
    case 'computed':
      // Allow for computed values based on multiple fields
      if (config.compute && typeof config.compute === 'function') {
        return config.compute(listingData);
      }
      return '';
    
    default:
      return '';
  }
}

/**
 * Get nested object value using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Parse URL path back to segments
 * @param {string} urlPath - The URL path to parse
 * @param {string} pattern - The URL pattern
 * @returns {object} Object with segment values
 */
export function parseUrlToSegments(urlPath, pattern) {
  const segments = parseUrlPattern(pattern);
  const pathParts = urlPath.split('/').filter(Boolean);
  const result = {};
  
  segments.forEach((segment, index) => {
    if (pathParts[index]) {
      result[segment] = pathParts[index];
    }
  });
  
  return result;
}

/**
 * Determine page type from URL segments
 * @param {object} segments - Parsed URL segments
 * @param {string} pattern - URL pattern
 * @returns {string} Page type: 'listing', 'category', 'location', etc.
 */
export function determinePageType(segments, pattern) {
  const segmentKeys = Object.keys(segments);
  const patternSegments = parseUrlPattern(pattern);
  
  // If we have all segments including slug, it's a listing page
  if (segments.slug && segmentKeys.length === patternSegments.length) {
    return 'listing';
  }
  
  // If we have location but no category or slug, it's a location page
  if ((segments.city || segments.location) && !segments.category && !segments.slug) {
    return 'location';
  }
  
  // If we have location and category but no slug, it's a filtered category page
  if ((segments.city || segments.location) && segments.category && !segments.slug) {
    return 'category-location';
  }
  
  // If we only have category, it's a category page
  if (segments.category && !segments.slug) {
    return 'category';
  }
  
  return 'unknown';
}

/**
 * Build query filters from URL segments
 * @param {object} segments - Parsed URL segments
 * @param {object} segmentConfig - Segment configuration
 * @returns {object} Query filters for database
 */
export function buildFiltersFromSegments(segments, segmentConfig) {
  const filters = {};
  
  Object.entries(segments).forEach(([key, value]) => {
    if (key === 'slug') {
      filters.slug = value;
    } else {
      const config = segmentConfig[key];
      if (config) {
        switch (config.source) {
          case 'listing_field':
            filters[config.field] = value;
            break;
          case 'category':
            filters.category_slug = value;
            break;
        }
      }
    }
  });
  
  return filters;
}

/**
 * Generate breadcrumbs from URL path
 * @param {string} urlPath - Current URL path
 * @param {string} pattern - URL pattern
 * @param {object} segmentConfig - Segment configuration
 * @param {string} directoryId - Directory ID
 * @param {object} labels - Custom labels for segments
 * @returns {array} Breadcrumb items
 */
export function generateBreadcrumbs(urlPath, pattern, segmentConfig, directoryId, labels = {}) {
  const segments = parseUrlToSegments(urlPath, pattern);
  const breadcrumbs = [];
  let currentPath = `/${directoryId}`;
  
  // Add home
  breadcrumbs.push({
    name: labels.home || 'Home',
    url: currentPath
  });
  
  // Add each segment
  const segmentKeys = parseUrlPattern(pattern);
  segmentKeys.forEach(key => {
    if (segments[key] && key !== 'slug') {
      currentPath += `/${segments[key]}`;
      breadcrumbs.push({
        name: labels[key] || formatSegmentLabel(segments[key]),
        url: currentPath
      });
    }
  });
  
  // Add final item (usually the listing title) without URL
  if (segments.slug && labels.current) {
    breadcrumbs.push({
      name: labels.current,
      url: null // Current page, no link
    });
  }
  
  return breadcrumbs;
}

/**
 * Format segment value for display
 */
function formatSegmentLabel(value) {
  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate URL pattern
 * @param {string} pattern - URL pattern to validate
 * @returns {object} Validation result
 */
export function validateUrlPattern(pattern) {
  const segments = parseUrlPattern(pattern);
  
  if (segments.length === 0) {
    return {
      valid: false,
      error: 'Pattern must contain at least one segment'
    };
  }
  
  if (!segments.includes('slug')) {
    return {
      valid: false,
      error: 'Pattern must include {slug} segment'
    };
  }
  
  const duplicates = segments.filter((item, index) => segments.indexOf(item) !== index);
  if (duplicates.length > 0) {
    return {
      valid: false,
      error: `Duplicate segments found: ${duplicates.join(', ')}`
    };
  }
  
  return {
    valid: true,
    segments
  };
}