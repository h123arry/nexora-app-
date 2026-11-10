import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_LICENSES = new Set([
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'MIT',
  'Apache-2.0',
  'Public-Domain'
]);

const FORBIDDEN_SVG_PATTERNS = [
  /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
  /<\s*foreignObject\b[^>]*>[\s\S]*?<\s*\/\s*foreignObject\s*>/gi,
  /<!DOCTYPE[\s\S]*?>/gi,
  /<!ENTITY[\s\S]*?>/gi
];

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  })[character]);
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(field + ' is required for every imported artwork.');
  }
  return value.trim();
}

export function transformImportedSvg(source, record) {
  if (typeof source !== 'string' || !/<svg\b/i.test(source)) {
    throw new Error('The source artwork must be an SVG document.');
  }

  const giftId = requireText(record?.giftId, 'giftId');
  const giftName = requireText(record?.giftName, 'giftName');
  const creator = requireText(record?.creator, 'creator');
  const sourceUrl = requireText(record?.sourceUrl, 'sourceUrl');
  const license = requireText(record?.license, 'license');
  const licenseUrl = requireText(record?.licenseUrl, 'licenseUrl');
  const modifications = requireText(record?.modifications, 'modifications');

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(giftId)) {
    throw new Error('giftId must be a lowercase kebab-case identifier.');
  }
  if (!ALLOWED_LICENSES.has(license)) {
    throw new Error('Unsupported or unverified artwork licence: ' + license);
  }
  if (!/^https:\/\//i.test(sourceUrl) || !/^https:\/\//i.test(licenseUrl)) {
    throw new Error('Source and licence references must use HTTPS URLs.');
  }
  if (license === 'CC-BY-SA-4.0' && !/share[- ]alike/i.test(modifications)) {
    throw new Error('CC BY-SA adaptations must explicitly retain share-alike terms.');
  }

  let svg = source.replace(/^\uFEFF/, '').trim();
  for (const pattern of FORBIDDEN_SVG_PATTERNS) svg = svg.replace(pattern, '');
  svg = svg.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '');
  svg = svg.replace(/\s+(?:href|xlink:href)\s*=\s*("|')\s*(?:https?:|data:|javascript:)[^"']*\1/gi, '');
  svg = svg.replace(/url\(\s*(['"]?)(?:https?:|data:|javascript:)[^)]+\)/gi, 'none');

  const root = svg.match(/<svg\b[^>]*>/i);
  if (!root) throw new Error('Could not locate an SVG root element.');

  const title = '<title id="gift-title">' + escapeXml(giftName) + '</title>';
  const description = '<desc id="gift-description">NEXORA GiftVerse artwork adapted from a licensed source.</desc>';
  const accessibility = ' role="img" aria-labelledby="gift-title gift-description" data-gift-id="' + escapeXml(giftId) + '"';
  const rootTag = root[0].replace(/\s+(?:role|aria-labelledby|data-gift-id)\s*=\s*("[^"]*"|'[^']*')/gi, '');
  svg = svg.replace(root[0], rootTag.replace(/>$/, accessibility + '>').replace(/\s+viewBox="[^"]*"/i, match => match));

  if (!/viewBox=/i.test(rootTag)) {
    svg = svg.replace(/<svg\b([^>]*)>/i, '<svg$1 viewBox="0 0 512 512">');
  }
  svg = svg.replace(/<svg\b[^>]*>/i, match => match + title + description);

  const provenance = {
    giftId,
    giftName,
    creator,
    sourceUrl,
    license,
    licenseUrl,
    modifications,
    attributionRequired: license === 'CC-BY-4.0' || license === 'CC-BY-SA-4.0' || license === 'Apache-2.0',
    shareAlikeRequired: license === 'CC-BY-SA-4.0',
    transformedFor: 'NEXORA GiftVerse',
    transformedAtBuild: true
  };

  return { svg, provenance };
}

async function run() {
  const args = process.argv.slice(2);
  const option = name => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const manifestPath = option('--manifest');
  const inputDir = option('--input-dir');
  const outputDir = option('--output-dir');
  const provenancePath = option('--provenance');

  if (!manifestPath || !inputDir || !outputDir || !provenancePath) {
    throw new Error('Usage: node scripts/giftverse/import-artwork.mjs --manifest <json> --input-dir <dir> --output-dir <dir> --provenance <json>');
  }

  const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('The import manifest must be a non-empty array.');
  }

  const seenIds = new Set();
  const seenNames = new Set();
  const seenSources = new Set();
  const provenance = [];

  for (const record of manifest) {
    if (seenIds.has(record.giftId)) throw new Error('Duplicate giftId: ' + record.giftId);
    if (seenNames.has(String(record.giftName).toLocaleLowerCase())) throw new Error('Duplicate giftName: ' + record.giftName);
    if (seenSources.has(record.sourceUrl)) throw new Error('A source URL cannot be reused for multiple gift identities.');
    seenIds.add(record.giftId);
    seenNames.add(String(record.giftName).toLocaleLowerCase());
    seenSources.add(record.sourceUrl);

    const inputPath = resolve(inputDir, record.sourceFile);
    const source = await readFile(inputPath, 'utf8');
    const { svg, provenance: item } = transformImportedSvg(source, record);
    const outputPath = join(resolve(outputDir), record.giftId + '.svg');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, svg + '\n', 'utf8');
    provenance.push({ ...item, sourceFile: record.sourceFile, outputFile: record.giftId + '.svg' });
  }

  await mkdir(dirname(resolve(provenancePath)), { recursive: true });
  await writeFile(resolve(provenancePath), JSON.stringify(provenance, null, 2) + '\n', 'utf8');
  process.stdout.write('Imported ' + provenance.length + ' licensed GiftVerse artworks.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  });
}
