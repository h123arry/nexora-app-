import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { listOwnModerationReports } from '../src/moderationReportTracking.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'moderation-report-tracking-tests');
const db = getFirestore(app);
const own = db.collection('moderationReports').doc('tracking-own');
const other = db.collection('moderationReports').doc('tracking-other');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Report tracking tests require the Firestore Emulator.');
  await Promise.all([own.delete(), other.delete()]);
  await own.set({
    reporterId: 'tracking-user', targetType: 'post', category: 'harassment', status: 'under_review',
    createdAt: Timestamp.fromDate(new Date('2026-11-01T10:00:00Z')),
    reviewerId: 'private-reviewer', decisionNote: 'Private internal note', evidenceUrl: 'private-evidence',
  });
  await other.set({
    reporterId: 'another-user', targetType: 'user', category: 'spam', status: 'resolved',
    createdAt: Timestamp.fromDate(new Date('2026-11-02T10:00:00Z')),
  });
});

after(async () => {
  await Promise.all([own.delete(), other.delete()]);
  await deleteApp(app);
});

describe('private moderation report tracking', () => {
  it('returns only the signed-in user report status projection', async () => {
    const reports = await listOwnModerationReports(db, 'tracking-user');
    assert.equal(reports.length, 1);
    assert.equal(reports[0].id, 'tracking-own');
    assert.equal(reports[0].status, 'under_review');
    assert.equal(reports[0].targetType, 'post');
    assert.equal(reports[0].category, 'harassment');
    assert.equal('reviewerId' in reports[0], false);
    assert.equal('decisionNote' in reports[0], false);
    assert.equal('evidenceUrl' in reports[0], false);
  });

  it('rejects invalid account identifiers', async () => {
    await assert.rejects(listOwnModerationReports(db, 'bad/path'), /valid account/);
  });
});
