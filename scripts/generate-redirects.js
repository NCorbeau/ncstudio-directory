// scripts/generate-redirects.js
/**
 * Script to generate _redirects file dynamically based on NocoDB directory data
 */
import fs from 'fs';
import path from 'path';
import { generateRedirectRules } from './directory-loader.js';

async function main() {
  try {
    console.log('Generating _redirects file from NocoDB directory data...');
    
    // Generate redirect rules
    const redirectRules = await generateRedirectRules();
    
    // Path to output redirect file
    const redirectsPath = path.resolve('./dist/_redirects');
    
    // Write the file
    fs.writeFileSync(redirectsPath, redirectRules);
    
    console.log('Successfully generated _redirects file at:', redirectsPath);
    
    // Also update the route rules
    console.log('Generating _routes.json file...');
    
    const routeRules = await generateRouteRules();
    const routesPath = path.resolve('./dist/_routes.json');
    
    // Write the routes file
    fs.writeFileSync(routesPath, JSON.stringify(routeRules, null, 2));
    
    console.log('Successfully generated _routes.json file at:', routesPath);
    
    // Generate mapping file for runtime asset-rewrite.js
    console.log('Generating domain mapping for asset rewriting...');
    
    const domainMapping = await getDomainDirectoryMapping();
    const mappingJS = `// Auto-generated domain to directory mapping
export const domainToDirectory = ${JSON.stringify(domainMapping, null, 2)};`;
    
    const mappingPath = path.resolve('./functions/domain-mapping.js');
    fs.writeFileSync(mappingPath, mappingJS);
    
    console.log('Successfully generated domain mapping file at:', mappingPath);
    
  } catch (error) {
    console.error('Error generating _redirects file:', error);
    process.exit(1);
  }
}

// Run the main function if called directly
if (process.argv[1] === import.meta.url) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}