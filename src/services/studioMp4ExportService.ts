import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { uploadMediaFile } from './firebase/storageService';

type Mp4UrlResponse = {
  ready: boolean;
  downloadUrl?: string;
  renditionHeight?: number;
  expiresAt?: number;
};

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('MP4 export cancelled.', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('MP4 export cancelled.', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function createStudioMp4Export(
  source: Blob,
  userId: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
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
  const getUrl = httpsCallable<{ mediaAssetId: string }, Mp4UrlResponse>(functions, 'getStudioExportMp4Url');
  const cleanup = httpsCallable<{ mediaAssetId: string }, { cleaned: boolean }>(functions, 'cleanupStudioExportAsset');
  const maxAttempts = 300;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new DOMException('MP4 export cancelled.', 'AbortError');
    const result = (await getUrl({ mediaAssetId: uploaded.mediaId })).data;
    if (result.ready && result.downloadUrl) {
      onProgress?.(92);
      const response = await fetch(result.downloadUrl, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('The prepared MP4 could not be downloaded. Try preparing it again.');
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const mp4 = await response.blob();
      if (!mp4.size || (!contentType.startsWith('video/mp4') && !mp4.type.toLowerCase().startsWith('video/mp4'))) {
        throw new Error('The server returned an invalid MP4 export. Your original Studio video remains available.');
      }
      onProgress?.(98);
      await cleanup({ mediaAssetId: uploaded.mediaId }).catch(() => undefined);
      onProgress?.(100);
      return mp4;
    }
    onProgress?.(40 + Math.round((attempt / maxAttempts) * 48));
    await wait(2_000, signal);
  }
  throw new Error('MP4 preparation is taking longer than expected. Your original export and Studio draft are safe; try again later.');
}
