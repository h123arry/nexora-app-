import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { auditWorldWeaveMembershipV2 } from '../src/worldWeaveMembershipAudit.js';

type CallableRunner = { run: (request: { data: Record<string, unknown>; auth?: { uid: string; token: Record<string, unknown> } | null }) => Promise<any> };
const call = (uid: string | null, data: Record<string, unknown> = {}, token: Record<string, unknown> = {}) =>
  (auditWorldWeaveMembershipV2 as unknown as CallableRunner).run({
    data, auth: uid ? { uid, token: { uid, ...token } } : null,
  });

const app = getApp();
const db = getFirestore(app);
const clean = db.doc('worldWeaves/membership-audit-clean');
const conflict = db.doc('worldWeaves/membership-audit-conflict');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave membership audit tests require the Firestore Emulator.');
  await db.recursiveDelete(clean);
  await db.recursiveDelete(conflict);
  await clean.set({ ownerId: 'alice', participantIds: ['alice', 'bob'], memberCount: 2 });
  await conflict.set({ ownerId: 'carol', participantIds: ['carol', 'carol', 'bad uid'], memberCount: 8 });
  await conflict.collection('members').doc('mallory').set({
    userId: 'someone-else', role: 'owner', status: 'active',
  });
});

after(async () => {
  await db.recursiveDelete(clean);
  await db.recursiveDelete(conflict);
  await deleteApp(app);
});

describe('WorldWeave Membership V2 read-only preflight', () => {
  it('requires an administrator and validates bounded paging', async () => {
    await assert.rejects(call('alice'), /Only NEXORA administrators/);
    await assert.rejects(call('admin', { limit: 26 }, { admin: true }), /page size from 1 to 25/);
    await assert.rejects(call('admin', { cursor: '../invalid' }, { admin: true }), /cursor is invalid/);
  });

  it('identifies clean legacy records without writing membership or schema data', async () => {
    const result = await call('admin', { limit: 25 }, { admin: true });
    assert.equal(result.mode, 'read_only_preflight');
    assert.equal(result.writesPerformed, 0);
    const row = result.results.find((item: any) => item.weaveId === clean.id);
    assert.ok(row);
    assert.equal(row.eligibleForBackfill, true);
    assert.deepEqual(row.issues, []);
    assert.equal((await clean.get()).get('membershipSchemaVersion'), undefined);
    assert.equal((await clean.collection('members').get()).size, 0);
  });

  it('flags duplicate, malformed, count-mismatched and conflicting member records', async () => {
    const result = await call('admin', { limit: 25 }, { role: 'founder' });
    const row = result.results.find((item: any) => item.weaveId === conflict.id);
    assert.ok(row);
    assert.equal(row.eligibleForBackfill, false);
    assert.ok(row.issues.includes('duplicate_legacy_participant_ids'));
    assert.ok(row.issues.includes('invalid_legacy_participant_ids'));
    assert.ok(row.issues.includes('legacy_member_count_mismatch'));
    assert.ok(row.issues.includes('membership_record_conflicts'));
    assert.ok(row.memberConflicts.includes('mallory:userId_mismatch'));
    assert.equal((await conflict.get()).get('membershipSchemaVersion'), undefined);
  });
});
