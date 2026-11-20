import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  NEXORA_LENS_CATALOG,
  NEXORA_LENS_CATALOG_SIZE,
  NEXORA_LENS_CATEGORIES,
} from '../src/services/nexoraLensCatalog';

const expectedCategoryCounts: Record<string, number> = {
  'Camera Enhance': 3, Beauty: 4, Cinema: 3, Colour: 3, Creator: 3,
  AR: 14, Fantasy: 2, Playful: 2, Retro: 2, World: 2,
};

test('LensVerse ships a compact, curated catalogue instead of generated duplicates', () => {
  assert.equal(NEXORA_LENS_CATALOG_SIZE, 38);
  assert.equal(NEXORA_LENS_CATALOG.length, 38);
  for (const [category, count] of Object.entries(expectedCategoryCounts)) {
    assert.equal(NEXORA_LENS_CATALOG.filter(lens => lens.category === category).length, count, category);
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
    assert.notEqual(lens.sticker, undefined, lens.id);
  }
});

test('the curated AR collection includes glasses, animal effects, teddy bear, beard and hair', () => {
  const ar = NEXORA_LENS_CATALOG.filter(lens => lens.category === 'AR');
  const stickers = new Set(ar.map(lens => lens.sticker));
  for (const sticker of ['crown', 'cat', 'halo', 'glasses', 'hearts', 'sparkles', 'puppy', 'bunny', 'flower', 'robot', 'butterfly', 'teddyBear', 'beard', 'hair']) {
    assert.ok(stickers.has(sticker as never), sticker);
  }
});

test('LensVerse applies beauty smoothing automatically and has no manual intensity controls', () => {
  const source = readFileSync(new URL('../src/components/NexoraLensStudio.tsx', import.meta.url), 'utf8');
  assert.match(source, /context\.globalAlpha = 0\.16/);
  assert.match(source, /blur\(1\.6px\) saturate\(1\.03\)/);
  assert.doesNotMatch(source, /Effect strength|Skin softening|effectIntensity|beautyIntensity/);
  assert.match(source, /drawLens\(context, latestLandmarks, lens/);
});

test('all visible category labels resolve to catalogue or special collections', () => {
  assert.ok(NEXORA_LENS_CATEGORIES.includes('For you'));
  assert.ok(NEXORA_LENS_CATEGORIES.includes('Favourites'));
  assert.ok(NEXORA_LENS_CATEGORIES.includes('Community'));
});
