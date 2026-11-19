import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadMetadata,
} from 'firebase/storage';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, storage } from './config';
import { mediaStoragePath } from './storagePaths';
import { normalizeMediaId } from './mediaId';

export interface MediaUploadOptions {
  file: File | Blob;
  userId: string;
  mediaId?: string;
  chatId?: string;
  fileName?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  resolveDownloadUrl?: boolean;
}

export interface MediaUploadResult {
  mediaId: string;
  downloadUrl: string;
  storagePath: string;
  contentType: string;
  size: number;
}

const uploadPolicies = {
  image: { maxBytes: 12 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'] },
  video: { maxBytes: 250 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'] },
  audio: { maxBytes: 50 * 1024 * 1024, types: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac'] },
} as const;

function safeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
}


class R2NotConfiguredError extends Error {
  code = 'r2_not_configured';
}

async function getAuthenticatedUploadUser(userId: string) {
  // Firebase auth can still be hydrating immediately after app startup or a refresh.
  // Wait for that state before deciding the user is signed out; keep the UID ownership check.
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.uid !== userId) {
    throw new Error('Sign in to the same account before uploading media.');
  }
  return user;
}

async function uploadMediaFileViaR2(options: MediaUploadOptions): Promise<MediaUploadResult> {
  const { file, userId, onProgress, signal } = options;
  const user = await getAuthenticatedUploadUser(userId);
  if (!file || file.size <= 0) throw new Error('The selected file is empty.');
  if (signal?.aborted) throw new DOMException('Upload cancelled.', 'AbortError');
  const contentType = file.type.split(';')[0].trim().toLowerCase();
  const mediaId = normalizeMediaId(options.mediaId || crypto.randomUUID());
  const fileName = safeFileName(options.fileName || (file instanceof File ? file.name : 'upload'));
  // Force-refresh after auth hydration so the API never receives a stale cached ID token.\n  const token = await user.getIdToken(true);
  const intentResponse = await fetch('/api/media/upload-intent', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaId,
      contentType,
      size: file.size,
      fileName,
      metadata: options.metadata || {},
    }),
    signal,
  });
  const intent = await intentResponse.json().catch(() => ({}));
  if (!intentResponse.ok) {
    if (intentResponse.status === 503 && intent.code === 'r2_not_configured') throw new R2NotConfiguredError('R2 storage is not configured.');
    throw new Error(typeof intent.error === 'string' ? intent.error : 'NEXORA could not prepare this upload.');
  }
  if (typeof intent.uploadUrl !== 'string' || typeof intent.storagePath !== 'string' || intent.mediaId !== mediaId) {
    throw new Error('NEXORA returned an invalid upload authorization.');
  }

  const abortR2Intent = async () => {
    try {
      const cleanupToken = await user.getIdToken();
      await fetch(`/api/media/${encodeURIComponent(mediaId)}/abort`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cleanupToken}` },
      });
    } catch {
      // The server's pending-upload cleanup is best-effort; no credential is exposed.
    }
  };

  try {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve();
    };
    const abort = () => xhr.abort();
    xhr.open('PUT', intent.uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('If-None-Match', '*');
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        finish();
        return;
      }
      // R2 returns an XML error document for S3-compatible failures. Expose
      // only a bounded error code, never the signed URL or response payload.
      const errorCode = xhr.responseText.match(/<Code>([^<]{1,80})<[/]Code>/i)?.[1]
        || xhr.responseText.match(/"code"\s*:\s*"([^"]{1,80})"/i)?.[1];
      const reason = errorCode
        ? `R2 upload failed (HTTP ${xhr.status}, ${errorCode}).`
        : `R2 upload failed (HTTP ${xhr.status}).`;
      finish(new Error(reason));
    };
    xhr.onerror = () => finish(new Error('NEXORA could not connect to media storage. This may be a bucket CORS or network configuration issue. Please retry.'));
    xhr.onabort = () => finish(new DOMException('Upload cancelled.', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return abort();
    xhr.send(file);
  });

  } catch (error) {
    await abortR2Intent();
    throw error;
  }

  try {
  const completeToken = await user.getIdToken();
  const completeResponse = await fetch(`/api/media/${encodeURIComponent(mediaId)}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${completeToken}`, 'Content-Type': 'application/json' },
    signal,
  });
  const completed = await completeResponse.json().catch(() => ({}));
  if (!completeResponse.ok || typeof completed.downloadUrl !== 'string') {
    throw new Error(typeof completed.error === 'string' ? completed.error : 'NEXORA could not verify the uploaded media.');
  }
  return {
    mediaId,
    downloadUrl: completed.downloadUrl,
    storagePath: completed.storagePath,
    contentType: completed.contentType,
    size: completed.size,
  };
  } catch (error) {
    await abortR2Intent();
    throw error;
  }
}

export function uploadMediaFile(options: MediaUploadOptions): Promise<MediaUploadResult> {
  if (options.chatId || options.metadata?.purpose === 'worldweave') return uploadMediaFileWithFirebase(options);
  return uploadMediaFileViaR2(options).catch(error => {
    if (error instanceof R2NotConfiguredError && import.meta.env.DEV) return uploadMediaFileWithFirebase(options);
    throw error;
  });
}

async function uploadMediaFileWithFirebase(options: MediaUploadOptions): Promise<MediaUploadResult> {
  const { file, userId, onProgress, signal } = options;
  if (!userId) throw new Error('A signed-in user is required to upload media.');
  const authenticatedUser = await getAuthenticatedUploadUser(userId);
  if (!file || file.size <= 0) return Promise.reject(new Error('The selected file is empty.'));
  const normalizedContentType = file.type.split(';')[0].trim().toLowerCase();
  const policy = options.chatId
    ? { ...uploadPolicies.audio, maxBytes: 5 * 1024 * 1024 }
    : Object.values(uploadPolicies).find(candidate => (candidate.types as readonly string[]).includes(normalizedContentType));
  if (!policy || file.size > policy.maxBytes) {
    return Promise.reject(new Error('The file type is unsupported or exceeds the upload size limit.'));
  }

  if (options.chatId) {
    return (async () => {
      const token = await authenticatedUser.getIdToken();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read this voice recording.'));
        reader.readAsDataURL(file);
      });
      const response = await fetch(`/api/private-chat-media/chat/${encodeURIComponent(options.chatId!)}/audio`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: normalizedContentType }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The voice message could not be uploaded.');
      const storagePath = result.storagePath as string;
      return { mediaId: storagePath.split('/').pop() || '', downloadUrl: '', storagePath, contentType: result.contentType as string, size: result.size as number };
    })();
  }

  const mediaId = normalizeMediaId(options.mediaId || crypto.randomUUID());
  const chatId = options.chatId ? safeFileName(options.chatId) : undefined;
  const name = safeFileName(options.fileName || (file instanceof File ? file.name : 'upload'));
  // Storage rules bind customMetadata.mediaId to this exact path segment.
  const storagePath = mediaStoragePath(userId, mediaId, chatId);
  const contentType = normalizedContentType || 'application/octet-stream';
  const kind = contentType.startsWith('image/') ? 'image' : contentType.startsWith('video/') ? 'video' : 'audio';
  if (!db) return Promise.reject(new Error('Media storage is not configured for this environment.'));
  const uploadMetadata: UploadMetadata = {
    contentType,
    ...(options.metadata?.purpose === 'worldweave' ? { cacheControl: 'private, no-store, max-age=0' } : {}),
    customMetadata: {
      ...options.metadata,
      ownerId: userId,
      mediaId,
      fileName: name,
      ...(chatId ? { chatId } : {}),
    },
  };
  return new Promise((resolve, reject) => {
    const assetRef = doc(db, 'mediaAssets', mediaId);
    const cleanupFailedUpload = async (reason: string) => {
      await Promise.allSettled([
        deleteObject(ref(storage, storagePath)),
        updateDoc(assetRef, { status: 'failed', failureCategory: signal?.aborted ? 'upload_cancelled' : 'upload_failed', failureMessage: reason.slice(0, 240), updatedAt: serverTimestamp() }),
      ]);
    };
    let intentTimedOut = false;
    const intentTimeout = window.setTimeout(() => {
      intentTimedOut = true;
      reject(new Error('NEXORA could not prepare this upload. Check your connection and try again. Your file has not started uploading.'));
    }, 30000);
    void setDoc(assetRef, {
      id: mediaId,
      ownerId: userId,
      storagePath,
      kind,
      contentType,
      size: file.size,
      status: 'pending_upload',
      ...(options.metadata?.purpose === 'studio-export' ? { purpose: 'studio-export' } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).then(() => {
      clearTimeout(intentTimeout);
      // A late Firestore response must not start a surprise upload after the
      // user has already received a preparation timeout.
      if (intentTimedOut) return;
      const task = uploadBytesResumable(ref(storage, storagePath), file, uploadMetadata);
      const abortUpload = () => task.cancel();
      if (signal?.aborted) task.cancel();
      signal?.addEventListener('abort', abortUpload, { once: true });
      task.on('state_changed',
        snapshot => {
          const progress = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          onProgress?.(progress);
        },
        error => {
          signal?.removeEventListener('abort', abortUpload);
          void cleanupFailedUpload(error?.message || 'Upload interrupted').finally(() => reject(error));
        },
        async () => {
          signal?.removeEventListener('abort', abortUpload);
          try {
            resolve({
              mediaId,
              downloadUrl: options.resolveDownloadUrl === false ? '' : await getDownloadURL(task.snapshot.ref),
              storagePath,
              contentType,
              size: file.size,
            });
          } catch (error) {
            await cleanupFailedUpload(error instanceof Error ? error.message : 'Upload finalization failed');
            reject(error);
          }
        },
      );
    }).catch(error => {
      clearTimeout(intentTimeout);
      if (!intentTimedOut) reject(error);
    });
  });
}

export async function deleteMediaFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const match = storagePath.match(/^users\/([A-Za-z0-9_-]{1,128})\/media\/([A-Za-z0-9_-]{1,128})$/);
  if (match && auth.currentUser?.uid === match[1]) {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`/api/media/${encodeURIComponent(match[2])}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) return;
    const result = await response.json().catch(() => ({}));
    const isLegacyFirebaseAsset = response.status === 409 && result.code === 'not_r2_asset';
    const isR2Unavailable = response.status === 503 && result.code === 'r2_not_configured';
    if (!isLegacyFirebaseAsset && !isR2Unavailable) {
      throw new Error(typeof result.error === 'string' ? result.error : 'The media object could not be deleted.');
    }
  }
  await deleteObject(ref(storage, storagePath));
}

export async function resolvePrivateChatAudio(storagePath: string): Promise<string> {
  const match = storagePath.match(/^chats\/([A-Za-z0-9_-]{1,150})\/audio\/([A-Za-z0-9_-]{1,128})\/([A-Za-z0-9_-]{1,128})$/);
  const user = auth.currentUser;
  if (!match || !user) throw new Error('Sign in to play this private voice note.');
  const [, chatId, uploaderId, mediaId] = match;
  const token = await user.getIdToken();
  const response = await fetch(`/api/private-chat-media/chat/${encodeURIComponent(chatId)}/audio/${encodeURIComponent(uploaderId)}/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('This voice note is unavailable or you are no longer a conversation participant.');
  return URL.createObjectURL(await response.blob());
}
