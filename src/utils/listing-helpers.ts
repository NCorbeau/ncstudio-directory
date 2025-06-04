import { getDirectoryConfig } from "@/utils/directory-helpers";
import type { 
  Directory, 
  ListingData,
  NormalizedListing, 
  ReviewDistribution
} from "@/types";
import { isBusinessListing, isLegacyListing } from "@/types";

/**
 * Normalize any listing format to a consistent structure for components
 */
export function normalizeListing(listing: ListingData): NormalizedListing {
  const fields = listing.fields;
  
  // Determine title - use businessName if available, otherwise use title
  const title = fields.businessName || listing.title;
  
  // Parse tags from topReviewTags if available, otherwise use listing.tags
  const tags = fields.topReviewTags 
    ? parseTopReviewTags(fields.topReviewTags)
    : listing.tags || [];
  
  return {
    title,
    description: listing.description,
    directory: listing.directory,
    category: listing.category || '',
    featured: listing.featured,
    images: listing.images,
    tags,
    
    // Rating - prefer googleMapsrating, fallback to rating
    rating: fields.googleMapsrating || fields.rating,
    reviewCount: fields.reviewCount,
    
    // Address - prefer fullAddress, fallback to address
    address: fields.fullAddress || fields.fullAddress,
    neighborhood: fields.neighborhood,
    city: fields.city,
    
    // Contact info
    phone: fields.phone,
    website: fields.website,
    
    // Business status
    isOpen: fields.isOpen,
    openingHours: fields.openingHours,
    
    // Additional data
    coordinates: fields.coordinates,
    imageCount: fields.imageCount,
    reviewDistribution: fields.reviewDistribution,
    topReviewTags: fields.topReviewTags ? parseTopReviewTags(fields.topReviewTags) : undefined,
    
    updatedAt: listing.updatedAt,
  };
}

/**
 * Parse top review tags string into array
 */
function parseTopReviewTags(topReviewTags?: string): string[] {
  if (!topReviewTags) return [];
  
  // Parse "prices (31), service (25), bubble tea (15)" format
  return topReviewTags
    .split(',')
    .map(tag => tag.trim().split('(')[0].trim())
    .filter(tag => tag.length > 0)
    .slice(0, 5); // Limit to top 5 tags
}

/**
 * Get category name by ID from a directory's categories (legacy support)
 */
export async function getCategoryName(directoryId: string, categoryId: string): Promise<string> {
  try {
    const directoryData = await getDirectoryConfig(directoryId) as Directory | null;
    if (directoryData && directoryData.categories) {
      const category = directoryData.categories.find(c => c.id === categoryId);
      return category?.name || categoryId; // Fallback to ID if not found
    }
  } catch (error) {
    console.error('Error loading category name:', error);
  }
  return categoryId; // Return the original ID/name as fallback
}

/**
 * Get the first image or fallback to placeholder
 */
export function getThumbnailImage(images: string[]): string {
  return images && images.length > 0 ? images[0] : '/placeholder-image.jpg';
}

/**
 * Format address to show only the first part (before first comma)
 */
export function formatAddress(address: unknown): string {
  if (typeof address === 'string') {
    return address.split(',')[0];
  }
  return '';
}

/**
 * Format full address for business listings
 */
export function formatFullAddress(listing: NormalizedListing): string {
  if (listing.address) {
    return listing.address;
  }
  
  // Build address from components
  const parts = [listing.neighborhood, listing.city].filter(Boolean);
  return parts.join(', ');
}

/**
 * Format neighborhood and city display
 */
export function formatLocation(listing: NormalizedListing): string {
  const parts = [listing.neighborhood, listing.city].filter(Boolean);
  return parts.join(', ');
}

/**
 * Limit tags to a specified number
 */
export function limitTags(tags: string[], limit: number = 3): string[] {
  return tags ? tags.slice(0, limit) : [];
}

/**
 * Calculate overall rating percentage for review distribution
 */
export function calculateRatingPercentage(reviewDist: ReviewDistribution): number {
  const total = Object.values(reviewDist).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  
  const weighted = 
    reviewDist.oneStar * 1 +
    reviewDist.twoStar * 2 +
    reviewDist.threeStar * 3 +
    reviewDist.fourStar * 4 +
    reviewDist.fiveStar * 5;
    
  return (weighted / (total * 5)) * 100;
}

/**
 * Get star distribution percentages
 */
export function getStarDistribution(reviewDist: ReviewDistribution): Array<{stars: number, count: number, percentage: number}> {
  const total = Object.values(reviewDist).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];
  
  return [
    { stars: 5, count: reviewDist.fiveStar, percentage: (reviewDist.fiveStar / total) * 100 },
    { stars: 4, count: reviewDist.fourStar, percentage: (reviewDist.fourStar / total) * 100 },
    { stars: 3, count: reviewDist.threeStar, percentage: (reviewDist.threeStar / total) * 100 },
    { stars: 2, count: reviewDist.twoStar, percentage: (reviewDist.twoStar / total) * 100 },
    { stars: 1, count: reviewDist.oneStar, percentage: (reviewDist.oneStar / total) * 100 },
  ];
}

/**
 * Parse opening hours and determine if currently open
 */
