import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { listCircleReports, resolveCircleReport, submitCircleReport } from '../src/communityReports.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'community-report-tests');
const db = getFirestore(app);
const circle = db.doc('communities/report-test-circle');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Circle report tests require the Firestore Emulator.');
  await db.recursiveDelete(circle);
  await circle.set({ id: 'report-test-circle', ownerId: 'alice', type: 'public', admins: [], moderators: [] });
  await circle.collection('members').doc('alice').set({ userId: 'alice', role: 'owner', status: 'active' });
  await circle.collection('members').doc('bob').set({ userId: 'bob', role: 'member', status: 'active' });
  await circle.collection('members').doc('carol').set({ userId: 'carol', role: 'member', status: 'active' });
  await circle.collection('posts').doc('post-review').set({ id: 'post-review', authorId: 'carol', content: 'A reported Circle post' });
  await circle.collection('posts').doc('post-carol-review').set({ id: 'post-carol-review', authorId: 'bob', content: 'A reported post by Bob' });
  await circle.collection('posts').doc('post-remove').set({ id: 'post-remove', authorId: 'carol', content: 'A post to remove after review' });
  await circle.collection('posts').doc('post-dismiss').set({ id: 'post-dismiss', authorId: 'carol', content: 'A post that should remain' });
  await circle.collection('messages').doc('message-dismiss').set({ id: 'message-dismiss', senderId: 'carol', content: 'A reported message' });
  await db.collection('publicProfiles').doc('bob').set({ name: 'Bob Reporter', username: 'bob' });
  await db.collection('publicProfiles').doc('carol').set({ name: 'Carol Member', username: 'carol' });
});

after(async () => {
  await db.recursiveDelete(circle);
  await Promise.all(['bob', 'carol'].map(uid => db.collection('publicProfiles').doc(uid).delete()));
  await deleteApp(app);
});

describe('trusted Circle reporting and review', () => {
  it('accepts one report per member and target, rejects duplicate and self reports', async () => {
    const submitted = await submitCircleReport(db, 'carol', 'report-test-circle', 'post', 'post-carol-review', 'This post contains targeted harassment.');
    assert.equal(submitted.submitted, true);
    assert.equal(submitted.reportId.length, 64);
    await assert.rejects(
      submitCircleReport(db, 'carol', 'report-test-circle', 'post', 'post-carol-review', 'This post contains targeted harassment.'),
      /already reported/,
    );
    await assert.rejects(
      submitCircleReport(db, 'carol', 'report-test-circle', 'post', 'post-review', 'This is my own post and I report it.'),
      /own Circle content/,
    );
    await assert.rejects(
      submitCircleReport(db, 'bob', 'report-test-circle', 'member', 'bob', 'I am reporting my own account.'),
      /valid Circle content/,
    );
    await assert.rejects(
      submitCircleReport(db, 'mallory', 'report-test-circle', 'post', 'post-review', 'This post contains targeted harassment.'),
      /Join this Circle/,
    );
    await resolveCircleReport(db, 'alice', 'report-test-circle', submitted.reportId, 'dismiss', 'Reviewed and dismissed after evidence check');
  });

  it('exposes the bounded open queue only to active Circle managers', async () => {
    await submitCircleReport(db, 'bob', 'report-test-circle', 'post', 'post-review', 'This post contains targeted harassment.');
    const reports = await listCircleReports(db, 'alice', 'report-test-circle');
    assert.equal(reports.length, 1);
    assert.equal(reports[0].reporterName, 'Bob Reporter');
    assert.equal(reports[0].targetSummary, 'A reported Circle post');
    await assert.rejects(listCircleReports(db, 'bob', 'report-test-circle'), /Only active Circle managers/);
  });

  it('removes reported posts transactionally and records the resolution', async () => {
    const submitted = await submitCircleReport(db, 'bob', 'report-test-circle', 'post', 'post-remove', 'This post contains targeted harassment.');
    const resolved = await resolveCircleReport(db, 'alice', 'report-test-circle', submitted.reportId, 'remove_content', 'Confirmed targeted harassment under Circle rules');
    assert.deepEqual(resolved, { reportId: submitted.reportId, status: 'resolved' });
    assert.equal((await circle.collection('posts').doc('post-remove').get()).exists, false);
    const report = await circle.collection('reports').doc(submitted.reportId).get();
    assert.equal(report.get('status'), 'resolved');
    assert.equal(report.get('resolution'), 'remove_content');
    const audit = await circle.collection('auditEvents').where('reportId', '==', submitted.reportId).get();
    assert.equal(audit.size, 1);
  });

  it('allows managers to dismiss a report without deleting its target', async () => {
    const submitted = await submitCircleReport(db, 'bob', 'report-test-circle', 'message', 'message-dismiss', 'This message needs moderator review.');
    const dismissed = await resolveCircleReport(db, 'alice', 'report-test-circle', submitted.reportId, 'dismiss', 'Reviewed and found compliant with Circle guidelines');
    assert.deepEqual(dismissed, { reportId: submitted.reportId, status: 'dismissed' });
    assert.equal((await circle.collection('messages').doc('message-dismiss').get()).exists, true);
    assert.equal((await circle.collection('reports').doc(submitted.reportId).get()).get('status'), 'dismissed');
  });

  it('bans a reported member through the existing role-safe moderation path', async () => {
    const submitted = await submitCircleReport(db, 'bob', 'report-test-circle', 'member', 'carol', 'This member repeatedly targeted me in Circle discussions.');
    const resolved = await resolveCircleReport(db, 'alice', 'report-test-circle', submitted.reportId, 'ban_member', 'Reviewed evidence and confirmed repeated harassment');
    assert.deepEqual(resolved, { reportId: submitted.reportId, status: 'resolved' });
    assert.equal((await circle.collection('members').doc('carol').get()).exists, false);
    assert.equal((await circle.collection('bans').doc('carol').get()).exists, true);
    assert.equal((await circle.collection('reports').doc(submitted.reportId).get()).get('status'), 'resolved');
  });
});
