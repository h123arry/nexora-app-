import { User } from '../../types';
import { getRichUser } from '../../data/database';

export class ProfileEngine {
  private static profileCache = new Map<string, { user: User; timestamp: number }>();
  private static CACHE_TTL_MS = 30_000;

  /**
   * Enriches the supplied profile with the current app-side activity counters.
   * This is a local cache operation, not a remote profile fetch or verification.
   */
  static getProfileInstantly(user: User, onRefresh?: (updatedUser: User) => void): User {
    if (!user || !user.id) return user;
    const now = Date.now();
    const cached = this.profileCache.get(user.id);
    if (cached && now - cached.timestamp <= this.CACHE_TTL_MS) return cached.user;

    const refreshed = getRichUser(user);
    this.profileCache.set(user.id, { user: refreshed, timestamp: now });
    if (cached && onRefresh && cached.user !== refreshed) onRefresh(refreshed);
    return refreshed;
  }

  /** Warm the local profile cache from the profiles already present in the feed. */
  static prefetchProfiles(users: User[]): void {
    const now = Date.now();
    users.forEach(user => {
      if (!user?.id || this.profileCache.has(user.id)) return;
      this.profileCache.set(user.id, { user: getRichUser(user), timestamp: now });
    });
  }

  static invalidateProfile(userId: string): void {
    this.profileCache.delete(userId);
  }

  /** Reports completeness only; field presence is not identity or credential verification. */
  static getProfileAudit(user: User): string {
    const bioPresent = typeof user.bio === 'string' && user.bio.trim().length > 0;
    const websitePresent = typeof user.website === 'string' && user.website.trim().length > 0;
    const skillsCount = Array.isArray(user.skills) ? user.skills.length : 0;

    return [
      '### Profile completeness',
      `- **Bio:** ${bioPresent ? 'Added' : 'Missing'}`,
      `- **Website:** ${websitePresent ? 'Added (not independently verified)' : 'Not added'}`,
      `- **Skills:** ${skillsCount} listed (not independently verified)`,
      '',
      'These checks describe profile fields only. They do not verify identity, credentials, expertise or external links.',
    ].join('\\n');
  }
}
