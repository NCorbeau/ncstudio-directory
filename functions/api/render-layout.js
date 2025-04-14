/**
 * Cloudflare Function to render layouts on demand
 * This is a simplified version that returns raw data for client-side rendering
 */
import { getDirectoryConfig, getDirectoryListings } from '../../src/lib/nocodb.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    
    // Get query parameters
    const url = new URL(request.url);
    const layoutType = url.searchParams.get('layout');
    const directoryId = url.searchParams.get('directory');
    
    // Validate required parameters
    if (!layoutType || !directoryId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: layout and directory are required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Set environment variables from context
    const NOCODB_API_URL = env.NOCODB_API_URL;
    const NOCODB_AUTH_TOKEN = env.NOCODB_AUTH_TOKEN;
    
    if (!NOCODB_API_URL || !NOCODB_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'API configuration is missing'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Get directory data
    let directoryData;
    try {
      directoryData = await getDirectory(directoryId);
      
      if (!directoryData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Directory not found: ${directoryId}`
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error fetching directory: ${error.message}`
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Get listings for this directory
    let listings;
    try {
      listings = await getListings(directoryId);
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error fetching listings: ${error.message}`
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Validate layout type
    const validLayouts = ['Card', 'Map', 'Table', 'Magazine', 'List'];
    if (!validLayouts.includes(layoutType)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid layout type: ${layoutType}`
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Return the data for client-side rendering
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          layout: layoutType,
          listings: listings,
          directory: directoryData.data,
          categories: directoryData.data.categories || []
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300' // Cache for 5 minutes
        }
      }
    );
  } catch (error) {
    console.error('Error in layout API:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error processing request',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}