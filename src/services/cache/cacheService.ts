import { User, Post, Circle as Community, Page } from '../../types';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class BoundedEntityCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  set(id: string, value: T): void {
    this.entries.delete(id);
    this.entries.set(id, { value, expiresAt: Date.now() + this.ttlMs });
    this.evictIfNeeded();
  }

  get(id: string): T | null {
    const entry = this.entries.get(id);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(id);
      return null;
    }

    // Refresh recency and expiry only when the item is actually used.
    this.entries.delete(id);
    this.entries.set(id, { ...entry, expiresAt: Date.now() + this.ttlMs });
    return entry.value;
  }

  clear(): void {
    this.entries.clear();
  }

  private evictIfNeeded(): void {
    while (this.entries.size > this.maxEntries) {
      const oldestId = this.entries.keys().next().value;
      if (oldestId === undefined) return;
      this.entries.delete(oldestId);
    }
  }
}

// These caches are an optimization only; Firestore remains authoritative. Limits
// prevent long-lived sessions from retaining every profile/media entity ever seen.
const CACHE_TTL_MS = 5 * 60 * 1000;

class MemoryCacheManager {
  private readonly userCache = new BoundedEntityCache<User>(300, CACHE_TTL_MS);
  private readonly postCache = new BoundedEntityCache<Post>(300, CACHE_TTL_MS);
  private readonly communityCache = new BoundedEntityCache<Community>(150, CACHE_TTL_MS);
  private readonly pageCache = new BoundedEntityCache<Page>(100, CACHE_TTL_MS);

  public setUser(id: string, user: User): void {
    this.userCache.set(id, user);
  }
  public getUser(id: string): User | null {
    return this.userCache.get(id);
  }
  public setPost(id: string, post: Post): void {
    this.postCache.set(id, post);
  }
  public getPost(id: string): Post | null {
    return this.postCache.get(id);
  }
  public setCommunity(id: string, community: Community): void {
    this.communityCache.set(id, community);
  }
  public getCommunity(id: string): Community | null {
    return this.communityCache.get(id);
  }
  public setPage(id: string, page: Page): void {
    this.pageCache.set(id, page);
  }
  public getPage(id: string): Page | null {
    return this.pageCache.get(id);
  }
  public clearAll(): void {
    this.userCache.clear();
    this.postCache.clear();
    this.communityCache.clear();
    this.pageCache.clear();
  }
}

export const cacheManager = new MemoryCacheManager();
