// src/pages/api/rebuild.js
/**
 * Simple webhook endpoint for triggering rebuilds when content changes in NocoDB
 * 
 * This webhook can be called by:
 * 1. NocoDB when content is updated
 * 2. Scheduled tasks to refresh content
 * 3. Manual triggers for immediate updates
 */
import { clearCache } from '../../lib/nocodb';

export async function post({ request }) {
  try {
    // Extract data from request
    const body = await request.json();
    const { secret, directory, tableName, recordId } = body;
    
    // Validate webhook secret
    if (secret !== import.meta.env.WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid webhook secret' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Clear relevant cache entries
    if (tableName) {
      // If a specific table is specified, only clear that cache
      clearCache(tableName);
      console.log(`Cleared cache for ${tableName}`);
    } else if (directory) {
      // If directory is specified, clear all caches related to that directory
      clearCache('directories');
      clearCache('listings');
      clearCache('landing_pages');
      console.log(`Cleared all caches for directory: ${directory}`);
    } else {
      // Clear all caches
      clearCache();
      console.log('Cleared all caches');
    }
    
    // Trigger a rebuild if we have a hosting platform that supports it
    let rebuildTriggered = false;
    
    // Try to trigger a rebuild based on the available environment
    if (import.meta.env.NETLIFY_BUILD_HOOK) {
      // Netlify build hook
      try {
        const response = await fetch(import.meta.env.NETLIFY_BUILD_HOOK, {
          method: 'POST',
          body: JSON.stringify({ 
            clear_cache: false,
            // You can specify paths parameter for some providers for partial builds
          })
        });
        
        if (response.ok) {
          rebuildTriggered = true;
          console.log('Triggered Netlify rebuild');
        }
      } catch (error) {
        console.error('Failed to trigger Netlify rebuild:', error);
      }
    } else if (import.meta.env.VERCEL_DEPLOY_HOOK) {
      // Vercel deploy hook
      try {
        const response = await fetch(import.meta.env.VERCEL_DEPLOY_HOOK, {
          method: 'POST'
        });
        
        if (response.ok) {
          rebuildTriggered = true;
          console.log('Triggered Vercel rebuild');
        }
      } catch (error) {
        console.error('Failed to trigger Vercel rebuild:', error);
      }
    } else if (import.meta.env.GITHUB_WORKFLOW_DISPATCH_URL && import.meta.env.GITHUB_TOKEN) {
      // GitHub Actions workflow dispatch
      try {
        const response = await fetch(import.meta.env.GITHUB_WORKFLOW_DISPATCH_URL, {
          method: 'POST',
          headers: {
            'Authorization': `token ${import.meta.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: 'main', // or your default branch
            inputs: {
              directory: directory || '',
              tableName: tableName || '',
              recordId: recordId || ''
            }
          })
        });
        
        if (response.ok) {
          rebuildTriggered = true;
          console.log('Triggered GitHub Actions workflow');
        }
      } catch (error) {
        console.error('Failed to trigger GitHub Actions workflow:', error);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cache cleared',
        rebuildTriggered
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rebuild webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Rebuild webhook error',
        error: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}