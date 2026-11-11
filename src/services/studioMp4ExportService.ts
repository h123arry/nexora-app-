import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../lib/firebase';
import { uploadMediaFile } from './firebase/storageService';

type Mp4UrlResponse = {
  ready: boolean;
  downloadUrl?: string;
  renditionHeight?: number;
  expiresAt?: number;
};

export type StudioMp4Download = { downloadUrl: string; renditionHeight: number; expiresAt: number };

function waitForStudioMp4Asset(
  mediaAssetId: string,
  userId: string,
  signal?: AbortSignal,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe: () => void = () => {};
    let timeout: number | null = null;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timeout !== null) window.clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      unsubscribe();
      if (error) reject(error); else resolve();
    };
    const abort = () => finish(new DOMException('MP4 export cancelled.', 'AbortError'));
    timeout = window.setTimeout(() => {
      finish(new Error('MP4 preparation is taking longer than expected. Your original export and Studio draft are safe; try again later.'));
    }, 10 * 60 * 1000);
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    unsubscribe = onSnapshot(doc(db, 'mediaAssets', mediaAssetId), snapshot => {
      if (!snapshot.exists()) {
        finish(new Error('The temporary MP4 export record is no longer available.'));
        return;
      }
      const asset = snapshot.data();
      if (asset.ownerId !== userId) {
        finish(new Error('The MP4 export belongs to a different account.'));
        return;
      }
      if (asset.status === 'failed' || asset.status === 'rejected') {
        finish(new Error('The media renderer could not prepare this MP4. Your original Studio export remains available.'));
        return;
      }
      if (asset.status === 'processing') onProgress?.(60);
      if (asset.status === 'ready' && asset.sourcePurpose === 'studio-export') {
        onProgress?.(90);
        finish();
      }
    }, error => finish(new Error(error.message || 'Could not monitor MP4 preparation.')));
  });
}

export async function createStudioMp4Export(
  source: Blob,
  userId: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<StudioMp4Download> {
  if (!source.size || !source.type.toLowerCase().startsWith('video/')) {
    throw new Error('Export a valid Studio video before preparing its MP4 version.');
  }
  const file = new File([source], `nexora-studio-source-${Date.now()}.webm`, {
    type: source.type.split(';')[0] || 'video/webm',
  });
  const uploaded = await uploadMediaFile({
    file,
    userId,
    metadata: { purpose: 'studio-export' },
    signal,
    onProgress: progress => onProgress?.(Math.round(progress * 0.4)),
  });
  onProgress?.(45);
  await waitForStudioMp4Asset(uploaded.mediaId, userId, signal, onProgress);
  const getUrl = httpsCallable<{ mediaAssetId: string }, Mp4UrlResponse>(functions, 'getStudioExportMp4Url');
  const result = (await getUrl({ mediaAssetId: uploaded.mediaId })).data;
  if (!result.ready || !result.downloadUrl) {
    throw new Error('The MP4 rendition is not available yet. Your original Studio export remains available; try again shortly.');
  }
  onProgress?.(100);
  return {
    downloadUrl: result.downloadUrl,
    renditionHeight: result.renditionHeight || 0,
    expiresAt: result.expiresAt || Date.now() + 15 * 60 * 1000,
  };
}
