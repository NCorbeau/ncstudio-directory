// src/types/index.ts
// Central location for TypeScript interfaces and types

export interface Directory {
    id: string;
    name: string;
    description: string;
    domain?: string;
    theme: string;
    availableLayouts: string[];
    defaultLayout: string;
    primaryColor: string;
    secondaryColor?: string;
    logo?: string;
    categories: Category[];
    metaTags: MetaTags;
    socialLinks: SocialLink[];
    deployment?: Record<string, unknown>;
  }
  
  export interface Category {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    featured?: boolean;
  }
  
  // Legacy listing structure (keep for backward compatibility)
  export interface Listing {
    slug: string;
    data: ListingData;
    render: () => { Content: string };
  }
  
  export interface ListingData {
    title: string;
    description: string;
    directory: string;
    category?: string;
    featured: boolean;
    images: string[];
    tags: string[];
    fields: ListingFields;
    updatedAt?: string;
  }
  
  // Extended fields interface that can contain both legacy and business data
  export interface ListingFields {
    // Legacy fields
    rating?: number;
    address?: string;
    phone?: string;
    website?: string;
    
    // Business listing fields
    businessName?: string;
    googleMapsrating?: number;
    reviewCount?: number;
    fullAddress?: string;
    neighborhood?: string;
    city?: string;
    countryCode?: string;
    openingHours?: string;
    coordinates?: string;
    isOpen?: boolean;
    imageCount?: number;
    reviewDistribution?: ReviewDistribution;
    topReviewTags?: string;
    
    // Allow any additional fields
    [key: string]: unknown;
  }
  
  export interface ReviewDistribution {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  }
  
  // Type guards
  export function isBusinessListing(listing: ListingData): boolean {
    return 'businessName' in listing.fields;
  }
  
  export function isLegacyListing(listing: ListingData): boolean {
    return !('businessName' in listing.fields);
  }
  
  // Normalized listing interface for components
  export interface NormalizedListing {
    title: string;
    description?: string;
    directory: string;
    category: string;
    featured: boolean;
    images: string[];
    tags: string[];
    
    // Unified rating system
    rating?: number;
    reviewCount?: number;
    
    // Unified address system
    address?: string;
    neighborhood?: string;
    city?: string;
    
    // Contact info
    phone?: string;
    website?: string;
    
    // Business status
    isOpen?: boolean;
    openingHours?: string;
    
    // Additional data
    coordinates?: string;
    imageCount?: number;
    reviewDistribution?: ReviewDistribution;
    topReviewTags?: string[];
    
    // Meta
    updatedAt?: string;
  }
  
  export interface OpeningHours {
    day: string;
    hours: string;
  }
  
  export interface MetaTags {
    title?: string;
    description?: string;
    keywords?: string[];
    language?: string;
    twitterHandle?: string;
    robotsTxt?: string;
    noindex?: boolean;
    custom?: {name: string, content: string}[];
  }
  
  export interface SocialLink {
    platform: string;
    url: string;
  }
  
  export interface LandingPage {
    slug: string;
    data: {
      title: string;
      description: string;
      directory: string;
      featuredImage?: string;
      keywords: string[];
      relatedCategories: string[];
      updatedAt?: string;
    };
    render: () => { Content: string };
  }
  
  export interface BreadcrumbItem {
    name: string;
    url: string;
  }
  
  // Updated component prop types
  export interface ListingCardProps {
    listing: NormalizedListing;
    url: string;
    theme?: string;
  }
  
  export interface SearchBarProps {
    directoryId: string;
    placeholder?: string;
    initialQuery?: string;
  }
  
  export interface LayoutSwitcherProps {
    availableLayouts: string[];
    currentLayout: string;
    directoryId: string;
    searchParams?: string;
  }
  
  export interface SEOProps {
    title: string;
    description: string;
    canonicalUrl: string;
    image?: string;
    type?: 'website' | 'article' | 'place' | 'product' | 'profile';
    publishedDate?: string;
    modifiedDate?: string;
    author?: string;
    directoryData: Directory;
    structuredData?: any;
    noindex?: boolean;
    keywords?: string[];
  }
  
  export interface HeaderProps {
    directoryName: string;
    logo?: string;
    theme?: string;
  }
  
  export interface FooterProps {
    directoryName: string;
    socialLinks?: SocialLink[];
    theme?: string;
  }
  
  // API response types
  export interface SearchResponse {
    success: boolean;
    results: Listing[];
    message?: string;
    error?: string;
  }
  
  export interface LayoutDataResponse {
    success: boolean;
    data?: {
      layout: string;
      listings: Listing[];
      directory: Directory;
      categories: Category[];
    };
    error?: string;
  }