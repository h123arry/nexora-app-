#!/usr/bin/env node
/**
 * NEXORA repository asset audit.
 *
 * Reports large media assets and byte-identical duplicates so repository growth
 * comes from intentional product assets rather than accidental binary bloat.
 * No files are modified.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const EXCLUDED = new Set([".git", "node_modules", "dist", "coverage", ".next"]);
const MEDIA_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg",
  ".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg", ".m4a",
  ".woff", ".woff2", ".ttf", ".otf", ".pdf", ".zip",
]);
const MiB = 1024 * 1024;
const LARGE_FILE_WARNING = 5 * MiB;
const TOTAL_MEDIA_BUDGET = 80 * MiB;

async function walk(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, files);
    else if (MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      const info = await stat(absolute);
      files.push({ path: path.relative(ROOT, absolute), absolute, size: info.size });
    }
  }
  return files;
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

const files = await walk(ROOT);
files.sort((a, b) => b.size - a.size);
const total = files.reduce((sum, file) => sum + file.size, 0);
const duplicateGroups = new Map();

for (const file of files) {
  const digest = await hashFile(file.absolute);
  const group = duplicateGroups.get(digest) ?? [];
  group.push(file);
  duplicateGroups.set(digest, group);
}

const duplicates = [...duplicateGroups.values()].filter(group => group.length > 1);
const large = files.filter(file => file.size >= LARGE_FILE_WARNING);
const format = bytes => (bytes / MiB).toFixed(2) + " MiB";

console.log("\nNEXORA repository media audit");
console.log("=============================");
console.log(`Media files: ${files.length}`);
console.log(`Combined media size: ${format(total)}`);
console.log(`Files at least 5 MiB: ${large.length}`);
console.log(`Byte-identical duplicate groups: ${duplicates.length}`);

if (large.length) {
  console.log("\nLargest assets:");
  for (const file of large.slice(0, 30)) {
    console.log(`  ${format(file.size).padStart(10)}  ${file.path}`);
  }
}
if (duplicates.length) {
  console.log("\nExact duplicate files (same SHA-256):");
  for (const group of duplicates) {
    console.log(`  ${format(group[0].size)} each`);
    for (const file of group) console.log(`    - ${file.path}`);
  }
}
console.log(`\\nMedia budget: ${format(TOTAL_MEDIA_BUDGET)}`);
if (total > TOTAL_MEDIA_BUDGET) {
  console.warn("WARNING: media assets exceed the 80 MiB review threshold.");
  console.warn("Review compression, duplicate platform assets, and delivery strategy.");
} else {
  console.log("Media assets are within the review threshold.");
}
console.log("Audit only: no files were changed.");
