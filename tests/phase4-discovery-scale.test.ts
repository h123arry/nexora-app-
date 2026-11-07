import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { rankPosts, searchPosts } from '../src/services/discovery/discoveryService';

const now = Date.parse('2026-11-07T00:00:00.000Z');
const fixture = Array.from({ length: 5000 }, (_, index) => ({
  id: `scale-post-${index}`,
  userId: `creator-${index % 250}`,
  username: `creator${index % 250}`,
  name: `Creator ${index % 250}`,
  avatar: '',
  content: index % 5 === 0 ? 'Nexora discovery performance fixture' : 'Community update',
  timestamp: now - index * 60_000,
  likes: index % 700,
  comments: [],
  commentsCount: index % 40,
  shares: index % 20,
  tags: index % 5 === 0 ? ['nexora', 'discovery'] : ['community'],
})) as any[];

test('large discovery fixtures stay bounded, unique and diversified', () => {
  const started = performance.now();
  const ranked = rankPosts(fixture, { now, mode: 'forYou', maxPostsPerCreator: 3, maxConsecutivePostsPerCreator: 1 });
  const elapsed = performance.now() - started;
  assert.equal(ranked.length, fixture.length);
  assert.equal(new Set(ranked.map(item => item.post.id)).size, fixture.length);
  assert.ok(elapsed < 5000, `5,000-post ranking took ${elapsed.toFixed(1)}ms`);
  for (let index = 1; index < Math.min(100, ranked.length); index += 1) {
    assert.notEqual(ranked[index - 1].post.userId, ranked[index].post.userId);
  }
});

test('large local search returns only matching posts within the requested cap', () => {
  const started = performance.now();
  const results = searchPosts(fixture, 'Nexora discovery', { limit: 25 });
  const elapsed = performance.now() - started;
  assert.equal(results.length, 25);
  assert.ok(results.every(post => post.content.includes('Nexora discovery')));
  assert.ok(elapsed < 2500, `5,000-post search took ${elapsed.toFixed(1)}ms`);
});

test('Firestore composite indexes cover public Circle and creator retention queries', () => {
  const config = JSON.parse(readFileSync(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));
  const signature = (index: any) => index.fields.map((field: any) => field.fieldPath).join(',');
  const indexes = config.indexes.map((index: any) => `${index.collectionGroup}:${signature(index)}`);
  assert.ok(indexes.includes('communities:type,name'));
  assert.ok(indexes.includes('creatorVideoDaily:creatorId,day'));
});
