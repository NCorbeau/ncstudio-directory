/**
 * Debug utility to log environment variables
 * Include this component on pages to debug environment issues
 */

export function logEnvironmentVariables() {
    console.log('Current Environment Variables:', {
      ...(typeof import.meta !== 'undefined' ? import.meta.env : {}),
      window: typeof window !== 'undefined' ? {
        location: {
          origin: window.location.origin,
          pathname: window.location.pathname
        }
      } : undefined
    });
  }
  
  export function apiConfigStatus() {
    const status = {
      apiBaseUrl: typeof import.meta !== 'undefined' ? import.meta.env.PUBLIC_API_BASE_URL : 'Not available in SSR',
      useLocalApi: typeof import.meta !== 'undefined' ? import.meta.env.PUBLIC_USE_LOCAL_API : 'Not available in SSR',
      origin: typeof window !== 'undefined' ? window.location.origin : 'Not in browser'
    };
    
    return status;
  }