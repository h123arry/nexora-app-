import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { deletePageChannelUpdate, publishPageChannelUpdate } from '../src/pageChannels.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'page-channel-tests');
const db = getFirestore(app);
const page = db.doc('pages/page-channel-test');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Page channel tests require the Firestore Emulator.');
  await db.recursiveDelete(page);
  await page.set({ id: 'page-channel-test', ownerId: 'creator', category: 'Creator', name: 'Test Creator' });
  await db.collection('follows').doc('follower-1_page-channel-test').set({ followerId: 'follower-1', followingId: 'page-channel-test', createdAt: new Date() });
});
after(async () => { await db.recursiveDelete(page); await db.collection('follows').doc('follower-1_page-channel-test').delete(); await deleteApp(app); });

describe('official Page broadcast channel', () => {
  it('allows only the Page owner to publish and remove channel updates', async () => {
    const created = await publishPageChannelUpdate(db, 'creator', 'page-channel-test', 'A new update for followers.');
    const update = page.collection('channelUpdates').doc(created.updateId);
    assert.equal((await update.get()).get('status'), 'published');
    await assert.rejects(publishPageChannelUpdate(db, 'intruder', 'page-channel-test', 'Forged update'), /Only the owning Page/);
    await deletePageChannelUpdate(db, 'creator', 'page-channel-test', created.updateId);
    assert.equal((await update.get()).exists, false);
  });
  it('rejects invalid and oversized updates', async () => {
    await assert.rejects(publishPageChannelUpdate(db, 'creator', 'page-channel-test', '  '), /1 to 2,000/);
    await assert.rejects(publishPageChannelUpdate(db, 'creator', 'page-channel-test', 'x'.repeat(2001)), /1 to 2,000/);
  });
});
