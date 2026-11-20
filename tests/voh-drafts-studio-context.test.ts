import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadVohOwnDrafts, loadVohOwnStudioProject, type VohFirestoreReader, type VohSnapshotDocument } from '../server/vohFeatureContext';

class Query {
  filters: Array<[string, string, unknown]> = [];
  order: [string, string] | null = null;
  max = 0;
  constructor(private readonly docs: VohSnapshotDocument[]) {}
  where(field: string, operator: '==', value: unknown) { this.filters.push([field, operator, value]); return this; }
  orderBy(field: string, direction: 'desc') { this.order = [field, direction]; return this; }
  limit(count: number) { this.max = count; return this; }
  async get() { return { docs: this.docs.slice(0, this.max || undefined) }; }
}
const doc = (id: string, value: Record<string, unknown>, exists = true): VohSnapshotDocument => ({ id, exists, data: () => value });

describe('VOH saved draft and Studio context', () => {
  it('loads only bounded fields from drafts owned by the verified UID', async () => {
    let uid = ''; let query: Query | null = null;
    const db = { collection: (name: string) => {
      assert.equal(name, 'drafts');
      return { where: (field: string, op: '==', value: unknown) => {
        assert.equal(field, 'userId'); uid = String(value);
        query = new Query([doc('draft-1', { userId: uid, caption: 'A saved idea', type: 'video', tags: ['launch'], videoUrl: 'https://private.invalid/media', secret: 'do not expose' })]);
        return query;
      } };
    } } as unknown as VohFirestoreReader;
    const result = await loadVohOwnDrafts(db, 'verified-user');
    assert.equal(uid, 'verified-user');
    assert.deepEqual(query?.order, ['updatedAt', 'desc']);
    assert.equal(query?.max, 10);
    assert.deepEqual(result, [{ id: 'draft-1', caption: 'A saved idea', type: 'video', tags: ['launch'], updatedAt: '' }]);
    assert.equal('videoUrl' in result[0], false);
  });
  it('summarizes the owner Studio manifest without exposing asset paths or media', async () => {
    let collection = ''; let uid = '';
    const snapshot = doc('verified-user', {
      revision: 7, updatedAt: '2026-11-20T12:00:00.000Z',
      manifest: { schemaVersion: 1, project: { caption: 'Studio cut', aspectRatio: 'landscape', clips: [{}, {}], textLayers: [{}], imageLayers: [{}, {}], subtitleSegments: [{}], soundtrack: { $studioAsset: 'a1' }, voiceover: null },
        assets: { a1: { storagePath: 'users/verified-user/studio-drafts/active/assets/a1', contentType: 'video/mp4', size: 1024 } } },
    });
    const db = { collection: (name: string) => { collection = name; return { doc: (id: string) => { uid = id; return { get: async () => snapshot }; } }; } } as unknown as VohFirestoreReader;
    const result = await loadVohOwnStudioProject(db, 'verified-user');
    assert.equal(collection, 'studioCloudDrafts'); assert.equal(uid, 'verified-user');
    assert.deepEqual(result, { revision: 7, caption: 'Studio cut', aspectRatio: 'landscape', clipCount: 2, textLayerCount: 1, imageLayerCount: 2, subtitleCount: 1, assetCount: 1, updatedAt: '2026-11-20T12:00:00.000Z', hasSoundtrack: true, hasVoiceover: false });
    assert.equal(JSON.stringify(result).includes('storagePath'), false);
  });
  it('returns no Studio summary for a missing cloud project and rejects missing identity', async () => {
    const db = { collection: () => ({ doc: () => ({ get: async () => doc('missing', {}, false) }) }) } as unknown as VohFirestoreReader;
    assert.equal(await loadVohOwnStudioProject(db, 'verified-user'), null);
    await assert.rejects(loadVohOwnDrafts(db, ''), /verified account/);
    await assert.rejects(loadVohOwnStudioProject(db, ''), /verified account/);
  });
});