import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GIFT_CATALOG, GIFT_CATALOG_VERSION, findNexoraGift } from '../functions/src/giftCatalogPolicy.js';
import { getNexCurrencyInfo } from '../functions/src/nexCurrencyPolicy.js';

test('GIFTVERSE contains 1,102 unique gift identities, names and image references', () => {
  assert.equal(GIFT_CATALOG.length, 1102);
  assert.equal(new Set(GIFT_CATALOG.map(g => g.id)).size, 1102);
  assert.equal(new Set(GIFT_CATALOG.map(g => g.image)).size, 1102);
  assert.equal(new Set(GIFT_CATALOG.map(g => g.name)).size, 1102);
});

test('all catalogue artwork resolves to bundled SVG files and distinct sprite symbols', () => {
  const cache = new Map();
  for (const gift of GIFT_CATALOG) {
    assert.ok(gift.image.startsWith('/giftverse/gifts/'));
    const parts = gift.image.split('#'), assetPath = parts[0], symbolId = parts[1];
    if (!cache.has(assetPath)) cache.set(assetPath, readFileSync(new URL('../public' + assetPath, import.meta.url), 'utf8'));
    const artwork = cache.get(assetPath);
    assert.ok(artwork.startsWith('<svg'));
    if (symbolId) assert.ok(artwork.includes('<symbol id=\"' + symbolId + '\"'), 'Missing symbol for ' + gift.id);
    else assert.ok(artwork.includes('<title id=\"title\">' + gift.name + '</title>') || artwork.includes('data-gift-id=\"' + gift.id + '\"'), 'Missing dedicated artwork identity for ' + gift.id);
  }
});

test('all gifts have unique descriptions, safe prices and valid rarity/animation', () => {
  assert.equal(new Set(GIFT_CATALOG.map(g => g.description)).size, 1102);
  for (const gift of GIFT_CATALOG) {
    assert.ok(Number.isSafeInteger(gift.priceNex) && gift.priceNex > 0);
    assert.ok(gift.description.length > 35);
    assert.ok(['common','uncommon','rare','epic','legendary'].includes(gift.rarity));
    assert.ok(['sparkle','reveal','cinematic','legendary'].includes(gift.animation));
  }
});

test('catalogue spans fifteen collections and a varied NEX price ladder', () => {
  assert.ok(new Set(GIFT_CATALOG.map(g => g.category)).size >= 15);
  assert.deepEqual([...new Set(GIFT_CATALOG.map(g => g.priceNex))].sort((a,b) => a-b), [1,2,5,10,20,25,35,50,80,100,120,180,250,300,500,900,1500,1800,5000,10000]);
});

test('880 imported artworks have unique source provenance and share-alike records', () => {
  const records = JSON.parse(readFileSync(new URL('../public/giftverse/provenance/openmoji-17.0.0.json', import.meta.url), 'utf8'));
  assert.equal(records.length, 880);
  assert.equal(new Set(records.map(x => x.sourceHexcode)).size, 880);
  assert.ok(records.every(x => x.license === 'CC BY-SA 4.0' && x.shareAlikeRequired));
});

test('server gift lookup retains existing prices and rejects unknown ids', () => {
  assert.equal(GIFT_CATALOG_VERSION, 3);
  assert.equal(findNexoraGift('royal-01')?.priceNex, 5);
  assert.equal(findNexoraGift('micro-01')?.priceNex, 1);
  assert.equal(findNexoraGift('micro-02')?.priceNex, 2);
  assert.equal(findNexoraGift('missing'), undefined);
});

test('NEX is priced at two US cents with bundles starting at 15 units', () => {
  const info = getNexCurrencyInfo();
  assert.equal(info.currency, 'NEX');
  assert.equal(info.referenceUsdCentsPerUnit, 2);
  assert.deepEqual(info.bundles.map(bundle => [bundle.units, bundle.priceUsdCents]), [[15,30],[30,60],[50,100],[100,200]]);
  assert.equal(info.checkoutEnabled, false);
});


test('bundled browser fallback exactly mirrors the authoritative 1,102-gift catalogue', () => {
  const bundled = JSON.parse(readFileSync(new URL('../public/giftverse/catalog.json', import.meta.url), 'utf8'));
  assert.equal(bundled.version, GIFT_CATALOG_VERSION);
  assert.equal(bundled.currency, 'NEX');
  assert.equal(bundled.gifts.length, 1102);
  assert.deepEqual(bundled.gifts, GIFT_CATALOG);
});
