import type { Firestore } from 'firebase-admin/firestore';
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
  return deleted;
}
