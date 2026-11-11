import type { Firestore } from 'firebase-admin/firestore';

const PAGE_SIZE = 200;

/** Delete a private origin timeline before its parent record to avoid orphaned subcollections. */
export async function deleteOwnedOriginRecord(db: Firestore, assetId: string, ownerUid: string): Promise<number> {
  if (!assetId || !ownerUid) return 0;
  const originRef = db.collection('mediaOrigins').doc(assetId);
  const origin = await originRef.get();
  if (!origin.exists || origin.get('ownerUid') !== ownerUid) return 0;

  let deleted = 0;
  while (true) {
    const page = await originRef.collection('events').limit(PAGE_SIZE).get();
    if (page.empty) break;
    const batch = db.batch();
    page.docs.forEach(event => batch.delete(event.ref));
    await batch.commit();
    deleted += page.size;
    if (page.size < PAGE_SIZE) break;
  }
  await originRef.delete();
  return deleted + 1;
}
