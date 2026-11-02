import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setCircleMemberRole } from '../src/communityGovernance.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'community-governance-tests');
const db = getFirestore(app);
const circle = db.doc('communities/governance-circle');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Circle governance tests require the Firestore Emulator.');
  await db.recursiveDelete(circle);
  await circle.set({ id: 'governance-circle', ownerId: 'alice', type: 'public', admins: [], moderators: [] });
  await circle.collection('members').doc('alice').set({ userId: 'alice', role: 'owner', status: 'active' });
  await circle.collection('members').doc('bob').set({ userId: 'bob', role: 'member', status: 'active' });
  await circle.collection('members').doc('carol').set({ userId: 'carol', role: 'moderator', status: 'active' });
});

after(async () => {
  await db.recursiveDelete(circle);
  await deleteApp(app);
});

describe('trusted Circle role delegation', () => {
  it('allows the active owner to grant and revoke admin or moderator roles', async () => {
    assert.deepEqual(
      await setCircleMemberRole(db, 'alice', 'governance-circle', 'bob', 'moderator', 'Trusted community helper'),
      { userId: 'bob', role: 'moderator' },
    );
    assert.equal((await circle.collection('members').doc('bob').get()).get('role'), 'moderator');
    assert.deepEqual((await circle.get()).get('moderators'), ['bob']);
    assert.deepEqual((await circle.get()).get('admins'), []);
    const events = await circle.collection('auditEvents').where('targetUid', '==', 'bob').get();
    assert.equal(events.size, 1);
    assert.equal(events.docs[0].get('previousRole'), 'member');
    assert.equal(events.docs[0].get('newRole'), 'moderator');
    assert.equal(events.docs[0].get('reason'), 'Trusted community helper');

    await setCircleMemberRole(db, 'alice', 'governance-circle', 'bob', 'member', 'Role delegation ended');
    assert.equal((await circle.collection('members').doc('bob').get()).get('role'), 'member');
    assert.deepEqual((await circle.get()).get('moderators'), []);
    assert.equal((await circle.collection('auditEvents').where('targetUid', '==', 'bob').get()).size, 2);
  });

  it('denies non-owners, inactive targets, ownership changes, self-assignment, and invalid roles', async () => {
    await assert.rejects(setCircleMemberRole(db, 'carol', 'governance-circle', 'bob', 'admin', 'Not permitted'), /Only the active Circle owner/);
    await assert.rejects(setCircleMemberRole(db, 'alice', 'governance-circle', 'missing', 'moderator', 'No member'), /active Circle member/);
    await assert.rejects(setCircleMemberRole(db, 'alice', 'governance-circle', 'alice', 'admin', 'Self promotion'), /valid member/);
    await assert.rejects(setCircleMemberRole(db, 'alice', 'governance-circle', 'bob', 'owner', 'Transfer ownership'), /valid member/);
    await assert.rejects(setCircleMemberRole(db, 'alice', 'governance-circle', 'bob', 'admin', '  '), /valid member/);
    await assert.equal((await circle.collection('members').doc('bob').get()).get('role'), 'member');
  });
});
