import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const VERSION = '17.0.0';
const DATA_URL = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/' + VERSION + '/data/openmoji.json';
const RAW_BASE = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/' + VERSION + '/color/svg/';
const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';
const TARGETS = [
  ['smileys-emotion', 146], ['animals-nature', 145], ['food-drink', 107],
  ['travel-places', 192], ['activities', 71], ['objects', 219],
];
const BLOCKED = /flag|weapon|gun|knife|pistol|bomb|blood|skull|syringe|cigarette|smoking|alcohol|beer|wine|cocktail|drugs|pill|condom|explicit|middle finger|poop|toilet|religious|cross|church|mosque|synagogue|temple|political|military|soldier|war|tank|police|handcuffs/i;
const GROUPS = {
  'smileys-emotion': { category: 'love', categoryName: 'Love & Appreciation', kind: 'expressive' },
  'animals-nature': { category: 'wildlife', categoryName: 'Wild Kingdom', kind: 'wildlife' },
  'food-drink': { category: 'culinary', categoryName: 'Culinary Delights', kind: 'culinary' },
  'travel-places': { category: 'world', categoryName: 'World Wonders', kind: 'world' },
  activities: { category: 'music', categoryName: 'Music & Celebration', kind: 'celebration' },
  objects: { category: 'artifacts', categoryName: 'Treasures & Objects', kind: 'crafted' },
};
const PALETTES = {
  'smileys-emotion': ['#3B1A63', '#A855F7', '#E9D5FF'],
  'animals-nature': ['#123B32', '#22C55E', '#D1FAE5'],
  'food-drink': ['#4A2B18', '#F59E0B', '#FDE68A'],
  'travel-places': ['#172554', '#60A5FA', '#DBEAFE'],
  activities: ['#38204F', '#C084FC', '#F3E8FF'],
  objects: ['#211B48', '#8B5CF6', '#DDD6FE'],
};
const SPRITE_SIZE = 110;
const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));
const titleCase = value => String(value).split(/[\s-]+/).filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1)).join(' ');

