/**
 * Webhook handler for NocoDB content updates
 * 
 * This endpoint receives webhooks from NocoDB when content changes,
 * and triggers a GitHub Action to rebuild the affected directory.
 * It also provides direct cache invalidation for rapid content updates.
 */

// Table mapping to handle NocoDB naming conventions - should match the ones in nocodb.js
const TABLES = {
    directories: 'm823s0ww0l4mekb',
    listings: 'mvy1lrp2wr35vo0',
    landingPages: 'mbrnluso1gxfwd4'
  };
  
  export async function onRequest(context) {
    const { request, env } = context;
    
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    try {
      // Get the webhook data
      const payload = await request.json();
      
      console.log('Received webhook from NocoDB:', JSON.stringify(payload, null, 2));
      
      // Determine which directory was affected
      // This depends on the structure of your NocoDB webhook payload
      let affectedDirectory = 'all';
      let operation = 'unknown';
      let table = '';
      
      // Extract directory from various possible payload structures
      if (payload.data) {
        // Direct access if available
        if (payload.data.directory || payload.data.Directory) {
          affectedDirectory = payload.data.directory || payload.data.Directory;
        }
        
        // Fallback: try to extract from slug
        else if ((payload.data.slug || payload.data.Slug) && 
                 (payload.data.slug || payload.data.Slug).includes('/')) {
          affectedDirectory = (payload.data.slug || payload.data.Slug).split('/')[0];
        }
      }
      
      // Get operation type
      if (payload.event) {
        operation = payload.event;
      } else if (payload.operation) {
        operation = payload.operation;
      }
      
      // Get table name
      if (payload.table) {
        table = payload.table;
      } else if (payload.model) {
        table = payload.model;
      }
      
      console.log(`Identified affected directory: ${affectedDirectory}`);
      console.log(`Operation: ${operation}, Table: ${table}`);
      
      // Get GitHub token from environment variable
      const githubToken = env.GITHUB_TOKEN;
      const githubRepo = env.GITHUB_REPO || 'yourusername/ncstudio-directory';
      
      if (!githubToken) {
        console.warn('GITHUB_TOKEN environment variable is not set. Skipping GitHub Action trigger.');
        
        // Even without GitHub token, we can return success for the webhook itself
        return new Response(JSON.stringify({
          success: true,
          message: `Webhook received for directory: ${affectedDirectory}`,
          warning: 'GitHub Action not triggered due to missing token'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Trigger GitHub Action
      const response = await fetch(
        `https://api.github.com/repos/${githubRepo}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event_type: 'content-update',
            client_payload: {
              directory: affectedDirectory,
              operation: operation,
              table: table,
              timestamp: new Date().toISOString()
            }
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      console.log(`Successfully triggered rebuild for ${affectedDirectory}`);
      
      // Return success response
      return new Response(JSON.stringify({
        success: true,
        message: `Rebuild triggered for directory: ${affectedDirectory}`,
        details: {
          directory: affectedDirectory,
          operation: operation,
          table: table
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      
      // Return error response
      return new Response(JSON.stringify({
        success: false,
        message: 'Error processing webhook',
        error: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  // Handle OPTIONS requests for CORS
  export async function onRequestOptions() {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }