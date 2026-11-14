import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../lib/firebase';

export type OriginRemixPolicy = 'closed' | 'allow_with_attribution';

function waitForOriginReady(assetId: string, userId: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    let timeout: number | null = null;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timeout !== null) window.clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      unsubscribe();
      error ? reject(error) : resolve();
    };
    const abort = () => finish(new DOMException('Origin permission update cancelled.', 'AbortError'));
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });
    timeout = window.setTimeout(() => finish(new Error('Media verification is taking longer than expected. Keep remixing closed and retry after the upload finishes processing.')), 90_000);
    unsubscribe = onSnapshot(doc(db, 'mediaAssets', assetId), snapshot => {
      if (!snapshot.exists()) return finish(new Error('The uploaded media record is unavailable.'));
      const asset = snapshot.data();
      if (asset.ownerId !== userId) return finish(new Error('This media belongs to a different account.'));
      if (asset.status === 'rejected' || asset.status === 'failed') return finish(new Error('This media did not pass upload verification.'));
      if (asset.status === 'uploaded' || asset.status === 'ready') finish();
    }, error => finish(new Error(error.message || 'Could not verify the uploaded media.')));
  });
}

export async function setOriginRemixPolicy(
  assetId: string,
  userId: string,
  policy: OriginRemixPolicy,
  signal?: AbortSignal,
): Promise<void> {
  if (!assetId || !userId) throw new Error('A verified media asset and signed-in creator are required.');
  await waitForOriginReady(assetId, userId, signal);
  if (signal?.aborted) throw new DOMException('Origin permission update cancelled.', 'AbortError');
  const update = httpsCallable<{ assetId: string; policy: OriginRemixPolicy }, { updated: boolean; policy: OriginRemixPolicy }>(functions, 'setMyOriginRemixPolicy');
  const result = await update({ assetId, policy });
  if (result.data.policy !== policy) throw new Error('NEXORA could not confirm the selected remix permission.');
}
