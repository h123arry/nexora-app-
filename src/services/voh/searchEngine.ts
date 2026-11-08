import { User, Post, Circle } from '../../types';

export interface IntelligentSearchSuggestions {
  suggestions: string[];
  suggestedUsers: User[];
  suggestedCircles: Circle[];
}

/** Build search suggestions only from records supplied by the caller. */
export class SearchEngine {
  static getSuggestions(query: string, users: User[], posts: Post[], circles: Circle[]): IntelligentSearchSuggestions {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return { suggestions: [], suggestedUsers: [], suggestedCircles: [] };

    const suggestedUsers = users
      .filter(user => user.username.toLocaleLowerCase().includes(q) || user.name.toLocaleLowerCase().includes(q))
      .slice(0, 3);

    const suggestedCircles = circles
      .filter(circle => circle.name.toLocaleLowerCase().includes(q)
        || (Array.isArray(circle.tags) && circle.tags.some(tag => tag.toLocaleLowerCase().includes(q))))
      .slice(0, 3);

    const matchingPosts = posts.filter(post =>
      `${post.content || ''} ${Array.isArray(post.tags) ? post.tags.join(' ') : ''}`.toLocaleLowerCase().includes(q)
    ).slice(0, 20);

    const groundedTags = [
      ...matchingPosts.flatMap(post => Array.isArray(post.tags) ? post.tags : []),
      ...suggestedCircles.flatMap(circle => Array.isArray(circle.tags) ? circle.tags : []),
    ]
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => `#${tag.trim().replace(/^#/, '')}`);

    return { suggestions: [...new Set(groundedTags)].slice(0, 5), suggestedUsers, suggestedCircles };
  }
}
