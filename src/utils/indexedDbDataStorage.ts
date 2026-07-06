/**
 * Nexora Persistent IndexedDB Data Storage Utility
 * Designed to persist application state (feeds, messages, profiles) in-browser
 * for offline continuity and speed.
 */

const DB_NAME = 'NexoraDataDB';
const DB_VERSION = 1;
const DATA_STORE = 'appData';

export function initDataDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open Nexora IndexedDB data storage');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE);
      }
    };
  });
}

/**
 * Saves a JSON-serializable object to the IndexedDB data store
 */
export async function saveAppData(key: string, data: any): Promise<void> {
  const db = await initDataDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DATA_STORE], 'readwrite');
    const store = transaction.objectStore(DATA_STORE);
    const request = store.put(data, key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error(`[Storage] Failed to store data in IndexedDB: ${key}`, request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieves data from IndexedDB by key
 */
export async function getAppData(key: string): Promise<any | null> {
  const db = await initDataDB();
  return new Promise((resolve) => {
    const transaction = db.transaction([DATA_STORE], 'readonly');
    const store = transaction.objectStore(DATA_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      console.error(`[Storage] Retrieve error for key: ${key}`);
      resolve(null);
    };
  });
}
