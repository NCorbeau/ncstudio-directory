// src/config/index.ts
// Central configuration for the application

// Layout configuration
export const layoutConfig = {
    // Icons and labels for layout switcher
    layouts: {
      Card: { 
        name: "Card View", 
        icon: "grid" 
      },
      List: { 
        name: "List View", 
        icon: "list" 
      },
      Table: { 
        name: "Table View", 
        icon: "list-table" 
      },
      Magazine: { 
        name: "Magazine", 
        icon: "layout" 
      },
      Map: { 
        name: "Map View", 
        icon: "map" 
      }
    },
    
    // Default layout to use if none specified
    defaultLayout: 'Card'
  };
  
  // Theme configuration
  export const themeConfig = {
    defaultTheme: 'default',
    
    // CSS variables for each theme
    themes: {
      default: {
        primaryColor: '#3366cc',
        secondaryColor: '#ff9900',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        textColorLight: '#666666',
        borderRadius: '8px',
        // Typography
        headingFont: 'system-ui, sans-serif',
        bodyFont: 'system-ui, sans-serif',
        baseSize: '16px',
        scale: 1.2
      },
      elegant: {
        primaryColor: '#9c7c38',
        secondaryColor: '#2c3e50',
        backgroundColor: '#fcfcfc',
        textColor: '#2c3e50',
        textColorLight: '#7f8c8d',
        borderRadius: '4px',
        // Typography
        headingFont: 'Georgia, serif',
        bodyFont: 'system-ui, sans-serif',
        baseSize: '16px',
        scale: 1.25
      },
      nature: {
        primaryColor: '#4b7f52',
        secondaryColor: '#f9a825',
        backgroundColor: '#f8f9f4',
        textColor: '#2d3c2e',
        textColorLight: '#5a6b5b',
        borderRadius: '12px',
        // Typography
        headingFont: 'system-ui, sans-serif',
        bodyFont: 'system-ui, sans-serif',
        baseSize: '16px',
        scale: 1.2
      },
      modern: {
        primaryColor: '#0070f3',
        secondaryColor: '#ff0080',
        backgroundColor: '#ffffff',
        textColor: '#111111',
        textColorLight: '#555555',
        borderRadius: '8px',
        // Typography
        headingFont: 'system-ui, sans-serif',
        bodyFont: 'system-ui, sans-serif',
        baseSize: '16px',
        scale: 1.3
      }
    }
  };
  
  // API configuration
  export const apiConfig = {
    // Update the base URL for API endpoints
    baseUrl: typeof window !== 'undefined' 
      ? import.meta.env.PUBLIC_API_BASE_URL || 'https://ncstudio-directory-functions.glownia.workers.dev'
      : process.env.PUBLIC_API_BASE_URL || import.meta.env.PUBLIC_API_BASE_URL || 'https://ncstudio-directory-functions.glownia.workers.dev',
    
    // Rest of the configuration stays the same
    useLocalApi: typeof window !== 'undefined'
      ? import.meta.env.PUBLIC_USE_LOCAL_API === 'true'
      : process.env.PUBLIC_USE_LOCAL_API === 'true' || process.env.USE_LOCAL_API === 'true',
    
    // Cache durations
    cacheTTL: {
      directories: 3600, // 1 hour
      listings: 300,     // 5 minutes
      categories: 600,   // 10 minutes
      search: 60,        // 1 minute
      landingPages: 3600 // 1 hour
    },
    
    // Endpoints - these should remain the same path structure
    endpoints: {
      search: '/api/search',
      directory: '/api/directory',
      listings: '/api/listings',
      renderLayout: '/api/render-layout',
      webhook: '/api/webhook'
    }
  };