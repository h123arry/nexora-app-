import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('For You photo posts show the complete image and open a full-screen viewer', async () => {
  const image = await read('../src/components/NexoraImagePlayer.tsx');
  assert.match(image, /object-contain cursor-zoom-in/);
  assert.match(image, /setIsImageViewerOpen\(true\)/);
  assert.match(image, /role="dialog" aria-modal="true" aria-label="Full-screen photo viewer"/);
  assert.match(image, /max-h-full max-w-full object-contain/);
  assert.match(image, /className="hidden"/);
});

test('photo engagement actions render beneath the image instead of over it', async () => {
  const card = await read('../src/components/FeedPostCard.tsx');
  assert.match(card, /\{!\(post\.videoUrl \|\| post\.opportunityType\) && \(/);
  assert.match(card, /Spark/);
  assert.match(card, /Comment/);
  assert.match(card, /Quote post/);
});
