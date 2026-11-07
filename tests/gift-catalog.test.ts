import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GIFT_CATALOG, GIFT_CATALOG_VERSION, findNexoraGift } from '../functions/src/giftCatalogPolicy.js';

test('GIFTVERSE contains 120 unique original gift identities and artwork references', () => {
  assert.equal(GIFT_CATALOG.length, 120);
  assert.equal(new Set(GIFT_CATALOG.map(g => g.id)).size, 120);
  assert.equal(new Set(GIFT_CATALOG.map(g => g.image)).size, 120);
  assert.equal(new Set(GIFT_CATALOG.map(g => g.name)).size, 120);
});

test('all 120 catalogue references resolve to separate bundled SVG image files', () => {
  for (const gift of GIFT_CATALOG) {
    assert.ok(gift.image.startsWith('/giftverse/gifts/'));
    assert.ok(gift.image.endsWith('.svg'));
    const artwork = readFileSync(new URL('../public' + gift.image, import.meta.url), 'utf8');
    assert.ok(artwork.startsWith('<svg'));
    assert.ok(artwork.includes('data-gift-id="' + gift.id + '"'), 'Missing artwork for ' + gift.id);
  }
});

test('every gift has a distinct description, valid rarity, animation class and safe NEX price', () => {
  assert.equal(new Set(GIFT_CATALOG.map(g => g.description)).size, 120);
  for (const gift of GIFT_CATALOG) {
    assert.ok(Number.isSafeInteger(gift.priceNex) && gift.priceNex > 0);
    assert.ok(gift.description.length > 35);
    assert.ok(['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(gift.rarity));
    assert.ok(['sparkle', 'reveal', 'cinematic', 'legendary'].includes(gift.animation));
  }
});

test('catalogue spans twelve original worlds and a deliberate NEX price ladder', () => {
  assert.equal(new Set(GIFT_CATALOG.map(g => g.category)).size, 12);
  assert.deepEqual([...new Set(GIFT_CATALOG.map(g => g.priceNex))].sort((a,b) => a-b), [5,10,20,35,50,100,250,500,1500,5000,10000]);
});

test('gift lookup returns server price source and rejects unknown ids', () => {
  assert.equal(GIFT_CATALOG_VERSION, 1);
  assert.equal(findNexoraGift('royal-01')?.priceNex, 5);
  assert.equal(findNexoraGift('missing'), undefined);
});
