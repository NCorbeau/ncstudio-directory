/**
 * Utility functions to generate structured data for different directory types
 * Using Schema.org vocabulary
 */

/**
 * Generate JSON-LD structured data for a directory listing
 * @param {string} directoryType - Type of directory (e.g., 'french-desserts', 'dog-parks-warsaw')
 * @param {object} listingData - The listing data
 * @param {string} url - The canonical URL of the listing
 * @returns {object} - JSON-LD structured data object
 */
export function generateListingSchema(directoryType, listingData, url) {
  // Base schema that applies to all listings
  const baseSchema = {
    "@context": "https://schema.org",
    "url": url,
    "name": listingData.title,
    "description": listingData.description,
    "image": listingData.images && listingData.images.length > 0 ? listingData.images[0] : null,
  };

  // Apply directory-specific schema types and properties
  switch (directoryType) {
    case 'french-desserts':
      return generateFoodItemSchema(baseSchema, listingData);
    case 'dog-parks-warsaw':
      return generatePlaceSchema(baseSchema, listingData);
    default:
      // For unknown directory types, return a generic ItemPage schema
      return {
        ...baseSchema,
        "@type": "ItemPage"
      };
  }
}

/**
 * Generate structured data for food items (French desserts)
 * @param {object} baseSchema - Base schema properties
 * @param {object} listingData - The food item data
 * @returns {object} - Completed schema object
 */
function generateFoodItemSchema(baseSchema, listingData) {
  // Schema for food items using Recipe type
  const foodSchema = {
    ...baseSchema,
    "@type": "Recipe",
    "recipeCategory": "Dessert",
    "recipeCuisine": "French",
    "keywords": listingData.tags ? listingData.tags.join(", ") : "",
    "aggregateRating": listingData.rating ? {
      "@type": "AggregateRating",
      "ratingValue": listingData.rating,
      "ratingCount": 1 // Placeholder, could be replaced with actual review count
    } : null,
  };

  // Add custom fields if available
  if (listingData.customFields) {
    if (listingData.customFields.difficulty) {
      foodSchema.recipeCategory += ` (${listingData.customFields.difficulty})`;
    }
    
    if (listingData.customFields.preparationTime) {
      foodSchema.prepTime = convertToISO8601Duration(listingData.customFields.preparationTime);
    }
    
    if (listingData.customFields.origin) {
      foodSchema.recipeCategory += ` - ${listingData.customFields.origin}`;
    }
  }

  // Filter out null or undefined values
  return Object.fromEntries(
    Object.entries(foodSchema).filter(([_, value]) => value !== null && value !== undefined)
  );
}

/**
 * Generate structured data for places (Dog parks)
 * @param {object} baseSchema - Base schema properties
 * @param {object} listingData - The place data
 * @returns {object} - Completed schema object
 */
function generatePlaceSchema(baseSchema, listingData) {
  // Schema for places using Park type
  const placeSchema = {
    ...baseSchema,
    "@type": "Park",
    "address": listingData.address ? {
      "@type": "PostalAddress",
      "streetAddress": listingData.address
    } : null,
    "telephone": listingData.phone || null,
    "openingHoursSpecification": generateOpeningHours(listingData.openingHours),
    "amenityFeature": generateAmenityFeatures(listingData),
    "aggregateRating": listingData.rating ? {
      "@type": "AggregateRating",
      "ratingValue": listingData.rating,
      "ratingCount": 1 // Placeholder, could be replaced with actual review count
    } : null,
  };

  // Filter out null or undefined values
  return Object.fromEntries(
    Object.entries(placeSchema).filter(([_, value]) => value !== null && value !== undefined)
  );
}

/**
 * Generate opening hours specification from listing data
 * @param {Array} openingHours - Opening hours data
 * @returns {Array|null} - Array of OpeningHoursSpecification objects or null
 */
