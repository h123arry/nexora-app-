import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Firestore } from 'firebase-admin/firestore';
import { loadVohJoinedCircles } from '../server/vohCommunityContext';

function fakeStore(records: Array<{ id: string; userId: string; status: string; role: string; communityId: string; community?: Record<string, unknown> }>) {
  const docs = records.map(record => ({
    id: record.id,
    get: (field: string) => field === 'userId' ? record.userId : field === 'status' ? record.status : field === 'role' ? record.role : undefined,
    ref: { parent: { parent: {
      get: async () => ({
        id: record.communityId,
        exists: Boolean(record.community),
        data: () => record.community,
      }),
    } } },
  }));
  return {
    collectionGroup: (name: string) => {
      assert.equal(name, 'members');
      return {
        where: (field: string, operator: string, value: string) => {
          assert.equal(field, 'userId');
          assert.equal(operator, '==');
          assert.equal(value, 'verified-alice');
          return { limit: (amount: number) => ({ get: async () => ({ docs: docs.slice(0, amount) }) }) };
        },
      };
    },
  } as unknown as Pick<Firestore, 'collectionGroup'>;
}

describe('VOH joined Circles context', () => {
  it('returns only active memberships belonging to the verified UID', async () => {
    const store = fakeStore([
      { id: 'verified-alice', userId: 'verified-alice', status: 'active', role: 'owner', communityId: 'circle-a', community: { name: 'Design Circle', description: 'Designers', ownerId: 'verified-alice', type: 'private', membersCount: 8 } },
      { id: 'verified-alice', userId: 'verified-alice', status: 'left', role: 'member', communityId: 'circle-left', community: { name: 'Old Circle' } },
      { id: 'bob', userId: 'verified-alice', status: 'active', role: 'admin', communityId: 'mis-keyed', community: { name: 'Mis-keyed membership' } },
      { id: 'verified-alice', userId: 'bob', status: 'active', role: 'member', communityId: 'other-user', community: { name: 'Other user Circle' } },
      { id: 'verified-alice', userId: 'verified-alice', status: 'active', role: 'moderator', communityId: 'missing' },
    ]);
    assert.deepEqual(await loadVohJoinedCircles(store, 'verified-alice'), [{
      id: 'circle-a', name: 'Design Circle', description: 'Designers', creatorId: 'verified-alice',
      membersCount: 8, role: 'owner', type: 'private',
    }]);
  });

  it('returns no private context for an empty or missing UID', async () => {
    const store = fakeStore([]);
    assert.deepEqual(await loadVohJoinedCircles(store, ''), []);
    assert.deepEqual(await loadVohJoinedCircles(store, 'verified-alice'), []);
  });

  it('clamps membership reads to 25', async () => {
    let requestedLimit = 0;
    const store = {
      collectionGroup: () => ({ where: () => ({ limit: (amount: number) => { requestedLimit = amount; return { get: async () => ({ docs: [] }) }; } }) }),
    } as unknown as Pick<Firestore, 'collectionGroup'>;
    await loadVohJoinedCircles(store, 'verified-alice', 1000);
    assert.equal(requestedLimit, 25);
  });
});
