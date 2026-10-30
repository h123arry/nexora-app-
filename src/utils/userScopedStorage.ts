export interface StringStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function userScopedStorageKey(baseKey: string, userId: string): string {
  return `${baseKey}_${userId}`;
}

export function isUserCacheReady(
  authenticatedUserId: string | null | undefined,
  currentUserId: string,
  loadedCacheUserId: string
): boolean {
  return Boolean(authenticatedUserId
    && currentUserId === authenticatedUserId
    && loadedCacheUserId === authenticatedUserId);
}

/** Read only the active user's key; legacy unscoped values are never consulted. */
export function readUserScopedJson<T>(
  storage: Pick<StringStorage, 'getItem'>,
  baseKey: string,
  userId: string,
  fallback: T
): T {
  if (!userId) return fallback;
  try {
    const serialized = storage.getItem(userScopedStorageKey(baseKey, userId));
    return serialized === null ? fallback : JSON.parse(serialized) as T;
  } catch {
    return fallback;
  }
}

/** Persist data only when an explicit account owner is available. */
export function writeUserScopedJson(
  storage: Pick<StringStorage, 'setItem'>,
  baseKey: string,
  userId: string,
  value: unknown
): boolean {
  if (!userId) return false;
  try {
    storage.setItem(userScopedStorageKey(baseKey, userId), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
