import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStudioEditTemplate,
  searchStudioEditTemplates,
  STUDIO_EDIT_TEMPLATES,
  STUDIO_EDIT_TEMPLATE_CATEGORIES,
} from '../src/utils/studioEditTemplatePolicy';

test('Studio edit library contains a broad, uniquely identified set of ready-to-apply templates', () => {
  assert.ok(STUDIO_EDIT_TEMPLATES.length >= 24);
  assert.equal(new Set(STUDIO_EDIT_TEMPLATES.map(item => item.id)).size, STUDIO_EDIT_TEMPLATES.length);
  assert.ok(STUDIO_EDIT_TEMPLATE_CATEGORIES.length >= 10);
});

test('template search matches names, descriptions, categories and tags without case sensitivity', () => {
  assert.ok(searchStudioEditTemplates('LOOKBOOK').some(item => item.id === 'fashion-lookbook'));
  assert.ok(searchStudioEditTemplates('gym', 'Fitness').some(item => item.id === 'workout-energy'));
  assert.equal(searchStudioEditTemplates('not-a-template').length, 0);
});

test('category filters only return templates in the requested category', () => {
  const results = searchStudioEditTemplates('', 'Cinematic');
  assert.ok(results.length >= 3);
  assert.ok(results.every(item => item.category === 'Cinematic'));
});

test('applying a template returns normalized editable settings and a timed title layer', () => {
  const applied = createStudioEditTemplate('travel-diary', 'title-1', 12);
  assert.equal(applied.aspectRatio, 'landscape');
  assert.equal(applied.transition, 'cross-dissolve');
  assert.equal(applied.textLayer.id, 'title-1');
  assert.equal(applied.textLayer.start, 0);
  assert.equal(applied.textLayer.end, 3.5);
  assert.equal(applied.textLayer.text, 'POSTCARDS FROM…');
});

test('short projects clamp the template title duration to the available timeline', () => {
  const applied = createStudioEditTemplate('bold-hook', 'title-2', 1.25);
  assert.equal(applied.textLayer.end, 1.25);
});
