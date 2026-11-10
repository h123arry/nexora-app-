import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GIFT_CATALOG, GIFT_CATALOG_VERSION, findNexoraGift } from '../functions/src/giftCatalogPolicy.js';
const imported=GIFT_CATALOG.filter(g=>g.id.startsWith('twemoji-'));
const bundled=GIFT_CATALOG.filter(g=>g.image.startsWith('/giftverse/gifts/'));
test('GIFTVERSE contains 1,000 distinct gift identities and image references',()=>{
 assert.equal(GIFT_CATALOG.length,1000);assert.equal(new Set(GIFT_CATALOG.map(g=>g.id)).size,1000);assert.equal(new Set(GIFT_CATALOG.map(g=>g.image)).size,1000);assert.equal(new Set(GIFT_CATALOG.map(g=>g.name)).size,1000);assert.equal(imported.length,880);assert.equal(bundled.length,120);
});
test('the original 120 bundled SVG artworks still resolve locally',()=>{
 for(const gift of bundled){const artwork=readFileSync(new URL('../public'+gift.image,import.meta.url),'utf8');assert.ok(artwork.startsWith('<svg'));assert.ok(artwork.includes('data-gift-id="'+gift.id+'"'));}
});
test('880 imported artworks use distinct pinned Twemoji SVG sources',()=>{
 for(const gift of imported){assert.match(gift.image,/^https:\/\/raw\.githubusercontent\.com\/jdecked\/twemoji\/[a-f0-9]{40}\/assets\/svg\/[a-f0-9-]+\.svg$/);assert.match(gift.id,/^twemoji-[a-f0-9-]+$/);assert.ok(gift.name.startsWith('Nexora '));}
});
test('every gift has unique descriptions, valid rarity, animation and safe NEX pricing',()=>{
 assert.equal(new Set(GIFT_CATALOG.map(g=>g.description)).size,1000);
 for(const gift of GIFT_CATALOG){assert.ok(Number.isSafeInteger(gift.priceNex)&&gift.priceNex>0);assert.ok(gift.description.length>35);assert.ok(['common','uncommon','rare','epic','legendary'].includes(gift.rarity));assert.ok(['sparkle','reveal','cinematic','legendary'].includes(gift.animation));}
 assert.ok(new Set(imported.map(g=>g.priceNex)).size>=8);
});
test('catalogue spans eighteen gift worlds and preserves the original price ladder',()=>{
 assert.equal(new Set(GIFT_CATALOG.map(g=>g.category)).size,18);assert.deepEqual([...new Set(GIFT_CATALOG.slice(0,120).map(g=>g.priceNex))].sort((a,b)=>a-b),[5,10,20,35,50,100,250,500,1500,5000,10000]);
});
test('gift lookup remains server-owned and rejects unknown ids',()=>{assert.equal(GIFT_CATALOG_VERSION,2);assert.equal(findNexoraGift('royal-01')?.priceNex,5);assert.equal(findNexoraGift('missing'),undefined);});
