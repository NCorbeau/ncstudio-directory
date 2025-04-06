// Function to copy all public assets to a directory's build output
// This ensures CSS files and other static assets are available in each directory's build
export function copyPublicAssetsToDirectory(directoryId) {
    const publicDir = path.resolve('./public');
    const targetDir = path.resolve(`./dist/${directoryId}`);
    
    console.log(`Copying public assets from ${publicDir} to ${targetDir}...`);
    
    // Function to copy directory recursively
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        // Skip _headers and _redirects as they're handled separately
        if (entry.name === '_headers' || entry.name === '_redirects') {
          continue;
        }
        
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyDir(publicDir, targetDir);
    console.log(`Copied public assets to ${directoryId}`);
  }