import { User, Post, Circle } from '../../types';

export interface IntelligentSearchSuggestions {
  suggestions: string[];
  suggestedUsers: User[];
  suggestedCircles: Circle[];
}

export class SearchEngine {
  static getSuggestions(query: string, users: User[], posts: Post[], circles: Circle[]): IntelligentSearchSuggestions {
    const q = query.toLowerCase();
    const suggestions: string[] = [];

    // Filter matching usernames/names
    const suggestedUsers = users
      .filter(u => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
      .slice(0, 3);

    // Filter matching circles
    const suggestedCircles = circles
      .filter(c => c.name.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q)))
      .slice(0, 3);

    // Dynamic autocomplete suggestion chips
    if (q.includes('fo') || q.includes('sp')) {
      suggestions.push('Football predictions WAT', 'Sports activities Port Harcourt');
    }
    if (q.includes('ai') || q.includes('co')) {
      suggestions.push('AI builders guild', 'Code compiler memory serialization');
    }
    if (q.includes('de') || q.includes('ui')) {
      suggestions.push('Design tokens & space-glass styles', 'UI responsive grid frameworks');
    }

    // Default suggestions if none
    if (suggestions.length === 0) {
      suggestions.push('Lagos startup founders alliance', 'Premium creative writing communities', '#SpaceGlass aesthetic guides');
    }

    return {
      suggestions,
      suggestedUsers,
      suggestedCircles
    };
  }
}
