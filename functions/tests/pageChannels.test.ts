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
    const created = await publishPageChannelUpdate(db, 'creator', 'page-channel-test', 'A new update for followers.', 'page-channel-key-0001');
    const update = page.collection('channelUpdates').doc(created.updateId);
    assert.equal((await update.get()).get('status'), 'published');
    const notification = await db.collection('users').doc('follower-1').collection('notifications').doc(`page_${created.updateId}`).get();
    assert.equal(notification.get('type'), 'community');
    assert.equal(notification.get('userId'), 'follower-1');
    assert.equal(notification.get('isRead'), false);
    await assert.rejects(publishPageChannelUpdate(db, 'intruder', 'page-channel-test', 'Forged update', 'page-channel-key-0002'), /Only the owning Page/);
    await deletePageChannelUpdate(db, 'creator', 'page-channel-test', created.updateId);
    assert.equal((await update.get()).exists, false);
  });
  it('makes publish retries idempotent and preserves an existing read notification', async () => {
    const first = await publishPageChannelUpdate(db, 'creator', 'page-channel-test', 'One announcement.', 'page-channel-retry-0001');
    const notificationRef = db.collection('users').doc('follower-1').collection('notifications').doc(`page_${first.updateId}`);
    await notificationRef.update({ isRead: true });
    const retry = await publishPageChannelUpdate(db, 'creator', 'page-channel-test', 'One announcement.', 'page-channel-retry-0001');
    assert.deepEqual(retry, first);
    assert.equal((await page.collection('channelUpdates').get()).docs.filter(item => item.id === first.updateId).length, 1);
    assert.equal((await notificationRef.get()).get('isRead'), true);
    await assert.rejects(
      publishPageChannelUpdate(db, 'creator', 'page-channel-test', 'Different content.', 'page-channel-retry-0001'),
      /request key/,
    );
    await deletePageChannelUpdate(db, 'creator', 'page-channel-test', first.updateId);
    await notificationRef.delete();
  });

  it('rejects invalid and oversized updates', async () => {
    await assert.rejects(publishPageChannelUpdate(db, 'creator', 'page-channel-test', '  ', 'page-channel-key-0003'), /1 to 2,000/);
    await assert.rejects(publishPageChannelUpdate(db, 'creator', 'page-channel-test', 'x'.repeat(2001), 'page-channel-key-0004'), /1 to 2,000/);
  });
});
