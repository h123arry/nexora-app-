import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankPosts, searchPosts } from '../src/services/discovery/discoveryService';
import { Post } from '../src/types';

const post = (overrides: Partial<Post>): Post => ({
  id: 'post', userId: 'creator', username: 'creator', name: 'Creator', avatar: '', isVerified: false,
  content: 'A thoughtful post', tags: [], likes: 0, commentsCount: 0, shares: 0, timestamp: new Date().toISOString(), comments: [],
  ...overrides,
});

describe('discovery service', () => {
  it('ranks followed and interest-matching posts with grounded reasons', () => {
    const ranked = rankPosts([
      post({ id: 'generic', userId: 'other', timestamp: '2020-01-01T00:00:00.000Z' }),
      post({ id: 'relevant', userId: 'friend', tags: ['AI'], likes: 4, timestamp: new Date().toISOString() }),
    ], { followingIds: ['friend'], interestDNA: { ai: 10 }, now: Date.now() });
    assert.equal(ranked[0].post.id, 'relevant');
    assert.ok(ranked[0].reasons.some(reason => reason.includes('follow')));
    assert.ok(ranked[0].reasons.some(reason => reason.includes('topics')));
  });

  it('excludes muted creators and not-interested tags before ranking', () => {
    const ranked = rankPosts([
      post({ id: 'muted', userId: 'blocked', tags: ['news'] }),
      post({ id: 'hidden-tag', tags: ['politics'] }),
      post({ id: 'allowed', tags: ['technology'] }),
    ], { mutedCreatorIds: ['blocked'], notInterestedTags: ['politics'] });
    assert.deepEqual(ranked.map(item => item.post.id), ['allowed']);
  });

  it('returns relevance-ranked posts and supports video-only search', () => {
    const posts = [
      post({ id: 'text', content: 'AI design notes', tags: ['ai'] }),
      post({ id: 'video', content: 'AI video tutorial', tags: ['tutorial'], videoUrl: 'https://example.test/video.mp4' }),
    ];
    assert.deepEqual(searchPosts(posts, 'AI').map(item => item.id), ['text', 'video']);
    assert.deepEqual(searchPosts(posts, 'AI', { videosOnly: true }).map(item => item.id), ['video']);
  });
});
