import { User, Post, Circle as Community, Page } from '../../types';

class MemoryCacheManager {
  private userCache = new Map<string, User>();
  private postCache = new Map<string, Post>();
  private communityCache = new Map<string, Community>();
  private pageCache = new Map<string, Page>();

  public setUser(id: string, user: User) {
    this.userCache.set(id, user);
  }
  public getUser(id: string): User | null {
    return this.userCache.get(id) || null;
  }
  public setPost(id: string, post: Post) {
    this.postCache.set(id, post);
  }
  public getPost(id: string): Post | null {
    return this.postCache.get(id) || null;
  }
  public setCommunity(id: string, community: Community) {
    this.communityCache.set(id, community);
  }
  public getCommunity(id: string): Community | null {
    return this.communityCache.get(id) || null;
  }
  public setPage(id: string, page: Page) {
    this.pageCache.set(id, page);
  }
  public getPage(id: string): Page | null {
    return this.pageCache.get(id) || null;
  }
  public clearAll() {
    this.userCache.clear();
    this.postCache.clear();
    this.communityCache.clear();
    this.pageCache.clear();
  }
}

export const cacheManager = new MemoryCacheManager();
