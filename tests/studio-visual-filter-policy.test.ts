import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioVisualFilterCss, normalizeStudioVisualFilter } from '../src/utils/studioVisualFilterPolicy';

test('Studio visual filter presets are allow-listed and default safely to no filter', () => {
  assert.equal(normalizeStudioVisualFilter('warm'), 'warm');
  assert.equal(normalizeStudioVisualFilter('monochrome'), 'monochrome');
  assert.equal(normalizeStudioVisualFilter('untrusted-css'), 'none');
  assert.equal(normalizeStudioVisualFilter(null), 'none');
});

test('each visual preset maps to a deterministic CSS and Canvas-compatible filter string', () => {
  const presets = ['none', 'cinematic', 'warm', 'monochrome', 'vivid'] as const;
  for (const preset of presets) {
    assert.equal(typeof getStudioVisualFilterCss(preset), 'string');
    assert.ok(getStudioVisualFilterCss(preset).length > 0);
  }
  assert.equal(getStudioVisualFilterCss('none'), 'none');
  assert.match(getStudioVisualFilterCss('monochrome'), /grayscale\(1\)/);
  assert.match(getStudioVisualFilterCss('vivid'), /saturate\(1\.35\)/);
});
