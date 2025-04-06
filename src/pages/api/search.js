/**
 * Search API endpoint
 * This endpoint can be called from client-side JavaScript to search listings
 */
import { searchDirectoryListings } from '../../utils/directory-helpers';

export async function get({ request }) {
  try {
    // Get search parameters from request URL
    const url = new URL(request.url);
    const directoryId = url.searchParams.get('directory');
    const query = url.searchParams.get('q');
    
    // Validate parameters
    if (!directoryId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Directory ID is required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    if (!query || query.trim() === '') {
      return new Response(
        JSON.stringify({
          success: true,
          results: []
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Perform search
    const results = await searchDirectoryListings(directoryId, query);
    
    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        results: results
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60' // Cache for 60 seconds
        }
      }
    );
  } catch (error) {
    console.error('Error in search API:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error processing search request',
        error: error.message
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