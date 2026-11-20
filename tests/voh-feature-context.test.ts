import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  loadVohJoinedCommunities,
  loadVohOwnNotifications,
  type VohFirestoreReader,
  type VohSnapshotDocument,
} from '../server/vohFeatureContext';

class Query {
  readonly filters: Array<[string, string, unknown]> = [];
  order: [string, string] | null = null;
  max = 0;
  constructor(private readonly docs: VohSnapshotDocument[]) {}
  where(field: string, operator: '==', value: unknown) { this.filters.push([field, operator, value]); return this; }
  orderBy(field: string, direction: 'desc') { this.order = [field, direction]; return this; }
  limit(count: number) { this.max = count; return this; }
  async get() { return { docs: this.docs.slice(0, this.max || undefined) }; }
}

function document(id: string, data: Record<string, unknown>, parent?: VohSnapshotDocument) {
  return {
    id,
    data: () => data,
    ref: parent ? { parent: { parent: { path: `communities/${parent.id}`, get: async () => parent } } } : undefined,
  } as VohSnapshotDocument;
}

describe('VOH feature context loaders', () => {
  it('reads a bounded notification subcollection under the verified UID', async () => {
    let path = '';
    let uid = '';
    let query: Query | null = null;
    const db = {
      collection: (value: string) => {
        path = value;
        return { doc: (id: string) => {
          uid = id;
          return { collection: (name: string) => {
            assert.equal(name, 'notifications');
            query = new Query([
              document('n1', { content: 'New follower', timestamp: { toDate: () => new Date('2026-11-20T12:00:00.000Z') }, isRead: false }),
              document('n2', { content: 'Private payload', phone: '+123456789' }),
            ]);
            return query;
          } };
        } };
      },
    } as unknown as VohFirestoreReader;
    const result = await loadVohOwnNotifications(db, 'verified-user');
    assert.equal(path, 'users');
    assert.equal(uid, 'verified-user');
    assert.deepEqual(query?.order, ['timestamp', 'desc']);
    assert.equal(query?.max, 5);
    assert.deepEqual(result, [
      { content: 'New follower', timestamp: '2026-11-20T12:00:00.000Z' },
      { content: 'Private payload', timestamp: '' },
    ]);
    assert.equal('phone' in result[1], false);
  });

  it('loads only active memberships and exposes a minimal Circle projection', async () => {
    let query: Query | null = null;
    const circle = document('circle-1', {
      name: 'Builders', description: 'A creator community', ownerId: 'owner-1',
      membersCount: 24, reports: ['private report'], pendingMembers: ['other-user'],
    });
    const db = {
      collectionGroup: (name: string) => {
        assert.equal(name, 'members');
        query = new Query([document('verified-user', { userId: 'verified-user', status: 'active' }, circle)]);
        return query;
      },
    } as unknown as VohFirestoreReader;
    const result = await loadVohJoinedCommunities(db, 'verified-user');
    assert.deepEqual(query?.filters, [
      ['userId', '==', 'verified-user'],
    ]);
    assert.equal(query?.max, 50);
    assert.deepEqual(result, [{
      id: 'circle-1', name: 'Builders', description: 'A creator community',
      creatorId: 'owner-1', membersCount: 24,
    }]);
    assert.equal('reports' in result[0], false);
    assert.equal('pendingMembers' in result[0], false);
  });

  it('refuses to load account context without a verified UID', async () => {
    const db = {} as VohFirestoreReader;
    await assert.rejects(loadVohOwnNotifications(db, ''), /verified account/);
    await assert.rejects(loadVohJoinedCommunities(db, ''), /verified account/);
  });
});
