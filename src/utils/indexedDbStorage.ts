/**
 * Nexora Persistent IndexedDB Media Storage Utility
 * Designed to persist large video and audio binaries in-browser across page refreshes,
 * login/logout sessions, and prevent localStorage limit crashes.
 */

const DB_NAME = 'NexoraMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media';

export function initMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open Nexora IndexedDB media storage');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Saves a binary blob to the IndexedDB media store
 */
export async function saveMediaBlob(id: string, blob: Blob): Promise<string> {
  console.log(`[Storage] Saving binary media to permanent IndexedDB: ${id} (${blob.type}, ${blob.size} bytes)`);
  const db = await initMediaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, id);

    request.onsuccess = () => {
      console.log(`[Storage] Media successfully committed in IndexedDB: ${id}`);
      resolve(`db-media://${id}`);
    };

    request.onerror = () => {
      console.error(`[Storage] Failed to store media blob in IndexedDB: ${id}`, request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieves a media blob from IndexedDB by ID
 */
export async function getMediaBlob(id: string): Promise<Blob | null> {
  const db = await initMediaDB();
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      console.error(`[Storage] Retrieve error for ID: ${id}`);
      resolve(null);
    };
  });
}

// In-memory cache of resolved db-media object URLs to avoid redundant blob url creation
const objectUrlCache = new Map<string, string>();

/**
 * Resolves any custom `db-media://` URL to a usable browser object URL.
 * Pass-through if it's already a regular URL or base64.
 */
export async function resolveMediaUrl(url: string): Promise<string> {
  if (!url || !url.startsWith('db-media://')) {
    return url;
  }

  if (objectUrlCache.has(url)) {
    return objectUrlCache.get(url)!;
  }

  const id = url.replace('db-media://', '');
  const blob = await getMediaBlob(id);
  if (!blob) {
    console.warn(`[Storage] Blob not found in IndexedDB for URL: ${url}`);
    return '';
  }

  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(url, objectUrl);
  return objectUrl;
}

/**
 * Generates and stores a video thumbnail at 0.5s from a video File or Blob
 */
export function generateVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoBlob);
    video.src = url;

    video.onloadeddata = () => {
      // Seek to 0.5s for a good thumbnail frame
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          URL.revokeObjectURL(url);
          console.log('[Storage] Automatically extracted video thumbnail frame.');
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(url);
          resolve('');
        }
      } catch (err) {
        console.error('[Storage] Error drawing video thumbnail content', err);
        URL.revokeObjectURL(url);
        resolve('');
      }
    };

    video.onerror = () => {
      console.error('[Storage] Error loading video for thumbnail generation');
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
}
