import test from 'node:test';
import assert from 'node:assert/strict';
import { setCreatorFollowStateForUser, SocialFollowError } from '../server/socialFollow';

function createStore(seed: Record<string, Record<string, unknown>>) {
  const records = new Map(Object.entries(seed));
  const ref = (collection: string, id: string) => ({ path: collection + '/' + id });
  const snapshot = (path: string) => {
    const value = records.get(path);
    return {
      exists: value !== undefined,
      data: () => value,
      get: (key: string) => value?.[key],
    };
  };
  const store = {
    collection: (collection: string) => ({ doc: (id: string) => ref(collection, id) }),
    runTransaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      get: async (reference: { path: string }) => snapshot(reference.path),
      create: (reference: { path: string }, value: Record<string, unknown>) => { records.set(reference.path, { ...value }); },
      set: (reference: { path: string }, value: Record<string, unknown>, options?: { merge?: boolean }) => {
        records.set(reference.path, options?.merge ? { ...(records.get(reference.path) || {}), ...value } : { ...value });
      },
      update: (reference: { path: string }, value: Record<string, unknown>) => {
        records.set(reference.path, { ...(records.get(reference.path) || {}), ...value });
      },
      delete: (reference: { path: string }) => { records.delete(reference.path); },
    }),
  };
  return { store: store as any, records };
}

test('follow mutation rejects self-follow before touching storage', async () => {
  const { store } = createStore({});
  await assert.rejects(
    () => setCreatorFollowStateForUser(store, 'same-user', 'same-user', true),
    (error: unknown) => error instanceof SocialFollowError && error.code === 'invalid-argument',
  );
});

test('follow mutation writes one canonical edge and keeps counters idempotent', async () => {
  const { store, records } = createStore({
    'users/follower': { following: 0, username: 'follower' },
    'users/creator': { followers: 0, username: 'creator' },
    'publicProfiles/follower': { id: 'follower', following: 0 },
    'publicProfiles/creator': { id: 'creator', followers: 0 },
  });
  const first = await setCreatorFollowStateForUser(store, 'follower', 'creator', true, new Date('2026-11-21T00:00:00Z'));
  const second = await setCreatorFollowStateForUser(store, 'follower', 'creator', true, new Date('2026-11-21T00:00:00Z'));
  assert.deepEqual(first, { following: true, changed: true, followerCount: 1 });
  assert.deepEqual(second, { following: true, changed: false, followerCount: 1 });
  assert.equal(records.get('publicProfiles/creator')?.followers, 1);
  assert.equal(records.get('publicProfiles/follower')?.following, 1);
  assert.equal(records.get('follows/follower_creator')?.followingId, 'creator');
});

test('follow mutation reverses a follow without allowing negative counters', async () => {
  const { store, records } = createStore({
    'users/follower': { following: 1, username: 'follower' },
    'users/creator': { followers: 1, username: 'creator' },
    'publicProfiles/follower': { id: 'follower', following: 1 },
    'publicProfiles/creator': { id: 'creator', followers: 1 },
    'follows/follower_creator': { followerId: 'follower', followingId: 'creator' },
  });
  const result = await setCreatorFollowStateForUser(store, 'follower', 'creator', false);
  assert.deepEqual(result, { following: false, changed: true, followerCount: 0 });
  assert.equal(records.get('publicProfiles/creator')?.followers, 0);
  assert.equal(records.get('publicProfiles/follower')?.following, 0);
  assert.equal(records.has('follows/follower_creator'), false);
});
