import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadMetadata,
} from 'firebase/storage';
import { storage } from './config';
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
  downloadUrl: string;
  storagePath: string;
  contentType: string;
  size: number;
}

function safeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
}

export function uploadMediaFile(options: MediaUploadOptions): Promise<MediaUploadResult> {
  const { file, userId, onProgress, signal } = options;
  if (!userId) return Promise.reject(new Error('A signed-in user is required to upload media.'));
  if (!file || file.size <= 0) return Promise.reject(new Error('The selected file is empty.'));

  const mediaId = safeFileName(options.mediaId || crypto.randomUUID());
  const chatId = options.chatId ? safeFileName(options.chatId) : undefined;
  const name = safeFileName(options.fileName || (file instanceof File ? file.name : 'upload'));
  // Storage rules bind customMetadata.mediaId to this exact path segment.
  const storagePath = mediaStoragePath(userId, mediaId, chatId);
  const contentType = file.type || 'application/octet-stream';
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
  const task = uploadBytesResumable(ref(storage, storagePath), file, uploadMetadata);
  const abortUpload = () => task.cancel();
  if (signal?.aborted) task.cancel();
  signal?.addEventListener('abort', abortUpload, { once: true });

  return new Promise((resolve, reject) => {
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
  });
}

export async function deleteMediaFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  await deleteObject(ref(storage, storagePath));
}
