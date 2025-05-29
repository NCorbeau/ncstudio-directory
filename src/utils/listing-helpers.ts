import { getDirectoryConfig } from "@/utils/directory-helpers";
import type { Directory } from "@/types";

/**
 * Get category name by ID from a directory's categories
 */
export async function getCategoryName(directoryId: string, categoryId: string): Promise<string> {
  try {
    const directoryData = await getDirectoryConfig(directoryId) as Directory | null;
    if (directoryData && directoryData.categories) {
      const category = directoryData.categories.find(c => c.id === categoryId);
      return category?.name || '';
    }
  } catch (error) {
    console.error('Error loading category name:', error);
  }
  return '';
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
 * Limit tags to a specified number
 */
export function limitTags(tags: string[], limit: number = 3): string[] {
  return tags ? tags.slice(0, limit) : [];
} 