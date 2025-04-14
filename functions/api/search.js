/**
 * Search API endpoint for Cloudflare Function
 */
export async function onRequest(context) {
  try {
    // Get search parameters from request URL
    const { request, env } = context;
    const url = new URL(request.url);
    const directoryId = url.searchParams.get('directory');
    const query = url.searchParams.get('q');
    
    // Get environment variables
    const apiUrl = env.NOCODB_API_URL;
    const apiToken = env.NOCODB_AUTH_TOKEN;
    
    if (!apiUrl || !apiToken) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'API configuration is missing'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
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
    
    // Sanitize the search query
    const sanitizedQuery = query.replace(/['";]/g, '').trim();
    
    // Construct the API URL to search listings from NocoDB
    const listingsTable = 'mvy1lrp2wr35vo0'; // Your listings table ID
    const apiEndpoint = `${apiUrl}/tables/${listingsTable}/records`;
    
    // Create the query condition for NocoDB v2 API
    const queryCondition = `(Directory Identifier,eq,${directoryId})~and((Title,like,%${sanitizedQuery}%)~or(Description,like,%${sanitizedQuery}%)~or(Content,like,%${sanitizedQuery}%))`;
    
    // Fetch from NocoDB
    const response = await fetch(`${apiEndpoint}?where=${encodeURIComponent(queryCondition)}`, {
      headers: {
        'xc-token': apiToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process the results
    const results = await Promise.all((data.list || []).map(async listing => {
      // Parse JSON fields safely
      const safeParseJSON = (str, fallback) => {
        try {
          return str ? JSON.parse(str) : fallback;
        } catch (e) {
          return fallback;
        }
      };
      
      // Map NocoDB fields to our format
      return {
        slug: `${listing['Directory Identifier']}/${listing.Slug}`,
        data: {
          title: listing.Title,
          description: listing.Description,
          directory: listing['Directory Identifier'],
          category: listing.Category,
          featured: listing.Featured === 1 || listing.Featured === true,
          images: safeParseJSON(listing.Images, []),
          address: listing.Address,
          website: listing.Website,
          phone: listing.Phone,
          rating: listing.Rating,
          tags: safeParseJSON(listing.Tags, []),
          openingHours: safeParseJSON(listing.Opening_Hours, []),
          customFields: safeParseJSON(listing.Custom_Fields, {})
        }
      };
    }));
    
    // Filter tags client-side if needed
    const filteredResults = results.filter(listing => {
      // Include already if matched by title/description/content
      if (results.length > 0) return true;
      
      // Check tags
      if (listing.data.tags && listing.data.tags.length > 0) {
        return listing.data.tags.some(tag => 
          tag.toLowerCase().includes(sanitizedQuery.toLowerCase())
        );
      }
      
      return false;
    });
    
    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        results: filteredResults
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