import assert from 'node:assert/strict';
import test from 'node:test';
import { getReputationStanding } from '../src/services/reputationStanding';

test('starts at Newcomer without granting automatic reputation', () => {
  assert.deepEqual(getReputationStanding(0), {
    tier: 'Newcomer',
    nextTier: 'Active Member',
    nextThreshold: 51,
    pointsRemaining: 51,
    progress: 0,
  });
});

test('moves through the established reputation milestones', () => {
  assert.equal(getReputationStanding(51).tier, 'Active Member');
  assert.equal(getReputationStanding(201).tier, 'Trusted Builder');
  assert.equal(getReputationStanding(501).tier, 'Master Contributor');
  assert.equal(getReputationStanding(1001).tier, 'Apex Luminary');
});

test('reports remaining points and progress toward the next tier', () => {
  assert.deepEqual(getReputationStanding(100), {
    tier: 'Active Member',
    nextTier: 'Trusted Builder',
    nextThreshold: 201,
    pointsRemaining: 101,
    progress: 33,
  });
});

test('caps the highest tier and sanitises invalid or negative values', () => {
  assert.equal(getReputationStanding(5000).nextTier, null);
  assert.equal(getReputationStanding(-50).tier, 'Newcomer');
  assert.equal(getReputationStanding(Number.NaN).pointsRemaining, 51);
});
