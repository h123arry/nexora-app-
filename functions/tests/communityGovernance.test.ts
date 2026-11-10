import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setCircleMemberRole, moderateCircleMember, listCircleBans } from '../src/communityGovernance.js';

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


describe('trusted Circle member enforcement', () => {
  it('bans and unbans transactionally, then permits a clean public rejoin', async () => {
    const banned = await moderateCircleMember(db, 'alice', 'governance-circle', 'bob', 'ban', 'Repeated harassment reports');
    assert.deepEqual(banned, { userId: 'bob', action: 'ban', status: 'banned' });
    assert.equal((await circle.collection('members').doc('bob').get()).get('status'), 'banned');
    assert.equal((await circle.collection('bans').doc('bob').get()).exists, true);
    const banList = await listCircleBans(db, 'alice', 'governance-circle');
    assert.equal(banList.length, 1);
    assert.equal(banList[0].userId, 'bob');
    assert.equal(banList[0].reason, 'Repeated harassment reports');
    await assert.rejects(listCircleBans(db, 'bob', 'governance-circle'), /Only active Circle managers/);
    const banEvents = await circle.collection('auditEvents').where('targetUid', '==', 'bob').where('action', '==', 'member_banned').get();
    assert.equal(banEvents.size, 1);
    assert.equal(banEvents.docs[0].get('reason'), 'Repeated harassment reports');

    const unbanned = await moderateCircleMember(db, 'alice', 'governance-circle', 'bob', 'unban', 'Appeal reviewed and accepted');
    assert.deepEqual(unbanned, { userId: 'bob', action: 'unban', status: 'unbanned' });
    assert.equal((await circle.collection('members').doc('bob').get()).exists, false);
    assert.equal((await circle.collection('bans').doc('bob').get()).exists, false);
    const unbanEvents = await circle.collection('auditEvents').where('targetUid', '==', 'bob').where('action', '==', 'member_unbanned').get();
    assert.equal(unbanEvents.size, 1);
  });

  it('allows moderators to remove lower-ranked members but prevents privilege escalation', async () => {
    await circle.collection('members').doc('bob').set({ userId: 'bob', role: 'member', status: 'active' });
    const removed = await moderateCircleMember(db, 'carol', 'governance-circle', 'bob', 'remove', 'Repeated disruption after warning');
    assert.deepEqual(removed, { userId: 'bob', action: 'remove', status: 'removed' });
    assert.equal((await circle.collection('members').doc('bob').get()).exists, false);
    await assert.rejects(
      moderateCircleMember(db, 'carol', 'governance-circle', 'alice', 'ban', 'Attempted owner ban'),
      /equal or higher role/,
    );
    await assert.rejects(
      moderateCircleMember(db, 'bob', 'governance-circle', 'carol', 'remove', 'Non-manager action'),
      /Only active Circle managers/,
    );
    const events = await circle.collection('auditEvents').where('targetUid', '==', 'bob').where('action', '==', 'member_removed').get();
    assert.equal(events.size, 1);
  });

  it('rejects invalid moderation inputs and unknown ban records without mutating membership', async () => {
    await assert.rejects(
      moderateCircleMember(db, 'alice', 'governance-circle', 'carol', 'ban', 'x'),
      /valid member/,
    );
    await assert.rejects(
      moderateCircleMember(db, 'alice', 'governance-circle', 'carol', 'unban', 'No active ban exists'),
      /not banned/,
    );
    assert.equal((await circle.collection('members').doc('carol').get()).get('status'), 'active');
  });
});
