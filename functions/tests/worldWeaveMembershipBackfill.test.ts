import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { backfillWorldWeaveMembershipV2 } from '../src/worldWeaveMembershipBackfill.js';

type CallableRunner = { run: (request: { data: Record<string, unknown>; auth?: { uid: string; token: Record<string, unknown> } | null }) => Promise<any> };
const call = (uid: string | null, data: Record<string, unknown> = {}, token: Record<string, unknown> = {}) =>
  (backfillWorldWeaveMembershipV2 as unknown as CallableRunner).run({
    data, auth: uid ? { uid, token: { uid, ...token } } : null,
  });

const app = getApp();
const db = getFirestore(app);
const clean = db.doc('worldWeaves/membership-backfill-clean');
const conflict = db.doc('worldWeaves/membership-backfill-conflict');
const large = db.doc('worldWeaves/membership-backfill-large');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave membership backfill tests require the Firestore Emulator.');
  await Promise.all([clean, conflict, large].map(ref => db.recursiveDelete(ref)));
  await clean.set({ ownerId: 'alice', participantIds: ['alice', 'bob'], memberCount: 2 });
  await conflict.set({ ownerId: 'carol', participantIds: ['carol', 'dave'], memberCount: 2 });
  await conflict.collection('members').doc('mallory').set({
    userId: 'mallory', role: 'contributor', status: 'active',
  });
  const participants = Array.from({ length: 450 }, (_, index) => 'member-' + index);
  await large.set({ ownerId: participants[0], participantIds: participants, memberCount: participants.length });
});

after(async () => {
  await Promise.all([clean, conflict, large].map(ref => db.recursiveDelete(ref)));
  await deleteApp(app);
});

describe('WorldWeave Membership V2 resumable backfill', () => {
  it('requires an administrator and validates the experience ID', async () => {
    await assert.rejects(call('alice', { weaveId: clean.id }), /Only NEXORA administrators/);
    await assert.rejects(call('admin', { weaveId: '../bad' }, { admin: true }), /valid WorldWeave ID/);
  });

  it('creates owner and contributor records, then advances the schema version', async () => {
    const result = await call('admin', { weaveId: clean.id }, { admin: true });
    assert.equal(result.completed, true);
    assert.equal(result.created, 2);
    assert.equal((await clean.get()).get('membershipSchemaVersion'), 2);
    assert.equal((await clean.collection('members').doc('alice').get()).get('role'), 'owner');
    assert.equal((await clean.collection('members').doc('bob').get()).get('role'), 'contributor');
    assert.equal((await clean.collection('members').doc('bob').get()).get('status'), 'active');
    const repeated = await call('admin', { weaveId: clean.id }, { admin: true });
    assert.equal(repeated.alreadyMigrated, true);
    assert.equal(repeated.created, 0);
  });

  it('resumes safely across bounded passes for a large experience', async () => {
    const first = await call('admin', { weaveId: large.id }, { role: 'founder' });
    assert.equal(first.completed, false);
    assert.equal(first.created, 400);
    assert.equal(first.remaining, 50);
    assert.equal((await large.get()).get('membershipSchemaVersion'), undefined);
    const second = await call('admin', { weaveId: large.id }, { role: 'founder' });
    assert.equal(second.completed, true);
    assert.equal(second.created, 50);
    assert.equal((await large.get()).get('membershipSchemaVersion'), 2);
    assert.equal((await large.collection('members').get()).size, 450);
  });

  it('refuses to guess when pre-existing member documents conflict', async () => {
    await assert.rejects(
      call('admin', { weaveId: conflict.id }, { admin: true }),
      /Existing membership records conflict/,
    );
    assert.equal((await conflict.get()).get('membershipSchemaVersion'), undefined);
    assert.equal((await conflict.collection('members').get()).size, 1);
  });

  it('refuses malformed legacy arrays, duplicate IDs and count mismatches', async () => {
    const invalid = db.doc('worldWeaves/membership-backfill-invalid');
    await invalid.set({ ownerId: 'eve', participantIds: ['eve', 'eve'], memberCount: 1 });
    await assert.rejects(call('admin', { weaveId: invalid.id }, { admin: true }), /Resolve duplicate members/);
    await invalid.update({ participantIds: ['eve', 'frank'], memberCount: 9 });
    await assert.rejects(call('admin', { weaveId: invalid.id }, { admin: true }), /member count mismatch/);
    await db.recursiveDelete(invalid);
  });
});
