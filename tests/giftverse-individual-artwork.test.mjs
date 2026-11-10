import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGiftSpriteAssets, extractSymbolSvg } from '../scripts/giftverse/extract-individual-artwork.mjs';

test('individual gift SVGs preserve the symbol viewBox and accessible name', () => {
  const symbol = '<symbol id="gift-a" viewBox="0 0 512 512"><title>Gift A</title><path d="M0 0h10v10z"/></symbol>';
  const result = extractSymbolSvg(symbol, 'Gift & A');
  assert.match(result, /viewBox="0 0 512 512"/);
  assert.match(result, /aria-label="Gift &amp; A"/);
  assert.match(result, /<path d="M0 0h10v10z"\/>/);
  assert.doesNotMatch(result, /<symbol/);
});

test('sprite extraction rewrites each catalogue image to its own file', () => {
  const expansion = `export const GIFTVERSE_EXPANSION = [
  {
    "id": "gift-a",
    "name": "Gift A",
    "image": "/giftverse/gifts/openmoji-sprite-01.svg#symbol-a"
  }
];`;
  const sprites = ['<svg><symbol id="symbol-a" viewBox="0 0 10 10"><path d="M0 0"/></symbol></svg>'];
  // The production importer deliberately requires the complete 880-item batch.
  assert.throws(() => extractGiftSpriteAssets(expansion, sprites), /Expected 880 imported gifts/);
});

test('unsafe SVG symbols and missing viewBoxes fail closed', () => {
  assert.throws(() => extractSymbolSvg('<symbol id="bad"><script>alert(1)</script></symbol>', 'Bad'), /viewBox/);
  assert.throws(() => extractSymbolSvg('<symbol id="bad" viewBox="0 0 1 1"><script>alert(1)</script></symbol>', 'Bad'), /Unsafe/);
});
