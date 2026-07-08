import { User } from '../../types';
import { getRichUser } from '../../data/database';

export class ProfileEngine {
  private static profileCache = new Map<string, { user: User; timestamp: number }>();
  private static revalidationQueue = new Set<string>();
  private static CACHE_TTL_MS = 30000; // 30 seconds cache TTL for profile revalidation

  /**
   * Retrieves profile information instantly.
   * If in cache and not expired, returns the cached version.
   * Otherwise, returns cached/fallback instantly and triggers a quiet background refresh.
   */
  static getProfileInstantly(user: User, onRefresh?: (updatedUser: User) => void): User {
    if (!user || !user.id) return user;

    const cached = this.profileCache.get(user.id);
    const now = Date.now();

    if (cached) {
      const isExpired = now - cached.timestamp > this.CACHE_TTL_MS;
      if (isExpired) {
        // Quiet background revalidation
        this.triggerQuietRevalidation(user, onRefresh);
      }
      return cached.user;
    }

    // First-time cache warming
    const rich = getRichUser(user);
    this.profileCache.set(user.id, { user: rich, timestamp: now });
    return rich;
  }

  /**
   * Performs background revalidation of profile data quietly, reducing redundant DB calls
   */
  private static triggerQuietRevalidation(user: User, onRefresh?: (updatedUser: User) => void) {
    if (this.revalidationQueue.has(user.id)) return; // Already revalidating this user
    this.revalidationQueue.add(user.id);

    // Simulate quiet background query to keep statistics fresh and synchronized
    setTimeout(() => {
      try {
        const freshUser = getRichUser(user);
        this.profileCache.set(user.id, { user: freshUser, timestamp: Date.now() });
        if (onRefresh) {
          onRefresh(freshUser);
        }
      } catch (e) {
        console.warn(`[Profile Engine] Quiet revalidation failed for ${user.username}`, e);
      } finally {
        this.revalidationQueue.delete(user.id);
      }
    }, 150); // Small debounce/async shift to prevent frame drop
  }

  /**
   * Warm up profiles for posts currently visible in the viewport or feed
   */
  static prefetchProfiles(users: User[]) {
    if (!users || users.length === 0) return;
    const now = Date.now();
    users.forEach(u => {
      if (!u || !u.id) return;
      if (!this.profileCache.has(u.id)) {
        // Cache misses are populated asynchronously without blocking main thread
        setTimeout(() => {
          const rich = getRichUser(u);
          this.profileCache.set(u.id, { user: rich, timestamp: now });
        }, 0);
      }
    });
  }

  /**
   * Invalidates specific profile cache to force hard refresh
   */
  static invalidateProfile(userId: string) {
    this.profileCache.delete(userId);
  }

  static getProfileAudit(user: User): string {
    const isBioEmpty = !user.bio || user.bio.trim() === '';
    const hasWebsite = !!user.website;
    const hasSkills = user.skills && user.skills.length > 0;

    return `### 👤 VOH AI Profile Audit
Reviewing profile credentials for **@${user.username}**:
- **Bio Quality**: ${isBioEmpty ? '❌ Empty (Recommended: add a high-impact branding statement)' : '✅ Verified'}
- **External Portfolio**: ${hasWebsite ? '✅ Verified link linked' : '⚠️ Missing external website (Recommended: link your github/behance)'}
- **Developer Skills**: ${hasSkills ? `✅ Verified ${user.skills.length} skills` : '❌ No skills added (Recommended: list your specialty tools to verify reputation)'}

#### 💡 Suggested Bio Options
1. **Futuristic Option**: *"Pioneering modular design tokens and zero-cost compiler frameworks on Nexora. Let's co-build future human interfaces! 🚀"*
2. **Community Builder Option**: *"Digital craftsman co-building verified knowledge networks in Port Harcourt. High-reputation creator and UI/UX strategist. 🎨"*`;
  }
}
