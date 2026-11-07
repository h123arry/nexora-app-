import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { applyAdminAccountAction } from '../src/adminUsers.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-admin-users';
const app = initializeApp({ projectId }, 'admin-user-management-tests');
const db = getFirestore(app);
const target = db.doc('users/admin-action-target');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Admin user-management tests require the Firestore Emulator.');
  await db.recursiveDelete(db.collection('users'));
  await db.recursiveDelete(db.collection('accountStatus'));
  await db.recursiveDelete(db.collection('adminAuditEvents'));
  await target.set({
    id: 'admin-action-target', username: 'target', name: 'Target User', role: 'user',
    isBanned: false, isSuspended: false, reputationPoints: 250,
    reputationBreakdown: { contributions: 100, helpfulness: 50, missionsCompleted: 50, skillsVerified: 50 },
  });
  await db.doc('users/founder-protected').set({ id: 'founder-protected', username: 'voh', role: 'founder', reputationPoints: 999 });
});

after(async () => {
  await db.recursiveDelete(db.collection('users'));
  await db.recursiveDelete(db.collection('accountStatus'));
  await db.recursiveDelete(db.collection('adminAuditEvents'));
  await deleteApp(app);
});

describe('trusted admin account actions', () => {
  it('applies and independently releases ban and suspension restrictions', async () => {
    await applyAdminAccountAction(db, 'admin-1', 'admin-action-target', 'ban', true);
    let user = await target.get();
    let status = await db.doc('accountStatus/admin-action-target').get();
    assert.equal(user.get('isBanned'), true);
    assert.equal(status.get('banned'), true);
    assert.equal(status.get('postingRestricted'), true);

    await applyAdminAccountAction(db, 'admin-1', 'admin-action-target', 'suspend', true);
    await applyAdminAccountAction(db, 'admin-1', 'admin-action-target', 'ban', false);
    user = await target.get();
    status = await db.doc('accountStatus/admin-action-target').get();
    assert.equal(user.get('isBanned'), false);
    assert.equal(user.get('isSuspended'), true);
    assert.equal(status.get('banned'), false);
    assert.equal(status.get('suspended'), true);
    assert.equal(status.get('postingRestricted'), true);

    await applyAdminAccountAction(db, 'admin-1', 'admin-action-target', 'suspend', false);
    status = await db.doc('accountStatus/admin-action-target').get();
    assert.equal(status.get('suspended'), false);
    assert.equal(status.get('postingRestricted'), false);
    assert.equal((await db.collection('adminAuditEvents').get()).size, 4);
  });

  it('resets reputation through a trusted transaction and protects the founder account', async () => {
    await applyAdminAccountAction(db, 'admin-1', 'admin-action-target', 'reset_reputation');
    const user = await target.get();
    assert.equal(user.get('reputationPoints'), 0);
    assert.deepEqual(user.get('reputationBreakdown'), {
      contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0,
    });
    await assert.rejects(
      applyAdminAccountAction(db, 'admin-1', 'founder-protected', 'reset_reputation'),
      /founder account cannot be changed/,
    );
  });
});
