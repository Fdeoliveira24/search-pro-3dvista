#!/usr/bin/env node
/**
 * Restore Original Files Script
 * Version 3.2 - Last Update on 11/01/2025
 * Restores backed up original files (reverses deployment)
 */

const fs = require("fs");
const path = require("path");

console.log("🔄 Starting restoration process...\n");
console.log("This will:");
console.log("  1. Restore .backup files to original names");
console.log("  2. Keep current production files as .deployed\n");

// Files to restore
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
  const backupFile = file.replace(ext, `.backup${ext}`);
  const deployedFile = file.replace(ext, `.deployed${ext}`);

  const originalPath = path.join(__dirname, "..", file);
  const backupPath = path.join(__dirname, "..", backupFile);
  const deployedPath = path.join(__dirname, "..", deployedFile);

  console.log(`[${index + 1}/${allFiles.length}] ${file}`);

  try {
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      console.log(`   ⚠️  Backup not found: ${backupFile}`);
      skippedCount++;
      console.log("");
      return;
    }

    // Save current production file as .deployed
    if (fs.existsSync(originalPath)) {
      if (fs.existsSync(deployedPath)) {
        fs.unlinkSync(deployedPath);
      }
      fs.renameSync(originalPath, deployedPath);
      console.log(`   ✅ Saved current: ${file} → ${path.basename(deployedFile)}`);
    }

    // Restore backup file to original name
    fs.renameSync(backupPath, originalPath);
    console.log(`   ✅ Restored: ${path.basename(backupFile)} → ${file}`);

    successCount++;
    console.log("");
  } catch (error) {
    console.error(`   ❌ Error restoring ${file}:`, error.message);
    errorCount++;
    console.log("");
  }
});

// Summary
console.log("=".repeat(60));
console.log("📊 RESTORATION SUMMARY");
console.log("=".repeat(60));
console.log(`✅ Successfully restored: ${successCount} files`);
console.log(`⚠️  Skipped: ${skippedCount} files`);
console.log(`❌ Failed: ${errorCount} files`);
console.log("=".repeat(60) + "\n");

if (errorCount === 0 && skippedCount === 0) {
  console.log("🎉 All files restored successfully!");
  console.log("📁 Original files are now active");
  console.log("💾 Deployed versions saved with .deployed extension\n");
} else if (errorCount > 0) {
  console.log("⚠️  Some files failed to restore. Check the errors above.\n");
  process.exit(1);
} else {
  console.log("⚠️  Some files were skipped. Check the warnings above.\n");
}