export function parseOpeningStatus(openingHours?: string, isOpen?: boolean): { 
  isOpen: boolean; 
  todayHours?: string; 
  nextOpenTime?: string;
} {
  // If isOpen is explicitly provided, use it
  if (isOpen !== undefined) {
    return { 
      isOpen, 
      todayHours: openingHours ? getTodayHours(openingHours) ?? undefined : undefined 
    };
  }
  
  if (!openingHours) {
    return { isOpen: false };
  }
  
  // Parse the opening hours string and determine current status
  const todayHours = getTodayHours(openingHours);
  const isCurrentlyOpen = checkIfCurrentlyOpen(openingHours);
  
  return {
    isOpen: isCurrentlyOpen,
    todayHours: todayHours ?? undefined
  };
}

/**
 * Extract today's hours from opening hours string
 */
function getTodayHours(openingHours: string): string | null {
  if (!openingHours) return null;
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  // Handle both formats: "Monday: 11 AM to 9:30 PM" and "Monday-Friday: 11 AM to 9:30 PM"
  const patterns = [
    new RegExp(`${today}:\\s*([^,]+)`, 'i'),
    new RegExp(`\\b${today}\\b[^:]*:\\s*([^,]+)`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = openingHours.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Check for day ranges like "Monday-Friday"
  const dayRangePattern = /(\w+)-(\w+):\s*([^,]+)/gi;
  let match;
  
  while ((match = dayRangePattern.exec(openingHours)) !== null) {
    const [, startDay, endDay, hours] = match;
    if (isDayInRange(today, startDay, endDay)) {
      return hours.trim();
    }
  }
  
  return null;
}

/**
 * Check if the business is currently open based on opening hours
 */
function checkIfCurrentlyOpen(openingHours: string): boolean {
  const todayHours = getTodayHours(openingHours);
  if (!todayHours) return false;
  
  // Check if it's "Closed" or similar
  if (/closed|fermé|geschlossen|cerrado/i.test(todayHours)) {
    return false;
  }
  
  // Parse time ranges like "11 AM to 9:30 PM" or "11:00-21:30"
  const timeRanges = parseTimeRanges(todayHours);
  if (timeRanges.length === 0) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
  
  // Check if current time falls within any of the time ranges
  return timeRanges.some(({ start, end }) => {
    if (end < start) {
      // Handle overnight hours (e.g., 11 PM to 2 AM)
      return currentTime >= start || currentTime <= end;
    }
    return currentTime >= start && currentTime <= end;
  });
}

/**
 * Parse time ranges from a string like "11 AM to 9:30 PM" or "11:00-21:30"
 */
function parseTimeRanges(hoursString: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  
  // Handle multiple time ranges separated by commas or "and"
  const timeRangeStrings = hoursString.split(/,|\sand\s/i);
  
  for (const timeRange of timeRangeStrings) {
    const trimmed = timeRange.trim();
    
    // Try different time range patterns
    const patterns = [
      /(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i,
      /(\d{1,2}:\d{2})\s*(?:to|-)\s*(\d{1,2}:\d{2})/,
      /(\d{1,2})\s*(?:to|-)\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const startTime = parseTimeToMinutes(match[1]);
        const endTime = parseTimeToMinutes(match[2]);
        
        if (startTime !== null && endTime !== null) {
          ranges.push({ start: startTime, end: endTime });
          break;
        }
      }
    }
  }
  
  return ranges;
}

/**
 * Convert time string to minutes since midnight
 */
function parseTimeToMinutes(timeString: string): number | null {
  const trimmed = timeString.trim();
  
  // Handle 12-hour format (e.g., "11 AM", "9:30 PM")
  const ampmMatch = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2] || '0', 10);
    const ampm = ampmMatch[3].toUpperCase();
    
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  }
  
  // Handle 24-hour format (e.g., "21:30", "09:00")
  const time24Match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (time24Match) {
    const hours = parseInt(time24Match[1], 10);
    const minutes = parseInt(time24Match[2], 10);
    return hours * 60 + minutes;
  }
  
  // Handle simple hour format (e.g., "12", "9")
  const hourMatch = trimmed.match(/^(\d{1,2})$/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    return hours * 60;
  }
  
  return null;
}

/**
 * Check if a day falls within a day range (e.g., "Monday-Friday")
 */
function isDayInRange(targetDay: string, startDay: string, endDay: string): boolean {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetIndex = days.findIndex(day => day.toLowerCase() === targetDay.toLowerCase());
  const startIndex = days.findIndex(day => day.toLowerCase() === startDay.toLowerCase());
  const endIndex = days.findIndex(day => day.toLowerCase() === endDay.toLowerCase());
  
  if (targetIndex === -1 || startIndex === -1 || endIndex === -1) return false;
  
  if (startIndex <= endIndex) {
    return targetIndex >= startIndex && targetIndex <= endIndex;
  } else {
    // Handle ranges that cross the week boundary (e.g., "Friday-Monday")
    return targetIndex >= startIndex || targetIndex <= endIndex;
  }
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone?: string): string {
  if (!phone) return '';
  
  // Remove any non-numeric characters except + and spaces
  return phone.replace(/[^\d\s+()-]/g, '');
}

/**
 * Format website URL for display
 */
export function formatWebsiteUrl(website?: string): string {
  if (!website) return '';
  
  // Remove protocol for display
  return website.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Generate Google Maps URL from coordinates
 */
export function getGoogleMapsUrl(coordinates?: string, address?: string): string {
  if (coordinates) {
    return `https://maps.google.com/?q=${coordinates}`;
  }
  if (address) {
    return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  }
  return '';
} 