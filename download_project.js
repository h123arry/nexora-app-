#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("==================================================================");
console.log("      🌌 NEXORA CO-BUILDER PLATFORM - JS NODE EXPORTER 🌌");
console.log("==================================================================");
console.log("Preparing secure workspace compression...");

const backupDir = 'nexora_backup_source';
const excludedDirs = new Set([
  'node_modules', 'dist', '.git', '.github', '.next', 
  '.cache', 'temp', '__pycache__', '.upm', backupDir
]);
const excludedFiles = new Set([
  'nexora_project.zip', '.DS_Store', 'package-lock.json', '.env'
]);

let fileCount = 0;
let totalLines = 0;

// Recursive walk function
function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!excludedDirs.has(file)) {
        walkSync(filePath, callback);
      }
    } else {
      if (!excludedFiles.has(file)) {
        callback(filePath, stat);
      }
    }
  });
}

try {
  // Ensure we clean a potential old backup directory first
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  fs.mkdirSync(backupDir);

  // Collect and copy files
  walkSync('.', (filePath) => {
    const relPath = path.relative('.', filePath);
    const destPath = path.join(backupDir, relPath);
    
    // Ensure nested sub-folders exist
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    
    // Copy the file
    fs.copyFileSync(filePath, destPath);
    
    // Calculate total lines of code
    let lines = 0;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      lines = content.split('\n').length;
      totalLines += lines;
    } catch (e) {
      // Binary or unreadable files defaults to 0 lines
    }

    console.log(`📦 Paired & Backuped: ${relPath} (${lines} lines)`);
    fileCount++;
  });

  console.log("==================================================================");
  console.log(`📁 Backup Created: ./${backupDir}/`);
  
  // Try to compress using shell if standard zip tool is available
  try {
    const zipName = "nexora_project_js.zip";
    if (fs.existsSync(zipName)) {
      fs.unlinkSync(zipName);
    }
    
    // Detect OS and compress
    if (process.platform === 'win32') {
      console.log("On Windows - You can right-click the folder nexora_backup_source -> Send to -> Compressed (zipped) folder");
    } else {
      execSync(`zip -r ${zipName} ${backupDir} > /dev/null`);
      console.log(`⚡ Native Unix Zip Compiled: ./${zipName}`);
    }
  } catch (err) {
    console.log("💡 Tip: Compress 'nexora_backup_source' folder to zip to move it easily.");
  }

  console.log("==================================================================");
  console.log("🎉 COMPILATION SUCCESSFUL!");
  console.log(`🌐 Packaged Nodes: ${fileCount} files`);
  console.log(`📊 Volume Metrics: ${totalLines} total lines of code packed`);
  console.log("==================================================================");

} catch (e) {
  console.error("❌ Error occurred during backup node execution:", e);
  process.exit(1);
}
