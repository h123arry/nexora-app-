import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('camera capture enforces the 20-photo cap before capture and inside the queued state update', async () => {
  const source = await readFile(new URL('../src/components/MediaCreationEngine.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(selectedImages\.length >= 20\)\s*\{/);
  assert.match(source, /setSelectedImages\(prev => prev\.length >= 20\s*\?\s*prev\s*:\s*\[\.\.\.prev,/);
  assert.match(source, /setActiveEditIndex\(selectedImages\.length\)/);
});
