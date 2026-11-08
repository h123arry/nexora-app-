import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shapeAuthenticatedVohAccountContext } from '../server/vohAccountContext';

describe('VOH authenticated account context', () => {
  it('uses the verified UID and includes only bounded account insight fields', () => {
    const profile = {
      id: 'attacker-controlled-uid',
      name: 'Nexora Creator',
      username: 'creator',
      bio: 'Building things',
      followers: 125,
      following: 80,
      sparks: 940,
      reputationPoints: 76,
      skills: ['Design', 'Writing', 'AI', 42],
      interestDNA: { AI: 92, Design: 85, ignored: -2, invalid: 'high' },
      creatorModeEnabled: true,
      joinedDate: 'Joined January 2026',
      email: 'private@example.test',
      phone: '+10000000000',
      nexBalance: 999999,
      pendingNex: 500,
      role: 'admin',
    };
    const result = shapeAuthenticatedVohAccountContext('verified-firebase-uid', profile);
    assert.equal(result.id, 'verified-firebase-uid');
    assert.equal(result.followers, 125);
    assert.equal(result.reputationPoints, 76);
    assert.deepEqual(result.skills, ['Design', 'Writing', 'AI']);
    assert.deepEqual(result.interests, [
      { interest: 'AI', strength: 92 },
      { interest: 'Design', strength: 85 },
    ]);
    assert.equal(result.creatorModeEnabled, true);
    assert.equal('email' in result, false);
    assert.equal('phone' in result, false);
    assert.equal('nexBalance' in result, false);
    assert.equal('pendingNex' in result, false);
    assert.equal('role' in result, false);
  });

  it('does not turn missing or invalid metrics into fabricated zeroes', () => {
    const result = shapeAuthenticatedVohAccountContext('verified-uid', {
      followers: undefined,
      following: -5,
      sparks: Number.NaN,
      reputationPoints: 'unknown',
      interestDNA: { AI: 200 },
    });
    assert.equal(result.followers, null);
    assert.equal(result.following, null);
    assert.equal(result.sparks, null);
    assert.equal(result.reputationPoints, null);
    assert.deepEqual(result.interests, [{ interest: 'AI', strength: 100 }]);
  });
});
