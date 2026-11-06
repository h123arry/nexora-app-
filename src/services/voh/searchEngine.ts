import type { User, Post, Circle } from '../../types';

export interface IntelligentSearchSuggestions {
  suggestions: string[];
  suggestedUsers: User[];
  suggestedCircles: Circle[];
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}

function rankText(value: string, query: string): number {
  const normalized = normalize(value);
  if (!normalized || !query) return 0;
  if (normalized === query) return 4;
  if (normalized.startsWith(query)) return 3;
  if (normalized.split(/\s+/).some(word => word.startsWith(query))) return 2;
  return normalized.includes(query) ? 1 : 0;
}

export class SearchEngine {
  /**
   * Suggestions are derived only from supplied, real directory/content data.
   * Empty queries and unmatched queries return no invented trending topics.
   */
  static getSuggestions(query: string, users: User[], posts: Post[], circles: Circle[]): IntelligentSearchSuggestions {
    const q = normalize(query || '');
    if (!q) return { suggestions: [], suggestedUsers: [], suggestedCircles: [] };

    const suggestedUsers = users
      .filter(user => !user.isBanned && !user.isSuspended)
      .map(user => ({
        user,
        score: Math.max(rankText(user.username || '', q), rankText(user.name || '', q)),
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || a.user.id.localeCompare(b.user.id))
      .slice(0, 3)
      .map(result => result.user);

    const suggestedCircles = circles
      .filter(circle => circle.type !== 'private' && circle.type !== 'invite-only')
      .map(circle => {
        const nameScore = rankText(circle.name || '', q);
        const tagScore = Math.max(0, ...(circle.tags || []).map(tag => rankText(tag, q)));
        return { circle, score: Math.max(nameScore, tagScore) };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || a.circle.id.localeCompare(b.circle.id))
      .slice(0, 3)
      .map(result => result.circle);

    const suggestions = new Set<string>();
    for (const post of posts) {
      for (const tag of post.tags || []) {
        if (rankText(tag, q) > 0) suggestions.add('#' + tag.replace(/^#/, ''));
      }
      if (post.searchSuggestion && rankText(post.searchSuggestion, q) > 0) {
        suggestions.add(post.searchSuggestion.trim());
      }
    }
    for (const circle of suggestedCircles) {
      for (const tag of circle.tags || []) {
        if (rankText(tag, q) > 0) suggestions.add('#' + tag.replace(/^#/, ''));
      }
    }

    return {
      suggestions: [...suggestions].slice(0, 6),
      suggestedUsers,
      suggestedCircles,
    };
  }
}
