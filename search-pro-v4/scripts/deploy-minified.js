#!/usr/bin/env node
/**
 * Deploy Minified Files Script
 * Version 3.2 - Last Update on 11/01/2025
 * Backs up original files and promotes minified versions to production
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 Starting deployment process...\n");
console.log("This will:");
console.log("  1. Backup original files (.backup extension)");
console.log("  2. Rename .min.js files to .js");
console.log("  3. Rename .min.css files to .css\n");

// Files to deploy
const jsFiles = [
  "search-v3.js",
  "business-data/business-data-config.js",
  "dashboard/js/control-panel-v3.js",
  "dashboard/js/control-panel-core.js",
  "dashboard/js/general-tab.js",
  "dashboard/js/appearance-tab.js",
  "dashboard/js/display-tab.js",
  "dashboard/js/content-tab.js",
  "dashboard/js/filtering-tab.js",
  "dashboard/js/data-sources-tab.js",
  "dashboard/js/advanced-tab.js",
  "dashboard/js/knowledge-tab.js",
  "dashboard/js/modal-system.js",
  "dashboard/js/toast.js",
  "dashboard/js/tab-loader.js",
  "dashboard/js/fab-menu.js",
  "dashboard/js/sidebar-menu.js",
  "dashboard/js/validation-messages.js",
  "dashboard/js/debug-core-v3.js",
  "dashboard/js/logo-manager.js",
  "dashboard/js/emoji-library.js",
  "dashboard/js/fontawesome-icons.js",
];

const cssFiles = [
  "css/search-v3.css",
  "dashboard/css/control-panel-v3.css",
  "dashboard/css/control-panel-tooltip.css",
  "dashboard/css/fab-menu.css",
  "dashboard/css/modal-system.css",
  "dashboard/css/sidebar-menu.css",
  "dashboard/css/tab-loader.css",
  "dashboard/css/toast.css",
  "dashboard/css/validation-messages.css",
];

const allFiles = [...jsFiles, ...cssFiles];

let successCount = 0;
let errorCount = 0;
let skippedCount = 0;

console.log("📦 Processing files...\n");

allFiles.forEach((file, index) => {
  const ext = path.extname(file);
  const minFile = file.replace(ext, `.min${ext}`);
  const backupFile = file.replace(ext, `.backup${ext}`);

  const originalPath = path.join(__dirname, "..", file);
  const minPath = path.join(__dirname, "..", minFile);
  const backupPath = path.join(__dirname, "..", backupFile);

  console.log(`[${index + 1}/${allFiles.length}] ${file}`);

  try {
    // Check if minified file exists
    if (!fs.existsSync(minPath)) {
      console.log(`   ⚠️  Minified file not found: ${minFile}`);
      skippedCount++;
      console.log("");
      return;
    }

    // Check if original file exists
    if (!fs.existsSync(originalPath)) {
      console.log(`   ⚠️  Original file not found: ${file}`);
      skippedCount++;
      console.log("");
      return;
    }

    // Backup original file (rename to .backup)
    if (fs.existsSync(backupPath)) {
      // Remove old backup if it exists
      fs.unlinkSync(backupPath);
    }
    fs.renameSync(originalPath, backupPath);
    console.log(`   ✅ Backed up: ${file} → ${path.basename(backupFile)}`);

    // Rename minified file to production name
    fs.renameSync(minPath, originalPath);
    console.log(`   ✅ Deployed: ${path.basename(minFile)} → ${file}`);

    successCount++;
    console.log("");
  } catch (error) {
    console.error(`   ❌ Error processing ${file}:`, error.message);
    errorCount++;
    console.log("");
  }
});

// Summary
console.log("=".repeat(60));
console.log("📊 DEPLOYMENT SUMMARY");
console.log("=".repeat(60));
console.log(`✅ Successfully deployed: ${successCount} files`);
console.log(`⚠️  Skipped: ${skippedCount} files`);
console.log(`❌ Failed: ${errorCount} files`);
console.log("=".repeat(60) + "\n");

if (errorCount === 0 && skippedCount === 0) {
  console.log("🎉 All files deployed successfully!");
  console.log("📁 Original files backed up with .backup extension");
  console.log("🚀 Production files are now minified versions\n");
} else if (errorCount > 0) {
  console.log("⚠️  Some files failed to deploy. Check the errors above.\n");
  process.exit(1);
} else {
  console.log("⚠️  Some files were skipped. Check the warnings above.\n");
}
