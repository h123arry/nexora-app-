import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadMetadata,
} from 'firebase/storage';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, storage } from './config';
import { mediaStoragePath } from './storagePaths';

export interface MediaUploadOptions {
  file: File | Blob;
  userId: string;
  mediaId?: string;
  chatId?: string;
  fileName?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
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

export function uploadMediaFile(options: MediaUploadOptions): Promise<MediaUploadResult> {
  const { file, userId, onProgress, signal } = options;
  if (!userId) return Promise.reject(new Error('A signed-in user is required to upload media.'));
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
      const user = auth.currentUser;
      if (!user || user.uid !== userId) throw new Error('Sign in to the same account before sending this voice note.');
      const token = await user.getIdToken();
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

  const mediaId = safeFileName(options.mediaId || crypto.randomUUID());
  const chatId = options.chatId ? safeFileName(options.chatId) : undefined;
  const name = safeFileName(options.fileName || (file instanceof File ? file.name : 'upload'));
  // Storage rules bind customMetadata.mediaId to this exact path segment.
  const storagePath = mediaStoragePath(userId, mediaId, chatId);
  const contentType = normalizedContentType || 'application/octet-stream';
  const kind = contentType.startsWith('image/') ? 'image' : contentType.startsWith('video/') ? 'video' : 'audio';
  if (!db) return Promise.reject(new Error('Media storage is not configured for this environment.'));
  const uploadMetadata: UploadMetadata = {
    contentType,
    customMetadata: {
      ...options.metadata,
      ownerId: userId,
      mediaId,
      fileName: name,
      ...(chatId ? { chatId } : {}),
    },
  };
  return new Promise((resolve, reject) => {
    void setDoc(doc(db, 'mediaAssets', mediaId), {
      id: mediaId,
      ownerId: userId,
      storagePath,
      kind,
      contentType,
      size: file.size,
      status: 'pending_upload',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).then(() => {
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
          reject(error);
        },
        async () => {
          signal?.removeEventListener('abort', abortUpload);
          try {
            resolve({
              mediaId,
              downloadUrl: await getDownloadURL(task.snapshot.ref),
              storagePath,
              contentType,
              size: file.size,
            });
          } catch (error) {
            reject(error);
          }
        },
      );
    }).catch(reject);
  });
}

export async function deleteMediaFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
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
