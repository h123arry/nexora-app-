import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicProfileProjection } from '../src/services/firebase/publicProfileProjection';
import type { User } from '../src/types';

const profile = {
  id: 'user-1', username: 'harrison', name: 'Harrison', avatar: 'avatar.png',
  bio: 'Building NEXORA', location: 'Abia, Nigeria', website: '', followers: 10,
  following: 5, isVerified: false, coverImage: '', joinedDate: 'Joined 2026',
  reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
  interestDNA: { AI: 90 }, skills: [],
} as User;

test('includes only the optional profile decoration identifiers in the public projection', () => {
  const decorated = createPublicProfileProjection({ ...profile, profileFrameId: 'frame-aurora', profileBadgeId: 'badge-regalia' });
  assert.equal(decorated.profileFrameId, 'frame-aurora');
  assert.equal(decorated.profileBadgeId, 'badge-regalia');
  assert.equal('email' in decorated, false);
});

test('omits location from public profiles unless explicitly opted in', () => {
  const projection = createPublicProfileProjection(profile);
  assert.equal(projection.location, undefined);
  assert.equal(projection.username, 'harrison');
  assert.equal('interestDNA' in projection, false);
});

test('includes a non-empty location only when public visibility is explicitly enabled', () => {
  const projection = createPublicProfileProjection(profile, { includeLocation: true });
  assert.equal(projection.location, 'Abia, Nigeria');
});

test('does not publish blank locations even when visibility is enabled', () => {
  const projection = createPublicProfileProjection({ ...profile, location: '   ' }, { includeLocation: true });
  assert.equal(projection.location, undefined);
});
