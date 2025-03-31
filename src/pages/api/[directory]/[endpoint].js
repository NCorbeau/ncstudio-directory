// src/pages/api/[directory]/[endpoint].js
/**
 * Serverless API endpoint that serves as a middleware for NocoDB
 * This provides several advantages:
 * 1. Hides NocoDB credentials from client
 * 2. Enables more sophisticated caching
 * 3. Allows data transformation before serving
 * 4. Can add rate limiting and other protections
 */

import { 
    getDirectories, 
    getDirectory, 
    getListings, 
    getCategoryListings,
    getListing,
    getLandingPages,
    searchListings,
    clearCache
  } from '../../../lib/nocodb';
  
  export async function get({ params, request }) {
    const { directory, endpoint } = params;
    const url = new URL(request.url);
    
    // Enable CORS for development
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };
    
    // API Key validation (optional but recommended)
    const apiKey = url.searchParams.get('apiKey');
    
    if (!process.env.DEV_MODE && process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers }
      );
    }
    
    try {
      // Handle different endpoints
      switch (endpoint) {
        case 'info':
          const directoryData = await getDirectory(directory);
          
          if (!directoryData) {
            return new Response(
              JSON.stringify({ error: 'Directory not found' }),
              { status: 404, headers }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              id: directoryData.id,
              name: directoryData.data.name,
              description: directoryData.data.description,
              theme: directoryData.data.theme,
              categories: directoryData.data.categories,
              // Exclude sensitive info like deployment configs
            }),
            { status: 200, headers }
          );
          
        case 'listings':
          const categoryId = url.searchParams.get('category');
          
          // Get listings, either for a specific category or all
          const listings = categoryId 
            ? await getCategoryListings(directory, categoryId)
            : await getListings(directory);
          
          return new Response(
            JSON.stringify({ 
              count: listings.length,
              items: listings.map(listing => ({
                slug: listing.slug.replace(`${directory}/`, ''),
                title: listing.data.title,
                description: listing.data.description,
                category: listing.data.category,
                featured: listing.data.featured,
                images: listing.data.images,
                // Exclude full content for listing list endpoints to reduce payload size
              }))
            }),
            { status: 200, headers }
          );
          
        case 'listing':
          const slug = url.searchParams.get('slug');
          
          if (!slug) {
            return new Response(
              JSON.stringify({ error: 'Slug parameter required' }),
              { status: 400, headers }
            );
          }
          
          const listing = await getListing(directory, slug);
          
          if (!listing) {
            return new Response(
              JSON.stringify({ error: 'Listing not found' }),
              { status: 404, headers }
            );
          }
          
          // Get the HTML content
          const { Content } = await listing.render();
          
          return new Response(
            JSON.stringify({ 
              ...listing.data,
              content: Content
            }),
            { status: 200, headers }
          );
          
        case 'landing-pages':
          const landingPages = await getLandingPages(directory);
          
          return new Response(
            JSON.stringify({ 
              count: landingPages.length,
              items: landingPages.map(page => ({
                slug: page.slug.replace(`${directory}/`, ''),
                title: page.data.title,
                description: page.data.description,
                featuredImage: page.data.featuredImage,
                // Exclude full content
              }))
            }),
            { status: 200, headers }
          );
          
        case 'search':
          const query = url.searchParams.get('q');
          
          if (!query) {
            return new Response(
              JSON.stringify({ error: 'Search query required' }),
              { status: 400, headers }
            );
          }
          
          const searchResults = await searchListings(directory, query);
          
          return new Response(
            JSON.stringify({ 
              count: searchResults.length,
              query,
              items: searchResults.map(result => ({
                slug: result.slug.replace(`${directory}/`, ''),
                title: result.data.title,
                description: result.data.description,
                category: result.data.category,
                featured: result.data.featured,
                images: result.data.images && result.data.images.length > 0 
                  ? [result.data.images[0]] 
                  : [],
                // Include only first image and exclude full content
              }))
            }),
            { status: 200, headers }
          );
          
        case 'clear-cache':
          // Webhook endpoint to clear cache - should be secured
          const secret = url.searchParams.get('secret');
          
          if (secret !== process.env.WEBHOOK_SECRET) {
            return new Response(
              JSON.stringify({ error: 'Invalid webhook secret' }),
              { status: 401, headers }
            );
          }
          
          const cacheType = url.searchParams.get('type');
          clearCache(cacheType);
          
          return new Response(
            JSON.stringify({ success: true, message: 'Cache cleared' }),
            { status: 200, headers }
          );
          
        default:
          return new Response(
            JSON.stringify({ error: 'Unknown endpoint' }),
            { status: 404, headers }
          );
      }
    } catch (error) {
      console.error(`API error:`, error);
      
      return new Response(
        JSON.stringify({ error: 'Server error', message: error.message }),
        { status: 500, headers }
      );
    }
  }