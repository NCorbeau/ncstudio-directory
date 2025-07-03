// src/utils/common.ts
// Common utility functions used throughout the application

/**
 * Get the current directory ID from environment variable (single directory mode)
 */
export function getCurrentDirectoryId(): string {
    return import.meta.env.CURRENT_DIRECTORY || 'default';
  }
  
  /**
   * Create a URL (simplified for single directory mode)
   */
  export function makeDirUrl(path: string, directoryId?: string | null): string {
    // In single directory mode, ignore directoryId and just return the path
    return path.startsWith('/') ? path : '/' + path;
  }
  
  /**
   * Truncate text to specified length and add ellipsis
   */
  export function truncateText(text: string, maxLength = 100): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  /**
   * Format date to localized string
   */
  export function formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }
  
  /**
   * Get rating stars HTML
   */
  export function getRatingStars(rating: number | undefined): string {
    if (!rating) return '';
    
    return `
      <div class="stars" style="--rating: ${rating}">
        <span class="sr-only">${rating} out of 5 stars</span>
      </div>
    `;
  }
  
  /**
   * Convert hex color to RGB
   */
  export function hexToRgb(hex: string): string {
    // Remove the hash if it exists
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Return as RGB string
    return `${r}, ${g}, ${b}`;
  }
  
  /**
   * Safe JSON parse with fallback
   */
  export function safeParseJSON<T>(jsonString: string | null | undefined, fallback: T): T {
    if (!jsonString) return fallback;
    
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error(`Error parsing JSON: ${error}`);
      return fallback;
    }
  }
  
  /**
   * Sanitize search query for security
   */
  export function sanitizeSearchQuery(query: string): string {
    if (!query) return '';
    
    // Basic sanitization to remove SQL injection risks
    // Escape % and _ which are SQL wildcards
    let sanitized = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
    
    // Remove any potentially harmful characters
    sanitized = sanitized.replace(/['";]/g, '');
    
    return sanitized;
  }
  
  /**
   * Get query parameters from URL
   */
  export function getQueryParams(): URLSearchParams {
    if (typeof window === 'undefined') {
      return new URLSearchParams();
    }
    
    return new URLSearchParams(window.location.search);
  }
  
  /**
   * Check if we're running in a browser environment
   */
  export function isBrowser(): boolean {
    return typeof window !== 'undefined';
  }