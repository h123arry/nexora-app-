import assert from 'node:assert/strict';
import test from 'node:test';
import type { User, Circle } from '../src/types.ts';
import { RecommendationEngine } from '../src/services/voh/recommendationEngine.ts';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'viewer', username: 'viewer', name: 'Viewer', avatar: '', bio: '', location: '', website: '',
    followers: 0, following: 0, isVerified: false, coverImage: '', joinedDate: '',
    reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
    interestDNA: {}, skills: [], ...overrides,
  };
}
function circle(overrides: Partial<Circle> = {}): Circle {
  return { id: 'circle', name: 'Circle', description: '', bannerImage: '', creatorId: 'creator', rules: [], tags: [], ...overrides };
}

test('creator recommendations rank relevant creators and explain the match', () => {
  const viewer = user({ interestDNA: { Football: 90, Design: 40 }, skills: ['Writing'] });
  const result = RecommendationEngine.getRecommendations(viewer, [
    user({ id: 'low', username: 'low', name: 'Low', interestDNA: { Design: 20 } }),
    user({ id: 'high', username: 'high', name: 'High', interestDNA: { Football: 95 } }),
  ], []);
  assert.equal(result.creatorsToFollow[0].id, 'high');
  assert.match(result.creatorsToFollow[0].matchReason, /Football/);
});

test('creator eligibility excludes self, followed, blocked, muted, suspended and banned accounts before ranking', () => {
  const viewer = user();
  const candidates = [
    user({ id: 'viewer' }),
    user({ id: 'followed' }),
    user({ id: 'blocked' }),
    user({ id: 'muted' }),
    user({ id: 'suspended', isSuspended: true }),
    user({ id: 'banned', isBanned: true }),
    user({ id: 'eligible' }),
  ];
  const result = RecommendationEngine.getRecommendations(viewer, candidates, [], {
    followingCreatorIds: ['followed'], blockedCreatorIds: ['blocked'], mutedCreatorIds: ['muted'],
  });
  assert.deepEqual(result.creatorsToFollow.map(item => item.id), ['eligible']);
});

test('circle recommendations exclude joined, blocked, banned-member, private and invite-only circles', () => {
  const viewer = user({ id: 'viewer', interestDNA: { music: 90 } });
  const result = RecommendationEngine.getRecommendations(viewer, [], [
    circle({ id: 'joined', tags: ['music'] }),
    circle({ id: 'blocked', tags: ['music'] }),
    circle({ id: 'private', type: 'private', tags: ['music'] }),
    circle({ id: 'invite', type: 'invite-only', tags: ['music'] }),
    circle({ id: 'banned-member', bannedUsers: ['viewer'], tags: ['music'] }),
    circle({ id: 'public', type: 'public', tags: ['music'] }),
  ], { joinedCircleIds: ['joined'], blockedCircleIds: ['blocked'] });
  assert.deepEqual(result.circlesToJoin.map(item => item.id), ['public']);
  assert.match(result.circlesToJoin[0].matchReason, /music/i);
});

test('recommendation limits are bounded and ties are deterministic', () => {
  const viewer = user();
  const candidates = ['zeta', 'alpha', 'beta'].map(id => user({ id, username: id, name: id }));
  const result = RecommendationEngine.getRecommendations(viewer, candidates, [], { limit: 2 });
  assert.deepEqual(result.creatorsToFollow.map(item => item.id), ['alpha', 'beta']);
  assert.equal(RecommendationEngine.getRecommendations(viewer, candidates, [], { limit: 99 }).creatorsToFollow.length, 3);
});
