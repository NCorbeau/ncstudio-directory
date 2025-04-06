// scripts/cleanup-build.js
// This script removes unwanted nested directories in the build output

import fs from "fs";
import path from "path";

/**
 * Identify and clean up nested directory folders in build output
 * @param {string} directoryId - The directory ID being processed
 */
export function cleanupNestedDirectories(directoryId) {
  console.log(`Cleaning up nested directories in ${directoryId} build...`);

  const distDir = path.resolve(`./dist/${directoryId}`);

  // Check if the directory exists
  if (!fs.existsSync(distDir)) {
    console.warn(`Directory ${distDir} does not exist, skipping cleanup.`);
    return;
  }

  // Get the directories we need to check for nesting
  const allDirectories = fs.readdirSync("./dist").filter((dir) => {
    const dirPath = path.join("./dist", dir);
    return (
      fs.statSync(dirPath).isDirectory() &&
      dir !== "directory-selector" &&
      dir !== "functions" &&
      !dir.startsWith(".")
    );
  });

  // For each possible nested directory
  for (const nestedDirName of allDirectories) {
    const nestedDirPath = path.join(distDir, nestedDirName);

    // If this nested directory exists, we need to clean it up
    if (
      fs.existsSync(nestedDirPath) &&
      fs.statSync(nestedDirPath).isDirectory()
    ) {
      // Only proceed if this is truly a nested duplicate, not just a coincidentally named folder
      const categoryDir = path.join(nestedDirPath, "category");
      const categoryDirExists =
        fs.existsSync(categoryDir) && fs.statSync(categoryDir).isDirectory();

      // If it has a category subfolder, it's likely our duplicate structure
      if (categoryDirExists) {
        console.log(`Found nested directory: ${nestedDirPath}`);

        // Option 1: Delete the nested directory
        fs.rmSync(nestedDirPath, { recursive: true, force: true });
        console.log(`Removed nested directory: ${nestedDirPath}`);

        // Option 2: Alternative approach - move files up if the nested dir is the same as current dir
        // if (nestedDirName === directoryId) {
        //   // Move all files from nested dir to parent dir
        //   moveFilesUp(nestedDirPath, distDir);
        //   console.log(`Moved files from ${nestedDirPath} to ${distDir}`);
        // } else {
        //   // Different directory, just remove it
        //   fs.rmSync(nestedDirPath, { recursive: true, force: true });
        //   console.log(`Removed nested directory: ${nestedDirPath}`);
        // }
      }
    }
  }

  console.log(`Cleanup complete for ${directoryId}`);
}

/**
 * Helper function to move files from a subdirectory up one level
 * @param {string} sourceDir - Source directory
 * @param {string} targetDir - Target directory
 */
function moveFilesUp(sourceDir, targetDir) {
  // Get all files and subdirectories
  const items = fs.readdirSync(sourceDir);

  // Process each item
  for (const item of items) {
    const sourcePath = path.join(sourceDir, item);
    const targetPath = path.join(targetDir, item);

    // Skip if the target already exists
    if (fs.existsSync(targetPath)) {
      console.log(`Target already exists, skipping: ${targetPath}`);
      continue;
    }

    // If it's a directory, create it in the target and move its contents recursively
    if (fs.statSync(sourcePath).isDirectory()) {
      fs.mkdirSync(targetPath, { recursive: true });
      moveFilesUp(sourcePath, targetPath);
    } else {
      // Move the file
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  // Clean up the source directory after moving everything
  fs.rmSync(sourceDir, { recursive: true, force: true });
}
