import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createCircleInvite, redeemCircleInvite, revokeCircleInvite } from '../src/communityInvites.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'community-invite-tests');
const db = getFirestore(app);
const circle = db.doc('communities/invite-test-circle');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Circle invite tests require the Firestore Emulator.');
  await db.recursiveDelete(circle);
  await circle.set({ id: 'invite-test-circle', ownerId: 'alice', type: 'invite-only', bannedUsers: ['mallory'] });
  await circle.collection('members').doc('alice').set({ userId: 'alice', role: 'owner', status: 'active' });
  await circle.collection('members').doc('bob').set({ userId: 'bob', role: 'moderator', status: 'active' });
});

after(async () => {
  await db.recursiveDelete(circle);
  const invites = await db.collection('communityInvites').get();
  await Promise.all(invites.docs.filter(doc => doc.data().communityId === 'invite-test-circle').map(doc => doc.ref.delete()));
  await deleteApp(app);
});

describe('trusted Circle invitations', () => {
  it('creates a hashed, expiring invite and transactionally admits a user', async () => {
    const invite = await createCircleInvite(db, 'bob', 'invite-test-circle', 7, 2);
    assert.equal(invite.maxUses, 2);
    const stored = await db.collection('communityInvites').get();
    const record = stored.docs.find(doc => doc.data().communityId === 'invite-test-circle');
    assert.ok(record);
    assert.notEqual(record!.id, invite.token);
    assert.equal(record!.get('useCount'), 0);

    assert.deepEqual(await redeemCircleInvite(db, 'charlie', invite.token), { communityId: 'invite-test-circle', joined: true });
    assert.equal((await circle.collection('members').doc('charlie').get()).get('role'), 'member');
    assert.deepEqual(await redeemCircleInvite(db, 'charlie', invite.token), { communityId: 'invite-test-circle', joined: false });
  });

  it('denies banned users and rejects revoked invitations', async () => {
    const invite = await createCircleInvite(db, 'alice', 'invite-test-circle', 1, 5);
    await assert.rejects(redeemCircleInvite(db, 'mallory', invite.token), /cannot join/);
    await revokeCircleInvite(db, 'alice', invite.token);
    await assert.rejects(redeemCircleInvite(db, 'dave', invite.token), /Invalid or expired/);
  });

  it('rejects non-manager creation and invalid settings', async () => {
    await assert.rejects(createCircleInvite(db, 'charlie', 'invite-test-circle'), /Only active Circle managers/);
    await assert.rejects(createCircleInvite(db, 'alice', 'invite-test-circle', 90, 5), /Invalid Circle invitation settings/);
  });
});
