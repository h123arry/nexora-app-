import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadVohPublicDiscovery, type VohFirestoreReader } from '../server/vohFeatureContext';

type Row = { id: string; value: Record<string, unknown> };
const snapshot = (id: string, value: Record<string, unknown>, exists = true) => ({
  id, exists, data: () => value,
});

function makeDb(rows: Row[], records: Record<string, Record<string, unknown>>): VohFirestoreReader {
  return {
    collection(name: string) {
      const base = name;
      return Object.assign({
        where(field: string, operator: '==', value: unknown) {
          const filtered = rows.filter(row => base !== 'posts' || (operator === '==' && row.value[field] === value));
          return {
            orderBy() { return this; },
            limit(count: number) { return { get: async () => ({ docs: filtered.slice(0, count).map(row => snapshot(row.id, row.value)) }) }; },
            get: async () => ({ docs: filtered.map(row => snapshot(row.id, row.value)) }),
          };
        },
        orderBy() { return this; },
        limit(count: number) { return { get: async () => ({ docs: rows.slice(0, count).map(row => snapshot(row.id, row.value)) }) }; },
        get: async () => ({ docs: rows.map(row => snapshot(row.id, row.value)) }),
      }, {
        doc(id: string) {
          const path = base + '/' + id;
          return {
            collection(child: string) {
              return { doc(childId: string) { return reference(path + '/' + child + '/' + childId); } };
            },
            get: async () => recordSnapshot(path),
          };
        },
      });
    },
    collectionGroup() { throw new Error('collectionGroup is not used'); },
  } as unknown as VohFirestoreReader;

  function recordSnapshot(path: string) {
    return snapshot(path.split('/').at(-1) || '', records[path] || {}, Object.prototype.hasOwnProperty.call(records, path));
  }
  function reference(path: string) {
    return { get: async () => recordSnapshot(path) };
  }
}

describe('VOH public discovery context', () => {
  it('loads only public posts from visible accounts and derives sample-scoped topics', async () => {
    const rows = [
      { id: 'post-a', value: { audience: 'public', userId: 'creator-a', content: 'Building a safe AI tool', tags: ['AI'], timestamp: '2026-11-20T10:00:00.000Z', likes: 8, commentsCount: 2, videoUrl: 'https://private.invalid/a.mp4', storagePath: 'private/a' } },
      { id: 'post-b', value: { audience: 'public', userId: 'creator-b', content: 'Learning AI together', tags: ['AI'], timestamp: '2026-11-20T09:00:00.000Z', likes: 4, commentsCount: 1 } },
      { id: 'post-private-profile', value: { audience: 'public', userId: 'creator-private', content: 'Hidden from non-followers', tags: ['AI'], timestamp: '2026-11-20T08:00:00.000Z' } },
    ];
    const records: Record<string, Record<string, unknown>> = {
      'users/viewer/settings/preferences': {},
      'users/creator-a': { username: 'creator_a' },
      'users/creator-b': { username: 'creator_b' },
      'users/creator-private': { username: 'private_creator' },
      'users/creator-a/settings/preferences': {},
      'users/creator-b/settings/preferences': {},
      'users/creator-private/settings/preferences': { privacy: { isPrivate: true } },
      'accountStatus/creator-a': {},
      'accountStatus/creator-b': {},
      'accountStatus/creator-private': {},
    };
    const result = await loadVohPublicDiscovery(makeDb(rows, records), 'viewer');
    assert.equal(result.sampleSize, 2);
    assert.deepEqual(result.posts.map(post => post.username), ['creator_a', 'creator_b']);
    assert.deepEqual(result.trendingTopics, [{ tag: 'ai', postCount: 2, creatorCount: 2 }]);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes('videoUrl'), false);
    assert.equal(serialized.includes('storagePath'), false);
    assert.equal(serialized.includes('creator-a'), false);
  });

  it('rejects a missing verified viewer identity', async () => {
    await assert.rejects(loadVohPublicDiscovery(makeDb([], {}), ''), /verified account/);
  });
});
