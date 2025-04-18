/**
 * API endpoint for fetching directory data
 */
export async function onRequest(context) {
    try {
      // Get parameters from request URL
      const { request, env } = context;
      const url = new URL(request.url);
      const directoryId = url.searchParams.get('id');
      
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
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            }
          }
        );
      }
      
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
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }
      
      // Table ID for directories
      const directoriesTable = 'm823s0ww0l4mekb';
      
      // Fetch directory data from NocoDB
      const response = await fetch(
        `${apiUrl}/tables/${directoriesTable}/records?where=(Identifier,eq,${directoryId})&limit=1`,
        {
          headers: {
            'xc-token': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // If no directory found
      if (!data.list || data.list.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Directory not found: ${directoryId}`
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }
      
      // Get the directory data
      const directory = data.list[0];
      
      // Helper function to safely parse JSON
      const safeParseJSON = (str, fallback) => {
        try {
          return str ? JSON.parse(str) : fallback;
        } catch (e) {
          return fallback;
        }
      };
      
      // Transform the data
      const transformedData = {
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
        categories: safeParseJSON(directory.Categories, []),
        metaTags: safeParseJSON(directory.Meta_Tags, {}),
        socialLinks: safeParseJSON(directory.Social_Links, []),
        deployment: safeParseJSON(directory.Deployment, {})
      };
      
      // Return the directory data
      return new Response(
        JSON.stringify({
          success: true,
          data: transformedData
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
      console.error('Error in directory API:', error);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error processing directory request',
          error: error.message
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  }