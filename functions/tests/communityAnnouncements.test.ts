import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createCircleAnnouncement, setCircleAnnouncementPinned } from '../src/communityAnnouncements.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'community-announcement-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Circle announcement tests require the Firestore Emulator.');
  await db.recursiveDelete(db.doc('communities/announcement-circle'));
  await db.doc('communities/announcement-circle').set({ id: 'announcement-circle', ownerId: 'alice', type: 'public' });
  await db.doc('communities/announcement-circle/members/alice').set({ userId: 'alice', role: 'owner', status: 'active' });
  await db.doc('communities/announcement-circle/members/bob').set({ userId: 'bob', role: 'member', status: 'active' });
  await db.doc('communities/announcement-circle/members/carol').set({ userId: 'carol', role: 'moderator', status: 'active' });
});

after(async () => {
  await db.recursiveDelete(db.doc('communities/announcement-circle'));
  await deleteApp(app);
});

describe('trusted Circle announcements', () => {
  it('allows the active owner to publish bounded announcements', async () => {
    const created = await createCircleAnnouncement(db, 'alice', 'announcement-circle', 'Read this first', 'Welcome to the Circle.');
    const item = await db.doc(`communities/announcement-circle/announcements/${created.announcementId}`).get();
    assert.equal(item.get('title'), 'Read this first');
    assert.equal(item.get('body'), 'Welcome to the Circle.');
    assert.equal(item.get('pinned'), false);
    const delegated = await createCircleAnnouncement(db, 'carol', 'announcement-circle', 'Moderator update', 'A moderator can publish.');
    assert.equal((await db.doc(`communities/announcement-circle/announcements/${delegated.announcementId}`).get()).get('createdBy'), 'carol');
    await assert.rejects(createCircleAnnouncement(db, 'bob', 'announcement-circle', 'Member post', 'Not allowed.'), /Only active Circle owners, admins, or moderators/);
    await assert.rejects(createCircleAnnouncement(db, 'alice', 'announcement-circle', '', 'Missing title'), /character limits/);
    await assert.rejects(createCircleAnnouncement(db, 'alice', 'announcement-circle', 'Too long', 'x'.repeat(2001)), /character limits/);
  });

  it('allows active Circle managers to pin or unpin an existing announcement', async () => {
    const created = await createCircleAnnouncement(db, 'alice', 'announcement-circle', 'Pinned notice', 'Important update.');
    assert.deepEqual(await setCircleAnnouncementPinned(db, 'alice', 'announcement-circle', created.announcementId, true), { pinned: true });
    assert.equal((await db.doc(`communities/announcement-circle/announcements/${created.announcementId}`).get()).get('pinned'), true);
    assert.deepEqual(await setCircleAnnouncementPinned(db, 'carol', 'announcement-circle', created.announcementId, false), { pinned: false });
    await assert.rejects(setCircleAnnouncementPinned(db, 'bob', 'announcement-circle', created.announcementId, false), /Only active Circle owners, admins, or moderators/);
    await assert.rejects(setCircleAnnouncementPinned(db, 'alice', 'announcement-circle', 'missing', true), /unavailable/);
  });
});
