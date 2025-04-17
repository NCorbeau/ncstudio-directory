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
    address?: string;
    website?: string;
    phone?: string;
    rating?: number;
    tags: string[];
    openingHours: OpeningHours[];
    customFields: Record<string, unknown>;
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
  
  // Types for layout-specific props
  export interface LayoutProps {
    listings: Listing[];
    directory: Directory;
    categories: Category[];
    directoryId: string;
  }
  
  // Types for components
  export interface ListingCardProps {
    listing: ListingData;
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