import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreatorAchievements } from '../src/services/analytics/creatorAchievements';

const byId = (posts: Parameters<typeof buildCreatorAchievements>[0], reputation = 0, verified = false) =>
  Object.fromEntries(buildCreatorAchievements(posts, reputation, verified).map(item => [item.id, item]));

test('first video milestone requires a published video, not any post', () => {
  const result = byId([{ videoUrl: '', views: 0, likes: 0, isArchived: false }]);
  assert.equal(result.first_vid.unlocked, false);
  assert.equal(result.consistent_creator.unlocked, false);
});

test('archived posts do not contribute to creator milestones', () => {
  const result = byId([
    { videoUrl: 'https://cdn.example/video.mp4', views: 12000, likes: 120, isArchived: true },
  ]);
  assert.equal(result.first_vid.unlocked, false);
  assert.equal(result['1k_views'].unlocked, false);
  assert.equal(result['100_sparks'].unlocked, false);
});

test('view milestones use recorded counters and do not invent views for missing counters', () => {
  const result = byId([
    { videoUrl: '', views: undefined, likes: 100, isArchived: false },
    { videoUrl: '', views: 600, likes: 0, isArchived: false },
    { videoUrl: '', views: 400, likes: 0, isArchived: false },
  ]);
  assert.equal(result['1k_views'].unlocked, true);
  assert.equal(result['1k_views'].label, '1,000/1,000 Views');
  assert.equal(result.trending_creator.unlocked, true);
  assert.equal(result.trending_creator.title, '500 Views on One Post');
});

test('invalid counters are clamped and reputation milestones use actual reputation or verification', () => {
  const result = byId([
    { videoUrl: '', views: Number.NaN, likes: -50, isArchived: false },
  ], Number.NaN, false);
  assert.equal(result['100_sparks'].progress, 0);
  assert.equal(result['comm_leader'].unlocked, false);
  assert.equal(byId([], 0, true).comm_leader.unlocked, true);
});

test('consistent creator counts only non-archived published posts', () => {
  const result = byId([
    { videoUrl: '', views: 1, likes: 1, isArchived: false },
    { videoUrl: '', views: 1, likes: 1, isArchived: false },
    { videoUrl: '', views: 1, likes: 1, isArchived: true },
  ]);
  assert.equal(result.consistent_creator.progress, 67);
  assert.equal(result.consistent_creator.unlocked, false);
});
