import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankPosts, searchCreators, searchPosts } from '../src/services/discovery/discoveryService';
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

  it('filters blocked, hidden, archived, and already-seen posts before ranking', () => {
    const ranked = rankPosts([
      post({ id: 'blocked', userId: 'bad' }),
      post({ id: 'hidden' }),
      post({ id: 'archived', isArchived: true }),
      post({ id: 'seen' }),
      post({ id: 'eligible', userId: 'new-creator' }),
    ], { blockedCreatorIds: ['bad'], hiddenPostIds: ['hidden'], seenPostIds: ['seen'] });
    assert.deepEqual(ranked.map(item => item.post.id), ['eligible', 'seen']);
  });

  it('honours a configurable consecutive-creator limit', () => {
    const ranked = rankPosts([
      post({ id: 'a1', userId: 'same', likes: 1000 }),
      post({ id: 'a2', userId: 'same', likes: 900 }),
      post({ id: 'a3', userId: 'same', likes: 800 }),
      post({ id: 'a4', userId: 'same', likes: 700 }),
      post({ id: 'b1', userId: 'other', likes: 10 }),
    ], { maxPostsPerCreator: 4, maxConsecutivePostsPerCreator: 2 });
    assert.deepEqual(ranked.slice(0, 5).map(item => item.post.userId), ['same', 'same', 'other', 'same', 'same']);
  });

  it('keeps a single creator feed usable while respecting the per-creator cap', () => {
    const ranked = rankPosts([
      post({ id: 'a1', userId: 'only', likes: 100 }),
      post({ id: 'a2', userId: 'only', likes: 90 }),
      post({ id: 'a3', userId: 'only', likes: 80 }),
      post({ id: 'a4', userId: 'only', likes: 70 }),
    ], { maxPostsPerCreator: 2 });
    assert.deepEqual(ranked.map(item => item.post.id), ['a1', 'a2', 'a3', 'a4']);
  });

  it('limits a prolific creator and interleaves other creators for feed variety', () => {
    const ranked = rankPosts([
      post({ id: 'a1', userId: 'same', likes: 1000000 }),
      post({ id: 'a2', userId: 'same', likes: 999999 }),
      post({ id: 'a3', userId: 'same', likes: 999998 }),
      post({ id: 'a4', userId: 'same', likes: 999997 }),
      post({ id: 'b1', userId: 'other', likes: 2, tags: ['AI'] }),
    ], { interestDNA: { ai: 10 }, maxPostsPerCreator: 2 });
    assert.deepEqual(ranked.slice(0, 3).map(item => item.post.userId), ['same', 'other', 'same']);
    assert.ok(ranked.some(item => item.post.userId === 'other'));
  });
  it('ranks creator search by exact username, then name, and excludes unavailable accounts', () => {
    const creator = (overrides: Partial<import('../src/types').User>) => ({
      id: 'creator', username: 'creator', name: 'Creator', avatar: '', bio: 'A person',
      location: '', website: '', followers: 0, following: 0, isVerified: false,
      coverImage: '', joinedDate: '', reputationPoints: 0,
      reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA: {}, skills: [], ...overrides,
    });
    const results = searchCreators([
      creator({ id: 'bio-match', username: 'writer', name: 'Writer', bio: 'creator community' }),
      creator({ id: 'name-match', username: 'harrison', name: 'Creator' }),
      creator({ id: 'username-match', username: 'creator', name: 'Harrison' }),
      creator({ id: 'suspended', username: 'creator_two', isSuspended: true }),
      creator({ id: 'banned', username: 'creator_three', isBanned: true }),
    ], '@creator', { limit: 3 });
    assert.deepEqual(results.map(user => user.id), ['username-match', 'name-match', 'bio-match']);
  });

  it('returns bounded and de-duplicated creators for an empty query', () => {
    const creator = (id: string) => ({
      id, username: id, name: id, avatar: '', bio: '', location: '', website: '',
      followers: 0, following: 0, isVerified: false, coverImage: '', joinedDate: '',
      reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA: {}, skills: [],
    });
    assert.deepEqual(searchCreators([creator('a'), creator('a'), creator('b')], '', { limit: 1 }).map(user => user.id), ['a']);
  });

  it('respects the configurable creator sequence window and preserves eligible overflow', () => {
    const ranked = rankPosts([
      post({ id: 'a1', userId: 'a', likes: 10000 }),
      post({ id: 'a2', userId: 'a', likes: 9000 }),
      post({ id: 'a3', userId: 'a', likes: 8000 }),
      post({ id: 'a4', userId: 'a', likes: 7000 }),
      post({ id: 'b1', userId: 'b', likes: 1 }),
    ], { maxPostsPerCreator: 3, maxConsecutivePostsPerCreator: 2 });
    assert.deepEqual(ranked.slice(0, 4).map(item => item.post.userId), ['a', 'a', 'b', 'a']);
    assert.equal(ranked.length, 5);
  });

  it('keeps deterministic order when multiple posts have equal ranking scores', () => {
    const input = [post({ id: 'first', userId: 'one' }), post({ id: 'second', userId: 'two' })];
    const firstRun = rankPosts(input, { now: Date.now() }).map(item => item.post.id);
    const secondRun = rankPosts(input, { now: Date.now() }).map(item => item.post.id);
    assert.deepEqual(firstRun, secondRun);
  });

});