async function fetchText(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}
function safeInner(source, hexcode) {
  const root = source.match(/<svg\b[^>]*>/i);
  if (!root || !/viewBox=["']0 0 72 72["']/i.test(root[0])) throw new Error('Unexpected SVG root for ' + hexcode);
  let inner = source.replace(/^\uFEFF/, '').replace(root[0], '').replace(/<\/svg>\s*$/i, '');
  inner = inner
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/\s+(?:href|xlink:href)\s*=\s*("|')\s*(?:https?:|data:|javascript:)[^"']*\1/gi, '')
    .replace(/url\(\s*(['"]?)(?:https?:|data:|javascript:)[^)]+\)/gi, 'none')
    .replace(/\s+id=(?:"[^"]*"|'[^']*')/gi, '');
  if (/<script\b|<foreignObject\b|javascript:|https?:\/\//i.test(inner)) throw new Error('Unsafe SVG content: ' + hexcode);
  return inner;
}
async function collectGroup(rows, group, target) {
  const candidates = rows.filter(x => x.group === group && !x.skintone && !x.skintone_combination &&
    !BLOCKED.test((x.annotation || '') + ' ' + (x.tags || '')));
  const seen = new Set();
  const unique = candidates.filter(x => !seen.has(x.hexcode) && seen.add(x.hexcode));
  const collected = [];
  let cursor = 0;
  async function worker() {
    while (cursor < unique.length && collected.length < target) {
      const item = unique[cursor++];
      try {
        const sourceSvg = await fetchText(RAW_BASE + item.hexcode + '.svg');
        collected.push({ ...item, sourceSvg, giftGroup: group });
      } catch (error) {
        process.stderr.write('Skipping unavailable source ' + item.hexcode + ': ' + error.message + '\n');
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()));
  if (collected.length < target) throw new Error('Insufficient verified source images for ' + group);
  return collected.sort((a, b) => a.order - b.order).slice(0, target);
}
function pricing(index) {
  const slot = index % 100;
  if (slot < 40) return { rarity: 'common', priceNex: [5,10,20][slot % 3], animation: 'sparkle' };
  if (slot < 70) return { rarity: 'uncommon', priceNex: [35,50,100][slot % 3], animation: 'reveal' };
  if (slot < 90) return { rarity: 'rare', priceNex: [250,500][slot % 2], animation: 'reveal' };
  if (slot < 97) return { rarity: 'epic', priceNex: 1500, animation: 'cinematic' };
  return { rarity: 'legendary', priceNex: slot % 2 ? 5000 : 10000, animation: 'legendary' };
}
function symbolMarkup(item, gift, index) {
  const p = PALETTES[item.giftGroup], bg = p[0], accent = p[1], light = p[2];
  const hex = item.hexcode;
  const ornament = index % 3 === 0
    ? '<path d="M256 36l7 17 18 7-18 7-7 18-7-18-18-7 18-7z" fill="' + light + '" opacity=".7"/><circle cx="420" cy="256" r="5" fill="' + accent + '"/>'
    : index % 3 === 1
      ? '<circle cx="256" cy="38" r="6" fill="' + light + '"/><path d="M430 330l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="' + accent + '"/>'
      : '<path d="M82 256l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="' + light + '"/><circle cx="256" cy="474" r="5" fill="' + accent + '"/>';
  const inner = safeInner(item.sourceSvg, hex);
  return '<symbol id="openmoji-' + hex.toLowerCase() + '" viewBox="0 0 512 512"><title>' + escapeXml(gift.name) +
    '</title><desc>' + escapeXml(gift.description) + ' Original artwork by ' + escapeXml(item.openmoji_author || 'OpenMoji contributors') +
    '.</desc><defs><radialGradient id="bg-' + hex + '"><stop offset="0" stop-color="' + accent +
    '" stop-opacity=".28"/><stop offset="1" stop-color="' + bg +
    '"/></radialGradient><linearGradient id="rim-' + hex + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + light +
    '"/><stop offset=".52" stop-color="' + accent + '"/><stop offset="1" stop-color="#4C1D95"/></linearGradient></defs>' +
    '<circle cx="256" cy="256" r="235" fill="#080615"/><circle cx="256" cy="256" r="226" fill="url(#bg-' + hex +
    ')"/><circle cx="256" cy="256" r="224" fill="none" stroke="url(#rim-' + hex +
    ')" stroke-width="5"/><circle cx="256" cy="256" r="207" fill="none" stroke="' + light +
    '" stroke-opacity=".16" stroke-width="1.5"/>' + ornament + '<g transform="translate(112 112) scale(4)">' + inner + '</g></symbol>';
}
function testSource() {
  return [
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import { readFileSync } from 'node:fs';",
    "import { GIFT_CATALOG, GIFT_CATALOG_VERSION, findNexoraGift } from '../functions/src/giftCatalogPolicy.js';",
    "",
    "test('GIFTVERSE contains 1,000 unique gift identities, names and image references', () => {",
    "  assert.equal(GIFT_CATALOG.length, 1000);",
    "  assert.equal(new Set(GIFT_CATALOG.map(g => g.id)).size, 1000);",
    "  assert.equal(new Set(GIFT_CATALOG.map(g => g.image)).size, 1000);",
    "  assert.equal(new Set(GIFT_CATALOG.map(g => g.name)).size, 1000);",
    "});",
    "",
    "test('all catalogue artwork resolves to bundled SVG files and distinct sprite symbols', () => {",
    "  const cache = new Map();",
    "  for (const gift of GIFT_CATALOG) {",
    "    assert.ok(gift.image.startsWith('/giftverse/gifts/'));",
    "    const parts = gift.image.split('#'), assetPath = parts[0], symbolId = parts[1];",
    "    if (!cache.has(assetPath)) cache.set(assetPath, readFileSync(new URL('../public' + assetPath, import.meta.url), 'utf8'));",
    "    const artwork = cache.get(assetPath);",
    "    assert.ok(artwork.startsWith('<svg'));",
    "    if (symbolId) assert.ok(artwork.includes('<symbol id=\\\"' + symbolId + '\\\"'), 'Missing symbol for ' + gift.id);",
    "    else assert.ok(artwork.includes('data-gift-id=\\\"' + gift.id + '\\\"'), 'Missing image for ' + gift.id);",
    "  }",
    "});",
    "",
    "test('all gifts have unique descriptions, safe prices and valid rarity/animation', () => {",
    "  assert.equal(new Set(GIFT_CATALOG.map(g => g.description)).size, 1000);",
    "  for (const gift of GIFT_CATALOG) {",
    "    assert.ok(Number.isSafeInteger(gift.priceNex) && gift.priceNex > 0);",
    "    assert.ok(gift.description.length > 35);",
    "    assert.ok(['common','uncommon','rare','epic','legendary'].includes(gift.rarity));",
    "    assert.ok(['sparkle','reveal','cinematic','legendary'].includes(gift.animation));",
    "  }",
    "});",
    "",
    "test('catalogue spans fifteen collections and a varied NEX price ladder', () => {",
    "  assert.ok(new Set(GIFT_CATALOG.map(g => g.category)).size >= 15);",
    "  assert.deepEqual([...new Set(GIFT_CATALOG.map(g => g.priceNex))].sort((a,b) => a-b), [5,10,20,35,50,100,250,500,1500,5000,10000]);",
    "});",
    "",
    "test('880 imported artworks have unique source provenance and share-alike records', () => {",
    "  const records = JSON.parse(readFileSync(new URL('../public/giftverse/provenance/openmoji-17.0.0.json', import.meta.url), 'utf8'));",
    "  assert.equal(records.length, 880);",
    "  assert.equal(new Set(records.map(x => x.sourceHexcode)).size, 880);",
    "  assert.ok(records.every(x => x.license === 'CC BY-SA 4.0' && x.shareAlikeRequired));",
    "});",
    "",
    "test('server gift lookup retains existing prices and rejects unknown ids', () => {",
    "  assert.equal(GIFT_CATALOG_VERSION, 2);",
    "  assert.equal(findNexoraGift('royal-01')?.priceNex, 5);",
    "  assert.equal(findNexoraGift('missing'), undefined);",
    "});",
    ""
  ].join('\n');
}
async function main() {
  const rows = JSON.parse(await fetchText(DATA_URL));
  const groups = [];
  for (const pair of TARGETS) groups.push(await collectGroup(rows, pair[0], pair[1]));
  const selected = [];
  for (let i = 0; i < Math.max(...TARGETS.map(x => x[1])); i += 1) {
    for (let g = 0; g < TARGETS.length; g += 1) if (groups[g][i]) selected.push(groups[g][i]);
  }
  if (selected.length !== 880 || new Set(selected.map(x => x.hexcode)).size !== 880) {
    throw new Error('Expected 880 unique source illustrations; received ' + selected.length);
  }

  const policyPath = resolve(ROOT, 'functions/src/giftCatalogPolicy.ts');
  const policy = await readFile(policyPath, 'utf8');
  const marker = 'GIFT_CATALOG:NexoraGift[]=';
  const start = policy.indexOf(marker), end = policy.indexOf('];export function findNexoraGift', start);
  if (start < 0 || end < 0) throw new Error('Could not locate canonical GiftVerse catalogue');
  const oldArray = JSON.parse(policy.slice(start + marker.length, end + 1));
  if (oldArray.length !== 120) throw new Error('Expected original 120 gifts before expansion');
  const names = new Set(oldArray.map(x => x.name.toLocaleLowerCase()));
  const gifts = [], provenance = [];
  const sprites = Array.from({ length: Math.ceil(selected.length / SPRITE_SIZE) }, () => []);

  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index], group = GROUPS[item.giftGroup], hex = item.hexcode.toLowerCase();
    const id = group.category + '-om-' + hex;
    let name = 'Nexora ' + titleCase(item.annotation);
    if (names.has(name.toLocaleLowerCase())) name += ' · ' + hex.toUpperCase();
    names.add(name.toLocaleLowerCase());
    const price = pricing(index), spriteIndex = Math.floor(index / SPRITE_SIZE) + 1;
    const spriteFile = 'openmoji-sprite-' + String(spriteIndex).padStart(2, '0') + '.svg';
    const gift = {
      id, name, category: group.category, categoryName: group.categoryName,
      priceNex: price.priceNex, rarity: price.rarity,
      image: '/giftverse/gifts/' + spriteFile + '#openmoji-' + hex,
      animation: price.animation, subscriptionExclusive: false, limitedEdition: false,
      icon: item.emoji || '✨',
      description: 'A ' + group.kind + ' collectible inspired by ' + item.annotation +
        ', curated as ' + name + ' in the NEXORA midnight-violet universe.',
    };
    gifts.push(gift);
    sprites[spriteIndex - 1].push(symbolMarkup(item, gift, index));
    provenance.push({
      giftId: id, giftName: name, sourceProject: 'OpenMoji', sourceVersion: VERSION,
      sourceHexcode: item.hexcode, sourceAnnotation: item.annotation,
      originalCreator: item.openmoji_author || 'OpenMoji contributors',
      sourceUrl: 'https://github.com/hfg-gmuend/openmoji/blob/' + VERSION + '/color/svg/' + item.hexcode + '.svg',
      datasetUrl: DATA_URL, license: 'CC BY-SA 4.0', licenseUrl: LICENSE_URL,
      modifications: 'Embedded the original vector glyph in a NEXORA midnight-violet medallion with a category-specific palette, luminous rim, decorative accents and accessible title/description.',
      shareAlikeRequired: true,
    });
  }

  const expansionPath = resolve(ROOT, 'functions/src/giftCatalogExpansion.ts');
  await mkdir(dirname(expansionPath), { recursive: true });
  await writeFile(expansionPath, "import type { NexoraGift } from './giftCatalogPolicy.js';\n\nexport const GIFTVERSE_EXPANSION: NexoraGift[] = " + JSON.stringify(gifts, null, 2) + ';\n');
  let nextPolicy = policy;
  if (!nextPolicy.includes("import { GIFTVERSE_EXPANSION } from './giftCatalogExpansion.js';")) {
    nextPolicy = "import { GIFTVERSE_EXPANSION } from './giftCatalogExpansion.js';\n" + nextPolicy;
  }
  nextPolicy = nextPolicy.replace('GIFT_CATALOG_VERSION=1', 'GIFT_CATALOG_VERSION=2');
  nextPolicy = nextPolicy.replace('];export function findNexoraGift', ',...GIFTVERSE_EXPANSION];export function findNexoraGift');
  await writeFile(policyPath, nextPolicy);

  const spriteDir = resolve(ROOT, 'public/giftverse/gifts');
  await mkdir(spriteDir, { recursive: true });
  for (let i = 0; i < sprites.length; i += 1) {
    const filename = 'openmoji-sprite-' + String(i + 1).padStart(2, '0') + '.svg';
    await writeFile(resolve(spriteDir, filename), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n' + sprites[i].join('\n') + '\n</svg>\n');
  }
  const provenancePath = resolve(ROOT, 'public/giftverse/provenance/openmoji-17.0.0.json');
  await mkdir(dirname(provenancePath), { recursive: true });
  await writeFile(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
  await writeFile(resolve(ROOT, 'tests/gift-catalog.test.ts'), testSource());

  await writeFile(resolve(ROOT, 'public/giftverse/README.md'), [
    '# NEXORA GIFTVERSE artwork', '',
    'GiftVerse ships 1,000 distinct catalogue gifts: the original 120 NEXORA vector artworks plus 880 individually identified OpenMoji-based adaptations. The 880 source illustrations are embedded as 880 separately addressable SVG symbols across eight optimized sprite files. Every catalogue entry has its own stable image reference, name, description, category, rarity and server-owned NEX price.',
    '', 'The sprite approach avoids 880 separate network requests while preserving independent vector artwork references. Live deliveries use the shared animation stage; gallery artwork remains static.',
    '', '## Licensed artwork', '',
    'The 880 imported source illustrations are from OpenMoji ' + VERSION + ' and are licensed CC BY-SA 4.0. Each item has a source URL, original creator, source hexcode, licence and modification record in provenance/openmoji-17.0.0.json. See OPENMOJI_ATTRIBUTION.md and ARTWORK_RIGHTS.md.',
    '', 'Adaptations add NEXORA-specific midnight-violet medallions, category palettes, luminous rims, decorative details and accessible titles. The adapted artwork remains subject to share-alike requirements; NEXORA does not claim exclusive copyright over the underlying source artwork.',
    '', 'Run npm run giftverse:import-openmoji to rebuild the pinned, deterministic expansion. The generator rejects duplicate source hexcodes, excludes selected sensitive or unsuitable categories, sanitizes SVG content and verifies exactly 880 source illustrations.', ''
  ].join('\n'));
  await writeFile(resolve(ROOT, 'public/giftverse/ARTWORK_RIGHTS.md'), [
    '# GiftVerse artwork rights and adaptation policy', '',
    'GiftVerse is a commercial NEXORA feature. Publicly viewable artwork is not automatically free to redistribute or modify.',
    '', '## OpenMoji 17.0.0 adaptation batch', '',
    'GiftVerse includes 880 individually referenced OpenMoji illustrations from the pinned 17.0.0 release. The graphics are licensed CC BY-SA 4.0. Commercial use and adaptation are permitted when attribution, modification notices and share-alike terms are followed.',
    '', 'Each source record identifies the exact hexcode, creator, source URL, licence URL, GiftVerse ID and modifications in provenance/openmoji-17.0.0.json.',
    '', 'The adaptations add NEXORA medallion backgrounds, category-specific palettes, luminous rims, decorative accents and accessible titles/descriptions. Adapted OpenMoji artwork remains available under CC BY-SA 4.0. Do not represent the underlying glyphs or adaptations as exclusively owned by NEXORA.',
    '', 'Non-commercial, no-derivatives, personal-use-only and unclear licences are not accepted for future imports. Do not import logos, branded characters, celebrity likenesses or artwork with unclear ownership.', ''
  ].join('\n'));
  await writeFile(resolve(ROOT, 'public/giftverse/OPENMOJI_ATTRIBUTION.md'), [
    '# OpenMoji attribution', '',
    'All OpenMoji graphics used in GiftVerse are designed by the OpenMoji project, HfG Schwäbisch Gmünd, and its contributors.',
    '', '- Project: https://openmoji.org/',
    '- Source release: https://github.com/hfg-gmuend/openmoji/tree/17.0.0',
    '- Graphics licence: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
    '- Licence text: https://creativecommons.org/licenses/by-sa/4.0/',
    '', 'The 880 source glyphs are adapted for NEXORA GiftVerse with category-specific midnight-violet medallions, luminous rims, decorative accents and accessible titles/descriptions. Individual original creators and source details are listed in provenance/openmoji-17.0.0.json.',
    '', 'Adapted artwork is distributed under CC BY-SA 4.0. The OpenMoji source artwork is not exclusively owned by NEXORA. OpenMoji project code is licensed separately under LGPL-3.0; no OpenMoji build code is included in this artwork import.', ''
  ].join('\n'));
  process.stdout.write('Generated ' + gifts.length + ' unique licensed GiftVerse adaptations across ' + sprites.length + ' SVG sprites.\n');
}
main().catch(error => {
  process.stderr.write(error.stack || error.message || String(error));
  process.exitCode = 1;
});
