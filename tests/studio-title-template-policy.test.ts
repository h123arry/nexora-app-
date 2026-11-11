import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioTitleTemplate, STUDIO_TITLE_TEMPLATES } from '../src/utils/studioTitleTemplatePolicy';

test('Studio exposes a small curated set of distinct editable title presets', () => {
  assert.equal(STUDIO_TITLE_TEMPLATES.length, 5);
  assert.equal(new Set(STUDIO_TITLE_TEMPLATES.map(template => template.id)).size, 5);
  assert.equal(new Set(STUDIO_TITLE_TEMPLATES.map(template => template.layer.animation)).size >= 3, true);
});

test('NEXORA title preset creates a normal editable text layer at the requested timeline position', () => {
  const layer = createStudioTitleTemplate('nexora-signal', 'title-1', 4.25);
  assert.equal(layer.id, 'title-1');
  assert.equal(layer.start, 4.25);
  assert.equal(layer.end, 0);
  assert.equal(layer.text, 'YOUR STORY STARTS HERE');
  assert.equal(layer.color, '#F5F7FF');
  assert.equal(layer.animation, 'pop');
});

test('all presets pass through the shared text-layer normalization policy', () => {
  for (const template of STUDIO_TITLE_TEMPLATES) {
    const layer = createStudioTitleTemplate(template.id, template.id, -3);
    assert.equal(layer.start, 0);
    assert.ok(layer.fontSize >= 18 && layer.fontSize <= 100);
    assert.match(layer.color, /^#[0-9a-f]{6}$/i);
    assert.ok(['none', 'fade', 'zoom', 'slide-up', 'pop'].includes(layer.animation));
  }
});
