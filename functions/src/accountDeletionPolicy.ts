import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { deleteOwnedOriginRecord } from './originCleanup.js';

const PAGE_SIZE = 200;

/** User-owned top-level records that are safe to erase with the account. */
export const ACCOUNT_OWNED_COLLECTIONS: ReadonlyArray<{ name: string; field: string }> = [
  { name: 'posts', field: 'userId' },
  { name: 'drafts', field: 'userId' },
  { name: 'activities', field: 'userId' },
  { name: 'creatorAnalytics', field: 'userId' },
  { name: 'analyticsEvents', field: 'actorId' },
  { name: 'notifications', field: 'userId' },
  { name: 'moderationReports', field: 'reporterId' },
  { name: 'moderationAppeals', field: 'userId' },
  { name: 'privacySettings', field: 'userId' },
  { name: 'presence', field: 'userId' },
  { name: 'pages', field: 'ownerId' },
  { name: 'communities', field: 'ownerId' },
  { name: 'mediaAssets', field: 'ownerId' },
  { name: 'mediaOrigins', field: 'ownerUid' },
  { name: 'academyProgress', field: 'userId' },
  { name: 'academyLessonNotes', field: 'userId' },
  { name: 'identityVerificationApplications', field: 'userId' },
  { name: 'identityVerificationPrivateSignals', field: 'userId' },
  { name: 'verifiedIdentities', field: 'userId' },
  { name: 'identityImpersonationCases', field: 'userId' },
];

export function accountStoragePrefixes(userId: string): string[] {
  if (!userId || userId.includes('/') || userId.includes('\\')) {
    throw new Error('A valid account ID is required for storage cleanup.');
  }
  return [
    `users/${userId}/`,
    `media/${userId}/`,
    // The media worker stores processed renditions outside the original upload prefix.
    `processed/${userId}/`,
  ];
}

export async function deleteUserOwnedDocuments(db: Firestore, userId: string): Promise<number> {
  if (!userId) throw new Error('A valid account ID is required for data cleanup.');
  let deleted = 0;
  for (const target of ACCOUNT_OWNED_COLLECTIONS) {
    while (true) {
      const snapshot = await db.collection(target.name).where(target.field, '==', userId).limit(PAGE_SIZE).get();
      if (snapshot.empty) break;
      if (target.name === 'mediaOrigins') {
        for (const document of snapshot.docs) {
          deleted += await deleteOwnedOriginRecord(db, document.id, userId);
        }
        if (snapshot.size < PAGE_SIZE) break;
        continue;
      }
      const batch = db.batch();
      snapshot.docs.forEach(document => batch.delete(document.ref));
      await batch.commit();
      deleted += snapshot.size;
      if (snapshot.size < PAGE_SIZE) break;
    }
  }

  // Identity reporter signals are nested below a target account and also retain
  // a reporter UID. Remove both directions when either account is deleted.
  const targetSignals = db.collection('identityImpersonationSignals').doc(userId);
  const targetReporterSignals = await targetSignals.collection('reporters').get();
  if (!targetReporterSignals.empty) {
    const batch = db.batch();
    targetReporterSignals.docs.forEach(document => batch.delete(document.ref));
    await batch.commit();
    deleted += targetReporterSignals.size;
  }
  const targetSignalDocument = await targetSignals.get();
  if (targetSignalDocument.exists) {
    await targetSignals.delete();
    deleted += 1;
  }
  while (true) {
    const reporterSignals = await db.collectionGroup('reporters')
      .where('reporterId', '==', userId)
      .limit(PAGE_SIZE)
      .get();
    if (reporterSignals.empty) break;
    const batch = db.batch();
    reporterSignals.docs.forEach(document => batch.delete(document.ref));
    await batch.commit();
    deleted += reporterSignals.size;
    if (reporterSignals.size < PAGE_SIZE) break;
  }

  // Retain the security audit trail, but remove direct account identifiers and
  // free-text review notes so deletion does not leave identity-review PII behind.
  const auditRefs = new Map<string, FirebaseFirestore.DocumentReference>();
  for (const field of ['userId', 'reviewerId', 'actorId']) {
    const matches = await db.collection('identityVerificationAuditEvents')
      .where(field, '==', userId)
      .get();
    matches.docs.forEach(document => auditRefs.set(document.id, document.ref));
  }
  for (let offset = 0; offset < auditRefs.size; offset += PAGE_SIZE) {
    const batch = db.batch();
    [...auditRefs.values()].slice(offset, offset + PAGE_SIZE).forEach(reference => {
      batch.update(reference, {
        userId: FieldValue.delete(),
        reviewerId: FieldValue.delete(),
        actorId: FieldValue.delete(),
        reviewNote: FieldValue.delete(),
        accountDeleted: true,
      });
    });
    await batch.commit();
  }
  return deleted;
}
