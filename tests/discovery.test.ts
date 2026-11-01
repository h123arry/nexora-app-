import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankPosts, recommendCreators, rankTrendingTopics, searchCreators, searchPosts } from '../src/services/discovery/discoveryService';
import { Post, User } from '../src/types';
import { rankReels } from '../src/services/reels/reelsRanking';

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

  it('requires every search term to match a post instead of returning partial matches', () => {
    const posts = [
      post({ id: 'complete', content: 'AI creator tools' }),
      post({ id: 'partial', username: 'someone', name: 'Someone', content: 'AI tools only' }),
    ];
    assert.deepEqual(searchPosts(posts, 'AI creator').map(item => item.id), ['complete']);
  });

  it('requires every search term to match a creator', () => {
    const creator = (id: string, username: string, name: string, bio: string) => ({
      id, username, name, avatar: '', bio, location: '', website: '', followers: 0, following: 0,
      isVerified: false, coverImage: '', joinedDate: '', reputationPoints: 0,
      reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA: {}, skills: [],
    });
    const results = searchCreators([
      creator('complete', 'ai_creator', 'AI Creator', 'Builds tools'),
      creator('partial', 'ai_tools', 'AI Tools', 'Developer'),
    ], 'ai creator');
    assert.deepEqual(results.map(user => user.id), ['complete']);
  });

  it('recommends only eligible creators with shared interests and grounded reasons', () => {
    const creator = (id: string, interestDNA: Record<string, number>, overrides: Partial<User> = {}) => ({
      id, username: id, name: id, avatar: '', bio: '', location: '', website: '', followers: 10, following: 0,
      isVerified: false, coverImage: '', joinedDate: '', reputationPoints: 0,
      reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA, skills: [], ...overrides,
    } as User);
    const results = recommendCreators([
      creator('followed', { ai: 90 }), creator('match', { ai: 80, design: 50 }),
      creator('unrelated', { sport: 90 }), creator('blocked', { ai: 99 }),
      creator('suspended', { ai: 99 }, { isSuspended: true }),
    ], { viewerId: 'viewer', followingIds: ['followed'], blockedCreatorIds: ['blocked'], interests: { AI: 90, design: 40 } });
    assert.deepEqual(results.map(item => item.creator.id), ['match']);
    assert.match(results[0].reason, /#ai/);
  });

  it('trends topics using recent posts from distinct creators, excluding stale and single-author spikes', () => {
    const now = Date.now();
    const topics = rankTrendingTopics([
      post({ id: 'a', userId: 'one', tags: ['AI'], timestamp: new Date(now - 1000).toISOString(), likes: 10 }),
      post({ id: 'b', userId: 'two', tags: ['#ai'], timestamp: new Date(now - 2000).toISOString(), commentsCount: 4 }),
      post({ id: 'c', userId: 'one', tags: ['solo'], timestamp: new Date(now - 3000).toISOString() }),
      post({ id: 'old', userId: 'three', tags: ['AI'], timestamp: new Date(now - 30 * 24 * 3600 * 1000).toISOString() }),
    ], { now, windowHours: 24, minPosts: 2 });
    assert.deepEqual(topics.map(item => item.tag), ['ai']);
    assert.equal(topics[0].creatorCount, 2);
    assert.equal(topics[0].postCount, 2);
  });

  it('filters reels using privacy and topic controls and handles invalid timestamps deterministically', () => {
    const reels = [
      post({ id: 'allowed', userId: 'creator-a', videoUrl: 'https://example.test/a.mp4', tags: ['AI'], timestamp: 'invalid' }),
      post({ id: 'blocked', userId: 'blocked', videoUrl: 'https://example.test/b.mp4' }),
      post({ id: 'hidden', userId: 'creator-b', videoUrl: 'https://example.test/c.mp4' }),
      post({ id: 'topic', userId: 'creator-c', videoUrl: 'https://example.test/d.mp4', tags: ['politics'] }),
    ];
    const ranked = rankReels(reels, [], {}, { blockedCreatorIds: ['blocked'], hiddenPostIds: ['hidden'], notInterestedTags: ['politics'], now: Date.now() });
    assert.deepEqual(ranked.map(item => item.post.id), ['allowed']);
  });

});
