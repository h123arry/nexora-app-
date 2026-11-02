import { User, Post, Circle } from '../../types';

export interface IntelligentSearchSuggestions {
  suggestions: string[];
  suggestedUsers: User[];
  suggestedCircles: Circle[];
}

export class SearchEngine {
  static getSuggestions(query: string, users: User[], posts: Post[], circles: Circle[]): IntelligentSearchSuggestions {
    const q = query.trim().toLowerCase();
    if (!q) return { suggestions: [], suggestedUsers: [], suggestedCircles: [] };

    const suggestedUsers = users
      .filter(user => user.username.toLowerCase().includes(q) || user.name.toLowerCase().includes(q))
      .slice(0, 3);

    const suggestedCircles = circles
      .filter(circle => circle.name.toLowerCase().includes(q) || circle.tags.some(tag => tag.toLowerCase().includes(q)))
      .slice(0, 3);

    const actualTags = new Set<string>();
    posts.forEach(post => (post.tags || []).forEach(tag => {
      const normalized = tag.trim().replace(/^#/, '');
      if (normalized && normalized.toLowerCase().includes(q)) actualTags.add(normalized);
    }));
    circles.forEach(circle => circle.tags.forEach(tag => {
      const normalized = tag.trim().replace(/^#/, '');
      if (normalized && normalized.toLowerCase().includes(q)) actualTags.add(normalized);
    }));

    return {
      suggestions: [...actualTags].slice(0, 6).map(tag => `#${tag}`),
      suggestedUsers,
      suggestedCircles,
    };
  }
}
