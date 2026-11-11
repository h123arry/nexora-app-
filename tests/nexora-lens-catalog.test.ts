import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NEXORA_LENS_CATALOG,
  NEXORA_LENS_CATALOG_SIZE,
  NEXORA_LENS_CATEGORIES,
} from '../src/services/nexoraLensCatalog';

test('NEXORA Lensverse ships 300 original lens definitions', () => {
  assert.equal(NEXORA_LENS_CATALOG_SIZE, 300);
  assert.equal(NEXORA_LENS_CATALOG.length, 300);
});

test('every Lensverse category contains 30 named lenses', () => {
  for (const category of NEXORA_LENS_CATEGORIES.filter(item => item !== 'For you' && item !== 'Favourites')) {
    assert.equal(NEXORA_LENS_CATALOG.filter(lens => lens.category === category).length, 30, category);
  }
});

test('lens IDs and names are unique and every lens has a usable visual recipe', () => {
  const ids = NEXORA_LENS_CATALOG.map(lens => lens.id);
  const names = NEXORA_LENS_CATALOG.map(lens => lens.name);
  assert.equal(new Set(ids).size, ids.length, 'lens IDs must be unique');
  assert.equal(new Set(names).size, names.length, 'lens names must be unique');
  for (const lens of NEXORA_LENS_CATALOG) {
    assert.ok(lens.name.trim().length > 2, lens.id);
    assert.ok(lens.description.trim().length > 10, lens.id);
    assert.ok(lens.filter.startsWith('brightness('), lens.id);
    assert.ok(['none', 'crown', 'cat', 'halo', 'glasses', 'hearts', 'sparkles', 'puppy', 'bunny', 'flower', 'robot', 'butterfly'].includes(lens.sticker), lens.id);
  }
});

test('the AR collection includes the original face-tracked NEXORA lens set', () => {
  const ar = NEXORA_LENS_CATALOG.filter(lens => lens.category === 'AR');
  const stickers = new Set(ar.map(lens => lens.sticker));
  for (const sticker of ['crown', 'cat', 'halo', 'glasses', 'hearts', 'sparkles', 'puppy', 'bunny', 'flower', 'robot', 'butterfly']) {
    assert.ok(stickers.has(sticker as never), sticker);
  }
});
