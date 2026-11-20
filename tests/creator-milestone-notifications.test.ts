import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreatorMilestones } from '../functions/src/creatorMilestoneNotifications.js';

test('creator milestone policy issues only thresholds actually reached', () => {
  const milestones = buildCreatorMilestones({
    followers: 100,
    totalLikes: 499,
    totalViews: 1000,
    totalComments: 100,
    totalShares: 49,
    totalSaves: 50,
    totalEarnedNex: 1000,
    highestPostViews: 499,
    publishedPosts: 3,
    isVerified: false,
  });
  const ids = milestones.map(item => item.id);
  assert.ok(ids.includes('followers_50'));
  assert.ok(ids.includes('followers_100'));
  assert.ok(!ids.includes('followers_500'));
  assert.ok(ids.includes('views_1000'));
  assert.ok(!ids.includes('views_10000'));
  assert.ok(!ids.includes('likes_500'));
  assert.ok(!ids.includes('post_views_500'));
  assert.ok(ids.includes('comments_100'));
  assert.ok(!ids.includes('shares_50'));
  assert.ok(ids.includes('saves_50'));
  assert.ok(ids.includes('nex_earned_1000'));
  assert.ok(ids.includes('published_posts_3'));
});

test('verification is issued as a creator milestone only when verified', () => {
  const milestones = buildCreatorMilestones({
    followers: 0,
    totalLikes: 0,
    totalViews: 0,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
    totalEarnedNex: 0,
    highestPostViews: 0,
    publishedPosts: 0,
    isVerified: true,
  });
  assert.deepEqual(milestones.map(item => item.id), ['account_verified']);
});

test('milestone thresholds are stable and do not produce duplicate identifiers', () => {
  const milestones = buildCreatorMilestones({
    followers: 1000,
    totalLikes: 1000,
    totalViews: 10000,
    totalComments: 500,
    totalShares: 100,
    totalSaves: 100,
    totalEarnedNex: 10000,
    highestPostViews: 1000,
    publishedPosts: 10,
    isVerified: true,
  });
  const ids = milestones.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('followers_1000'));
  assert.ok(ids.includes('likes_1000'));
  assert.ok(ids.includes('post_views_1000'));
  assert.ok(ids.includes('comments_500'));
  assert.ok(ids.includes('shares_100'));
  assert.ok(ids.includes('saves_100'));
  assert.ok(ids.includes('nex_earned_10000'));
  assert.ok(ids.includes('published_posts_10'));
});
