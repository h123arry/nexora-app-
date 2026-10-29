import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const adminApp = getApps().find((app) => app.name === '[DEFAULT]') || initializeApp();
const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || undefined;
const db = getFirestore(adminApp, databaseId);
const bucket = getStorage(adminApp).bucket(bucketName);
const PAGE_SIZE = 100;

function isOwnedStoryMediaPath(storagePath: unknown, userId: unknown): storagePath is string {
  return typeof storagePath === 'string'
    && typeof userId === 'string'
    && /^[A-Za-z0-9_-]{1,128}$/.test(userId)
    && new RegExp(`^users/${userId}/media/[A-Za-z0-9._-]{1,200}$`).test(storagePath);
}

export const cleanupExpiredStories = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'UTC', maxInstances: 1, retryCount: 3 },
  async () => {
    const snapshot = await db.collection('stories')
      .where('expiresAt', '<=', Timestamp.now())
      .orderBy('expiresAt', 'asc')
      .limit(PAGE_SIZE)
      .get();

    let deleted = 0;
    let failed = 0;
    for (const story of snapshot.docs) {
      const data = story.data();
      try {
        if (isOwnedStoryMediaPath(data.storagePath, data.userId)) {
          await bucket.file(data.storagePath).delete({ ignoreNotFound: true });
        }
        if (typeof data.mediaId === 'string' && /^[A-Za-z0-9._-]{1,200}$/.test(data.mediaId)) {
          await db.collection('mediaAssets').doc(data.mediaId).delete().catch(() => undefined);
        }
        await db.recursiveDelete(story.ref);
        deleted += 1;
      } catch (error) {
        failed += 1;
        console.error(JSON.stringify({ event: 'expired_story_cleanup_failed', storyId: story.id, error: error instanceof Error ? error.message : 'unknown' }));
      }
    }

    console.info(JSON.stringify({ event: 'expired_story_cleanup', scanned: snapshot.size, deleted, failed, hasMore: snapshot.size === PAGE_SIZE }));
  },
);
