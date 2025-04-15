/**
 * Cloudflare Function to fetch layout data
 * This returns data for client-side layout rendering without using dotenv
 */

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
      
      // Get NocoDB API credentials from environment variables
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
  
      // Table mapping (copied from nocodb.js)
      const TABLES = {
        directories: 'm823s0ww0l4mekb',
        listings: 'mvy1lrp2wr35vo0'
      };
      
      // Fetch directory data directly
      let directoryData;
      try {
        const directoryResponse = await fetch(
          `${NOCODB_API_URL}/tables/${TABLES.directories}/records?where=(Identifier,eq,${directoryId})&limit=1`, 
          {
            headers: {
              'xc-token': NOCODB_AUTH_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!directoryResponse.ok) {
          throw new Error(`Failed to fetch directory: ${directoryResponse.status}`);
        }
        
        const directoryResult = await directoryResponse.json();
        
        if (!directoryResult.list || directoryResult.list.length === 0) {
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
        
        // Transform directory data 
        const directory = directoryResult.list[0];
        directoryData = {
          id: directory.Identifier,
          name: directory.Name,
          description: directory.Description,
          domain: directory.Domain,
          theme: directory.Theme || 'default',
          availableLayouts: directory.Available_Layouts?.split(',') || ['Card'],
          defaultLayout: directory.Default_Layout || 'Card',
          primaryColor: directory.Primary_Color || '#3366cc',
          secondaryColor: directory.Secondary_Color,
          logo: directory.Logo,
          categories: directory.Categories ? JSON.parse(directory.Categories) : [],
          metaTags: directory.Meta_Tags ? JSON.parse(directory.Meta_Tags) : {}
        };
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
      
      // Fetch listings data directly
      let listings;
      try {
        const listingsResponse = await fetch(
          `${NOCODB_API_URL}/tables/${TABLES.listings}/records?where=(Directory%20Identifier,eq,${directoryId})`, 
          {
            headers: {
              'xc-token': NOCODB_AUTH_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!listingsResponse.ok) {
          throw new Error(`Failed to fetch listings: ${listingsResponse.status}`);
        }
        
        const listingsResult = await listingsResponse.json();
        
        // Transform listings data
        listings = listingsResult.list.map(listing => ({
          slug: `${listing['Directory Identifier']}/${listing.Slug}`,
          data: {
            title: listing.Title,
            description: listing.Description,
            directory: listing['Directory Identifier'],
            category: listing.Category,
            featured: listing.Featured === 1 || listing.Featured === true,
            images: listing.Images ? JSON.parse(listing.Images) : [],
            address: listing.Address,
            website: listing.Website,
            phone: listing.Phone,
            rating: listing.Rating,
            tags: listing.Tags ? JSON.parse(listing.Tags) : [],
            openingHours: listing.Opening_Hours ? JSON.parse(listing.Opening_Hours) : [],
            customFields: listing.Custom_Fields ? JSON.parse(listing.Custom_Fields) : {},
            updatedAt: listing.UpdatedAt
          }
        }));
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
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
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
            listings,
            directory: directoryData,
            categories: directoryData.categories || []
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300', // Cache for 5 minutes
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
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
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }
  }