import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots = ['src', 'functions/src'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const findings = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'dist' && entry !== 'build') walk(fullPath);
      continue;
    }
    const extension = fullPath.slice(fullPath.lastIndexOf('.'));
    if (!extensions.has(extension)) continue;
    const lines = readFileSync(fullPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!/\bMath\.random\s*\(/.test(line)) return;
      const dataRisk = /\b(id|uid|key|count|vote|balance|price|amount|wallet|post|comment|chat|message|token|nonce|seed)\b/i.test(line);
      const visualCandidate = /animation|motion|jitter|particle|opacity|translate|rotate|gradient|decoration|visual|randomHeight|randomDelay/i.test(line);
      const category = dataRisk ? 'DATA_OR_ID_REVIEW' : visualCandidate ? 'VISUAL_CANDIDATE' : 'MANUAL_REVIEW';
      findings.push({ path: relative(process.cwd(), fullPath), line: index + 1, category, source: line.trim() });
    });
  }
}

for (const root of roots) {
  try { walk(root); } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const counts = findings.reduce((result, item) => {
  result[item.category] = (result[item.category] || 0) + 1;
  return result;
}, {});
console.log('Math.random() call-site audit');
console.log(JSON.stringify({ total: findings.length, counts, findings }, null, 2));
if (findings.some(item => item.category === 'DATA_OR_ID_REVIEW')) {
  console.log('Review DATA_OR_ID_REVIEW entries before release; this audit is informational and does not fail the build.');
}
