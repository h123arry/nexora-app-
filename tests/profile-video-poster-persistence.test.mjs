import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('profile video posters use persisted fields and survive poster-effect refreshes', async () => {
  const profile = await readFile(new URL('../src/components/ProfileView.tsx', import.meta.url), 'utf8');
  assert.match(profile, /temporaryPosterUrls = useRef<string\[\]>\(\[\]\)/);
  assert.match(profile, /temporaryPosterUrls\.current\.forEach\(url => URL\.revokeObjectURL\(url\)\)/);
  assert.match(profile, /const savedPoster = \(post as any\)\.videoThumbnailUrl \|\| \(post as any\)\.posterUrl/);
  assert.match(profile, /videoThumbnailUrl: uploaded\.downloadUrl,[\s\S]*?posterUrl: uploaded\.downloadUrl/);
  assert.match(profile, /\? \(post as any\)\.videoThumbnailUrl[\s\S]*?\|\| \(post as any\)\.posterUrl[\s\S]*?\|\| repairedPosters\[post\.id\]/);
  assert.doesNotMatch(profile, /objectUrls\.forEach\(url => URL\.revokeObjectURL\(url\)\)/);
});

test('feed video player prefers the durable poster fields saved on the post', async () => {
  const player = await readFile(new URL('../src/components/NexoraVideoPlayer.tsx', import.meta.url), 'utf8');
  assert.match(player, /const posterUrl = \(post as any\)\.videoThumbnailUrl \|\| \(post as any\)\.posterUrl/);
  assert.match(player, /poster=\{shouldLoadVideoPoster\([\s\S]*?\? \(posterUrl \|\| undefined\)/);
});
