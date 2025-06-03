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
    address: fields.fullAddress || fields.address,
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
  if (isOpen !== undefined) {
    return { isOpen };
  }
  
  if (!openingHours) {
    return { isOpen: false };
  }
  
  // Simple parsing for now - could be enhanced with proper time parsing
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayPattern = new RegExp(`${today}:\\s*([^,]+)`, 'i');
  const match = openingHours.match(todayPattern);
  
  return {
    isOpen: false, // Default to false, would need proper time checking
    todayHours: match ? match[1].trim() : undefined
  };
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