/**
 * This script handles deploying each directory to its own domain/hosting
 * It supports different deployment methods:
 * - FTP upload
 * - SSH/SFTP upload
 * - Cloud storage (AWS S3, Google Cloud Storage)
 * - GitHub Pages deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import FtpClient from 'ftp';
import { Client as SshClient } from 'ssh2';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Configuration
const BUILD_DIR = path.resolve('./dist');
const CONFIG_DIR = path.resolve('./src/content/directories');

// Get deployment method from command line or default to 'manual'
const deployMethod = process.argv[2] || 'manual';
const specificDirectory = process.argv[3]; // Optional: deploy only this directory

// Get all directories or a specific one
function getDirectoriesToDeploy() {
  const directoryFiles = fs.readdirSync(CONFIG_DIR)
    .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
  
  if (specificDirectory) {
    const matchingFile = directoryFiles.find(file => 
      path.basename(file, path.extname(file)) === specificDirectory
    );
    
    if (!matchingFile) {
      console.error(`Error: Directory "${specificDirectory}" not found`);
      process.exit(1);
    }
    
    return [matchingFile];
  }
  
  return directoryFiles;
}

// Load directory configuration
function loadDirectoryConfig(filename) {
  const configPath = path.join(CONFIG_DIR, filename);
  return yaml.load(fs.readFileSync(configPath, 'utf8'));
}

// Check if a directory build exists
function buildExists(directoryId) {
  const buildPath = path.join(BUILD_DIR, directoryId);
  return fs.existsSync(buildPath);
}

// Deploy functions for different methods
const deployMethods = {
  // Manual deployment - creates a zip file for each directory
  manual: async (directoryId, config) => {
    console.log(`Preparing ${directoryId} for manual deployment to ${config.domain}...`);
    
    const buildPath = path.join(BUILD_DIR, directoryId);
    const zipPath = path.join(BUILD_DIR, `${directoryId}.zip`);
    
    // Create ZIP file of the build
    execSync(`cd "${buildPath}" && zip -r "${zipPath}" ./*`, { stdio: 'inherit' });
    
    console.log(`Created deployment package: ${zipPath}`);
    console.log(`To deploy manually, upload this ZIP file to your hosting provider for ${config.domain}`);
    
    return { 
      success: true, 
      method: 'manual', 
      outputFile: zipPath 
    };
  },
  
  // FTP deployment
  ftp: async (directoryId, config) => {
    if (!config.deployment?.ftp) {
      console.error(`FTP deployment configuration missing for ${directoryId}`);
      return { success: false, error: 'Missing FTP configuration' };
    }
    
    const { host, user, password, path: remotePath } = config.deployment.ftp;
    console.log(`Deploying ${directoryId} to ${config.domain} via FTP...`);
    
    return new Promise((resolve) => {
      const ftp = new FtpClient();
      
      ftp.on('ready', async () => {
        try {
          // Create remote directory if it doesn't exist
          try {
            await new Promise((res, rej) => {
              ftp.mkdir(remotePath, true, (err) => {
                if (err && err.code !== 550) rej(err);
                else res();
              });
            });
          } catch (err) {
            console.warn(`Warning: ${err.message}`);
          }
          
          // Upload all files in the build directory
          const buildPath = path.join(BUILD_DIR, directoryId);
          const files = fs.readdirSync(buildPath, { recursive: true });
          
          for (const file of files) {
            const localPath = path.join(buildPath, file);
            const remoteFtpPath = path.join(remotePath, file);
            
            if (fs.statSync(localPath).isDirectory()) {
              try {
                await new Promise((res, rej) => {
                  ftp.mkdir(remoteFtpPath, true, (err) => {
                    if (err && err.code !== 550) rej(err);
                    else res();
                  });
                });
              } catch (err) {
                console.warn(`Warning: ${err.message}`);
              }
            } else {
              await new Promise((res, rej) => {
                ftp.put(localPath, remoteFtpPath, (err) => {
                  if (err) rej(err);
                  else res();
                });
              });
            }
          }
          
          console.log(`Successfully deployed ${directoryId} to ${config.domain} via FTP`);
          ftp.end();
          resolve({ success: true, method: 'ftp' });
        } catch (error) {
          console.error(`Error deploying ${directoryId} via FTP:`, error);
          ftp.end();
          resolve({ success: false, error: error.message });
        }
      });
      
      ftp.on('error', (err) => {
        console.error(`FTP connection error for ${directoryId}:`, err);
        resolve({ success: false, error: err.message });
      });
      
      ftp.connect({
        host,
        user,
        password,
        port: 21
      });
    });
  },
  
  // SSH/SFTP deployment
  ssh: async (directoryId, config) => {
    if (!config.deployment?.ssh) {
      console.error(`SSH deployment configuration missing for ${directoryId}`);
      return { success: false, error: 'Missing SSH configuration' };
    }
    
    const { host, user, privateKey, path: remotePath } = config.deployment.ssh;
    console.log(`Deploying ${directoryId} to ${config.domain} via SSH...`);
    
    const privateKeyContent = fs.readFileSync(
      privateKey.startsWith('/') ? privateKey : path.resolve(privateKey),
      'utf8'
    );
    
    return new Promise((resolve) => {
      const ssh = new SshClient();
      
      ssh.on('ready', () => {
        ssh.sftp((err, sftp) => {
          if (err) {
            console.error(`SFTP error for ${directoryId}:`, err);
            ssh.end();
            resolve({ success: false, error: err.message });
            return;
          }
          
          // Create remote directory
          ssh.exec(`mkdir -p ${remotePath}`, (err) => {
            if (err) {
              console.error(`Error creating remote directory for ${directoryId}:`, err);
              ssh.end();
              resolve({ success: false, error: err.message });
              return;
            }
            
            // Use rsync for efficient transfer
            const buildPath = path.join(BUILD_DIR, directoryId);
            const localPath = `${buildPath}/`;
            
            const rsyncCommand = `rsync -av --delete -e "ssh -i ${privateKey}" ${localPath} ${user}@${host}:${remotePath}`;
            
            try {
              execSync(rsyncCommand, { stdio: 'inherit' });
              console.log(`Successfully deployed ${directoryId} to ${config.domain} via SSH`);
              ssh.end();
              resolve({ success: true, method: 'ssh' });
            } catch (error) {
              console.error(`Rsync error for ${directoryId}:`, error);
              ssh.end();
              resolve({ success: false, error: error.message });
            }
          });
        });
      });
      
      ssh.on('error', (err) => {
        console.error(`SSH connection error for ${directoryId}:`, err);
        resolve({ success: false, error: err.message });
      });
      
      ssh.connect({
        host,
        username: user,
        privateKey: privateKeyContent,
        port: 22
      });
    });
  },
  
  // AWS S3 deployment
  s3: async (directoryId, config) => {
    if (!config.deployment?.s3) {
      console.error(`S3 deployment configuration missing for ${directoryId}`);
      return { success: false, error: 'Missing S3 configuration' };
    }
    
    const { bucket, region, prefix = '' } = config.deployment.s3;
    console.log(`Deploying ${directoryId} to ${config.domain} via AWS S3...`);
    
    try {
      const s3Client = new S3Client({ region });
      const buildPath = path.join(BUILD_DIR, directoryId);
      
      // Upload all files in the build directory
      const files = fs.readdirSync(buildPath, { recursive: true });
      
      for (const file of files) {
        const localPath = path.join(buildPath, file);
        
        if (!fs.statSync(localPath).isDirectory()) {
          const fileContent = fs.readFileSync(localPath);
          const key = path.join(prefix, file);
          
          // Determine content type
          let contentType = 'application/octet-stream';
          const ext = path.extname(file).toLowerCase();
          
          if (ext === '.html') contentType = 'text/html';
          else if (ext === '.css') contentType = 'text/css';
          else if (ext === '.js') contentType = 'application/javascript';
          else if (ext === '.json') contentType = 'application/json';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
          else if (ext === '.svg') contentType = 'image/svg+xml';
          
          const params = {
            Bucket: bucket,
            Key: key,
            Body: fileContent,
            ContentType: contentType
          };
          
          await s3Client.send(new PutObjectCommand(params));
        }
      }
      
      console.log(`Successfully deployed ${directoryId} to ${config.domain} via S3`);
      return { success: true, method: 's3' };
    } catch (error) {
      console.error(`S3 error for ${directoryId}:`, error);
      return { success: false, error: error.message };
    }
  },
  
  // Google Cloud Storage deployment
  gcs: async (directoryId, config) => {
    if (!config.deployment?.gcs) {
      console.error(`GCS deployment configuration missing for ${directoryId}`);
      return { success: false, error: 'Missing GCS configuration' };
    }
    
    const { bucket, keyFilePath, prefix = '' } = config.deployment.gcs;
    console.log(`Deploying ${directoryId} to ${config.domain} via Google Cloud Storage...`);
    
    try {
      const storage = new Storage({
        keyFilename: keyFilePath
      });
      
      const buildPath = path.join(BUILD_DIR, directoryId);
      
      // Upload all files in the build directory
      const files = fs.readdirSync(buildPath, { recursive: true });
      
      for (const file of files) {
        const localPath = path.join(buildPath, file);
        
        if (!fs.statSync(localPath).isDirectory()) {
          const destination = path.join(prefix, file);
          
          // Determine content type
          let contentType = 'application/octet-stream';
          const ext = path.extname(file).toLowerCase();
          
          if (ext === '.html') contentType = 'text/html';
          else if (ext === '.css') contentType = 'text/css';
          else if (ext === '.js') contentType = 'application/javascript';
          else if (ext === '.json') contentType = 'application/json';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
          else if (ext === '.svg') contentType = 'image/svg+xml';
          
          await storage.bucket(bucket).upload(localPath, {
            destination,
            metadata: {
              contentType
            }
          });
        }
      }
      
      console.log(`Successfully deployed ${directoryId} to ${config.domain} via GCS`);
      return { success: true, method: 'gcs' };
    } catch (error) {
      console.error(`GCS error for ${directoryId}:`, error);
      return { success: false, error: error.message };
    }
  },
  
  // GitHub Pages deployment
  github: async (directoryId, config) => {
    if (!config.deployment?.github) {
      console.error(`GitHub Pages deployment configuration missing for ${directoryId}`);
      return { success: false, error: 'Missing GitHub Pages configuration' };
    }
    
    const { repo, branch = 'gh-pages', user, token } = config.deployment.github;
    console.log(`Deploying ${directoryId} to ${config.domain} via GitHub Pages...`);
    
    try {
      const buildPath = path.join(BUILD_DIR, directoryId);
      const tempRepo = path.join(BUILD_DIR, `${directoryId}-repo`);
      
      // Create a temporary repo
      fs.mkdirSync(tempRepo, { recursive: true });
      
      // Initialize git repo
      execSync(`
        cd "${tempRepo}" && 
        git init && 
        git config user.name "${user}" && 
        git config user.email "${user}@users.noreply.github.com" && 
        git remote add origin https://${token}@github.com/${repo}.git
      `, { stdio: 'inherit' });
      
      // Copy build files to repo
      execSync(`cp -r ${buildPath}/* ${tempRepo}/`);
      
      // Create CNAME file if domain is set
      if (config.domain) {
        fs.writeFileSync(path.join(tempRepo, 'CNAME'), config.domain);
      }
      
      // Commit and push
      execSync(`
        cd "${tempRepo}" && 
        git add . && 
        git commit -m "Deploy ${directoryId} to GitHub Pages" && 
        git push -f origin master:${branch}
      `, { stdio: 'inherit' });
      
      // Clean up
      fs.rmSync(tempRepo, { recursive: true, force: true });
      
      console.log(`Successfully deployed ${directoryId} to ${config.domain} via GitHub Pages`);
      return { success: true, method: 'github' };
    } catch (error) {
      console.error(`GitHub Pages error for ${directoryId}:`, error);
      return { success: false, error: error.message };
    }
  }
};

// Main deploy function
async function deploy() {
  console.log(`Starting deployment using method: ${deployMethod}`);
  
  // Check if deployment method exists
  if (!deployMethods[deployMethod]) {
    console.error(`Unknown deployment method: ${deployMethod}`);
    console.log(`Available methods: ${Object.keys(deployMethods).join(', ')}`);
    process.exit(1);
  }
  
  const directoryFiles = getDirectoriesToDeploy();
  const results = [];
  
  for (const file of directoryFiles) {
    const directoryId = path.basename(file, path.extname(file));
    const config = loadDirectoryConfig(file);
    
    // Skip if build doesn't exist
    if (!buildExists(directoryId)) {
      console.error(`Build directory for ${directoryId} not found. Run build first.`);
      results.push({
        directory: directoryId,
        domain: config.domain,
        success: false,
        error: 'Build directory not found'
      });
      continue;
    }
    
    try {
      // Deploy using the selected method
      const result = await deployMethods[deployMethod](directoryId, config);
      
      results.push({
        directory: directoryId,
        domain: config.domain,
        ...result
      });
    } catch (error) {
      console.error(`Error deploying ${directoryId}:`, error);
      results.push({
        directory: directoryId,
        domain: config.domain,
        success: false,
        error: error.message
      });
    }
  }
  
  // Output summary
  console.log('\n=== Deployment Summary ===');
  
  for (const result of results) {
    const status = result.success ? '✅ Success' : '❌ Failed';
    console.log(`${status} | ${result.directory} to ${result.domain} via ${result.method || 'unknown'}`);
    
    if (!result.success && result.error) {
      console.log(`  Error: ${result.error}`);
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`\nDeployed ${successful} directories, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run the deployment
deploy().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});