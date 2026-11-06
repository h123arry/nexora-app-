import assert from 'node:assert/strict';
import test from 'node:test';
import type { User, Post, Circle } from '../src/types.ts';
import { SearchEngine } from '../src/services/voh/searchEngine.ts';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user', username: 'user', name: 'User', avatar: '', bio: '', location: '', website: '',
    followers: 0, following: 0, isVerified: false, coverImage: '', joinedDate: '',
    reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
    interestDNA: {}, skills: [], ...overrides,
  };
}
function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post', userId: 'author', username: 'author', name: 'Author', avatar: '', isVerified: false,
    content: '', tags: [], likes: 0, commentsCount: 0, shares: 0, timestamp: '',
    comments: [], ...overrides,
  };
}
function circle(overrides: Partial<Circle> = {}): Circle {
  return { id: 'circle', name: 'Circle', description: '', bannerImage: '', creatorId: 'creator', rules: [], tags: [], ...overrides };
}

test('empty and unmatched queries do not return fabricated autocomplete suggestions', () => {
  assert.deepEqual(SearchEngine.getSuggestions('', [user()], [post()], [circle()]), {
    suggestions: [], suggestedUsers: [], suggestedCircles: [],
  });
  assert.deepEqual(SearchEngine.getSuggestions('nothing-matches', [user()], [post()], [circle()]).suggestions, []);
});

test('search suggestions are derived from matching posts and public circles', () => {
  const result = SearchEngine.getSuggestions('foot', [], [
    post({ id: 'p1', tags: ['football', 'music'] }),
    post({ id: 'p2', tags: ['football'] }),
  ], [
    circle({ id: 'public', name: 'Football Fans', tags: ['football'], type: 'public' }),
    circle({ id: 'private', name: 'Football Private', tags: ['football'], type: 'private' }),
  ]);
  assert.deepEqual(result.suggestions, ['#football']);
  assert.deepEqual(result.suggestedCircles.map(item => item.id), ['public']);
});

test('user search ranks prefix matches and excludes restricted accounts', () => {
  const result = SearchEngine.getSuggestions('har', [
    user({ id: 'partial', username: 'theharrison', name: 'The Harrison' }),
    user({ id: 'prefix', username: 'harrison', name: 'Harrison' }),
    user({ id: 'suspended', username: 'harmony', name: 'Harmony', isSuspended: true }),
    user({ id: 'banned', username: 'harry', name: 'Harry', isBanned: true }),
  ], [], []);
  assert.deepEqual(result.suggestedUsers.map(item => item.id), ['prefix', 'partial']);
});
