import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GIFT_CATALOG, GIFT_CATALOG_VERSION, findNexoraGift } from '../functions/src/giftCatalogPolicy.js';
test('GIFTVERSE contains 120 unique gifts across twelve collections',()=>{assert.equal(GIFT_CATALOG.length,120);assert.equal(new Set(GIFT_CATALOG.map(g=>g.id)).size,120);assert.equal(new Set(GIFT_CATALOG.map(g=>g.image)).size,120);assert.equal(new Set(GIFT_CATALOG.map(g=>g.category)).size,12);});
test('every gift resolves to its own bundled SVG artwork file',()=>{for(const gift of GIFT_CATALOG){assert.match(gift.image,/^\/giftverse\/gifts\/[a-z0-9-]+\.svg$/);const file=resolve(process.cwd(),'public',gift.image.slice(1));const artwork=readFileSync(file,'utf8');assert.match(artwork,/^<svg\s/);assert.ok(artwork.includes('data-gift-id="'+gift.id+'"'));}});
test('each gift has safe NEX pricing, a valid rarity and animation profile',()=>{for(const gift of GIFT_CATALOG){assert.ok(Number.isSafeInteger(gift.priceNex)&&gift.priceNex>0);assert.ok(['common','uncommon','rare','epic','legendary'].includes(gift.rarity));assert.ok(['sparkle','reveal','cinematic','legendary'].includes(gift.animation));}});
test('gift lookup returns the server price source and rejects unknown ids',()=>{assert.equal(GIFT_CATALOG_VERSION,1);assert.equal(findNexoraGift('royal-01')?.priceNex,5);assert.equal(findNexoraGift('missing'),undefined);});
