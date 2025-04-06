/**
 * Webhook handler for NocoDB content updates
 * 
 * This endpoint receives webhooks from NocoDB when content changes,
 * and triggers a GitHub Action to rebuild the affected directory.
 * It also provides direct cache invalidation for rapid content updates.
 */
import { clearCache } from '../../lib/nocodb.js';

export async function post({ request }) {
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
        if (payload.data.directory) {
          affectedDirectory = payload.data.directory;
        }
        
        // Fallback: try to extract from slug
        else if (payload.data.slug && payload.data.slug.includes('/')) {
          affectedDirectory = payload.data.slug.split('/')[0];
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
      
      // Immediately invalidate the cache for faster content updates
      const cacheType = table === TABLES.directories ? 'directories' : 
                        table === TABLES.listings ? 'listings' : 
                        table === TABLES.landingPages ? 'landingPages' : null;
                        
      if (cacheType) {
        clearCache(cacheType, affectedDirectory !== 'all' ? affectedDirectory : null);
        console.log(`Cache invalidated for ${cacheType} in ${affectedDirectory !== 'all' ? 'directory ' + affectedDirectory : 'all directories'}`);
      }
      
      // Get GitHub token from environment variable
      const githubToken = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
      const githubRepo = import.meta.env.GITHUB_REPO || process.env.GITHUB_REPO || 'yourusername/yourrepo';
      
      if (!githubToken) {
        throw new Error('GITHUB_TOKEN environment variable is not set');
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
      return new Response(
        JSON.stringify({
          success: true,
          message: `Rebuild triggered for directory: ${affectedDirectory}`,
          cacheInvalidated: cacheType !== null
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error processing webhook:', error);
      
      // Return error response
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error processing webhook',
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