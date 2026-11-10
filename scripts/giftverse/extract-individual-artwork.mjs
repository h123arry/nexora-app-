import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const EXPANSION = 'functions/src/giftCatalogExpansion.ts';
const SPRITE_DIR = 'public/giftverse/gifts';
const OUTPUT_DIR = 'public/giftverse/gifts/imported';

const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[c]));

export function extractSymbolSvg(symbolMarkup, accessibleName) {
  const opening = symbolMarkup.match(/^<symbol\\b([^>]*)>/);
  if (!opening) throw new Error('Expected an SVG symbol element');
  const viewBox = opening[1].match(/\\bviewBox=["']([^"']+)["']/);
  if (!viewBox) throw new Error('SVG symbol is missing its viewBox');
  const inner = symbolMarkup.slice(opening[0].length).replace(/<\\/symbol>\\s*$/, '');
  if (!inner || /<script\\b|<foreignObject\\b|javascript:/i.test(inner)) {
    throw new Error('Unsafe or empty SVG symbol');
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox[1] +
    '" role="img" aria-label="' + escapeXml(accessibleName) +
    '" focusable="false">\\n' + inner + '\\n</svg>\\n';
}

export function extractGiftSpriteAssets(expansionText, spriteTexts) {
  const symbols = new Map();
  for (const sprite of spriteTexts) {
    for (const match of sprite.matchAll(/<symbol\\b[^>]*\\bid=["']([^"']+)["'][^>]*>[\\s\\S]*?<\\/symbol>/g)) {
      if (symbols.has(match[1])) throw new Error('Duplicate sprite symbol: ' + match[1]);
      symbols.set(match[1], match[0]);
    }
  }
  const assets = [];
  const seenIds = new Set();
  let rewritten = expansionText;
  const entries = [...expansionText.matchAll(/\\{\\s*"id":\\s*"([^"]+)"[\\s\\S]*?"image":\\s*"([^"]+)"[\\s\\S]*?\\n\\s*\\}/g)];
  for (const entry of entries) {
    const [, giftId, imageRef] = entry;
    if (seenIds.has(giftId)) throw new Error('Duplicate gift id: ' + giftId);
    seenIds.add(giftId);
    const [spritePath, symbolId] = imageRef.split('#');
    if (!spritePath || !symbolId || !spritePath.startsWith('/giftverse/gifts/')) {
      throw new Error('Unexpected sprite reference for ' + giftId);
    }
    const symbol = symbols.get(symbolId);
    if (!symbol) throw new Error('Missing symbol ' + symbolId + ' for ' + giftId);
    const name = entry[0].match(/"name":\\s*"([^"]+)"/)?.[1] || giftId;
    const outputPath = '/' + OUTPUT_DIR + '/' + giftId + '.svg';
    assets.push({
      path: resolve(ROOT, 'public' + outputPath),
      relativePath: 'public' + outputPath,
      svg: extractSymbolSvg(symbol, name),
      giftId,
      outputPath
    });
    rewritten = rewritten.replace(entry[0], entry[0].replace(imageRef, outputPath));
  }
  if (entries.length !== 880) throw new Error('Expected 880 imported gifts; found ' + entries.length);
  if (symbols.size !== 880) throw new Error('Expected 880 sprite symbols; found ' + symbols.size);
  if (assets.length !== 880) throw new Error('Not every imported gift received an individual asset');
  return { assets, rewritten };
}

async function main() {
  const expansionPath = resolve(ROOT, EXPANSION);
  const expansion = await readFile(expansionPath, 'utf8');
  const spritePaths = Array.from({ length: 8 }, (_, index) =>
    resolve(ROOT, SPRITE_DIR, 'openmoji-sprite-' + String(index + 1).padStart(2, '0') + '.svg'));
  const sprites = await Promise.all(spritePaths.map(path => readFile(path, 'utf8')));
  const { assets, rewritten } = extractGiftSpriteAssets(expansion, sprites);
  for (const asset of assets) {
    await mkdir(dirname(asset.path), { recursive: true });
    await writeFile(asset.path, asset.svg);
  }
  await writeFile(expansionPath, rewritten);
  process.stdout.write('Extracted ' + assets.length + ' individual, lazy-loadable GiftVerse SVG assets.\\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    process.stderr.write((error?.stack || String(error)) + '\\n');
    process.exitCode = 1;
  });
}