function generateOpeningHours(openingHours) {
  if (!openingHours || openingHours.length === 0) return null;
  
  return openingHours.map(hours => {
    // Handle seasonal hours like "April-September" or daily hours like "Monday-Sunday"
    const dayMapping = {
      'Monday': 'https://schema.org/Monday',
      'Tuesday': 'https://schema.org/Tuesday',
      'Wednesday': 'https://schema.org/Wednesday',
      'Thursday': 'https://schema.org/Thursday',
      'Friday': 'https://schema.org/Friday',
      'Saturday': 'https://schema.org/Saturday',
      'Sunday': 'https://schema.org/Sunday',
      'Monday-Sunday': ['https://schema.org/Monday', 'https://schema.org/Tuesday', 'https://schema.org/Wednesday', 
                         'https://schema.org/Thursday', 'https://schema.org/Friday', 'https://schema.org/Saturday', 
                         'https://schema.org/Sunday']
    };
    
    // Parse the hours (e.g., "9:00-17:00")
    let opens = null;
    let closes = null;
    
    if (hours.hours && hours.hours.includes('-')) {
      const [openTime, closeTime] = hours.hours.split('-');
      opens = openTime.trim();
      closes = closeTime.trim();
    }
    
    // If it's a seasonal specification, handle differently
    if (hours.day && (hours.day.includes('-') && !Object.keys(dayMapping).includes(hours.day))) {
      // This is likely a seasonal specification like "April-September"
      return {
        "@type": "OpeningHoursSpecification",
        "name": hours.day,
        "opens": opens,
        "closes": closes
      };
    }
    
    // Regular weekly opening hours
    return {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": dayMapping[hours.day] || hours.day,
      "opens": opens,
      "closes": closes
    };
  });
}

/**
 * Generate amenity features from listing data
 * @param {object} listingData - The listing data
 * @returns {Array|null} - Array of amenity features or null
 */
function generateAmenityFeatures(listingData) {
  if (!listingData.tags && !listingData.customFields) return null;
  
  const amenities = [];
  
  // Add tags as amenities
  if (listingData.tags) {
    listingData.tags.forEach(tag => {
      amenities.push({
        "@type": "LocationFeatureSpecification",
        "name": tag
      });
    });
  }
  
  // Add relevant custom fields as amenities
  if (listingData.customFields) {
    // For dog parks, add specific custom fields
    if (listingData.customFields.fenceStatus) {
      amenities.push({
        "@type": "LocationFeatureSpecification",
        "name": "Fence Status",
        "value": listingData.customFields.fenceStatus
      });
    }
    
    if (listingData.customFields.size) {
      amenities.push({
        "@type": "LocationFeatureSpecification",
        "name": "Size",
        "value": listingData.customFields.size
      });
    }
    
    if (listingData.customFields.waterAccess) {
      amenities.push({
        "@type": "LocationFeatureSpecification",
        "name": "Water Access",
        "value": listingData.customFields.waterAccess
      });
    }
  }
  
  return amenities.length > 0 ? amenities : null;
}

/**
 * Convert human-readable duration to ISO 8601 duration format
 * @param {string} durationString - Human-readable duration (e.g., "1-2 hours", "30 minutes")
 * @returns {string} - ISO 8601 duration string
 */
function convertToISO8601Duration(durationString) {
  // Simple conversion for common patterns
  if (!durationString) return null;
  
  // Handle ranges by taking the average
  if (durationString.includes('-')) {
    const [min, max] = durationString.split('-').map(s => s.trim());
    // For simplicity, if it's a range like "1-2 hours", return the maximum
    durationString = max;
  }
  
  // Extract numbers and units
  const hours = durationString.match(/(\d+)\s*hour/i);
  const minutes = durationString.match(/(\d+)\s*min/i);
  const days = durationString.match(/(\d+)\s*day/i);
  
  let iso8601 = 'PT';
  
  if (days && days[1]) {
    iso8601 = `P${days[1]}D`;
    if (hours || minutes) iso8601 += 'T';
  }
  
  if (hours && hours[1]) {
    iso8601 += `${hours[1]}H`;
  }
  
  if (minutes && minutes[1]) {
    iso8601 += `${minutes[1]}M`;
  }
  
  return iso8601 === 'PT' ? null : iso8601;
}

/**
 * Generate breadcrumb list structured data
 * @param {Array} breadcrumbs - Array of breadcrumb items with name and url
 * @returns {object} - BreadcrumbList schema object
 */
export function generateBreadcrumbSchema(breadcrumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

/**
 * Generate directory homepage structured data
 * @param {object} directoryData - The directory configuration data
 * @param {string} url - The canonical URL of the directory homepage
 * @returns {object} - WebSite schema object
 */
export function generateDirectoryHomeSchema(directoryData, url) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": url,
    "name": directoryData.name,
    "description": directoryData.description,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${url}search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

/**
 * Generate category page structured data
 * @param {string} directoryType - Type of directory
 * @param {object} directoryData - The directory configuration data
 * @param {object} categoryData - The category data
 * @param {string} url - The canonical URL of the category page
 * @returns {object} - CollectionPage schema object
 */
export function generateCategorySchema(directoryType, directoryData, categoryData, url) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "url": url,
    "name": `${categoryData.name} | ${directoryData.name}`,
    "description": categoryData.description || `Browse ${categoryData.name} in our ${directoryData.name} directory`,
    "isPartOf": {
      "@type": "WebSite",
      "name": directoryData.name,
      "url": url.substring(0, url.lastIndexOf('/category/'))
    }
  };
}