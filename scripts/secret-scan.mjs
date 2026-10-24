import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const rules = [
  ['private-key', /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['stripe-live-secret', /\bsk_live_[A-Za-z0-9]{16,}\b/],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['service-account-json', /"private_key"\s*:\s*"-----BEGIN/],
];

const findings = [];
for (const file of tracked) {
  if (file === '.env.example' || file.endsWith('.lock') || file.endsWith('.map')) continue;
  const basename = path.basename(file);
  if (/^(\.env|.*\.(pem|key|p12|pfx))$/.test(basename) && basename !== '.env.example') {
    findings.push(`${file}: disallowed credential-like filename`);
    continue;
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const [name, pattern] of rules) {
    if (pattern.test(text)) findings.push(`${file}: ${name}`);
  }
}

if (findings.length > 0) {
  console.error('Secret scan failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}
console.log(`Secret scan passed for ${tracked.length} tracked files.`);
