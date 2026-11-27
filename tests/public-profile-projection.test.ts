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
  assert.equal('isVerified' in decorated, false);
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

test('publishes changed identity fields while keeping private account data out of the projection', () => {
  const updated = createPublicProfileProjection({
    ...profile,
    username: 'new_handle',
    name: 'New Display Name',
    avatar: 'https://cdn.example/avatar.jpg',
    coverImage: 'https://cdn.example/cover.jpg',
    bio: 'Updated bio',
    email: 'private@example.com',
    phoneNumber: '+234000000000',
    interestDNA: { AI: 90 },
  } as User);

  assert.equal(updated.username, 'new_handle');
  assert.equal(updated.name, 'New Display Name');
  assert.equal(updated.avatar, 'https://cdn.example/avatar.jpg');
  assert.equal(updated.coverImage, 'https://cdn.example/cover.jpg');
  assert.equal(updated.bio, 'Updated bio');
  assert.equal('email' in updated, false);
  assert.equal('phoneNumber' in updated, false);
  assert.equal('interestDNA' in updated, false);
});

test('includes profile identity fields and creator links in the public projection', () => {
  const projection = createPublicProfileProjection({ ...profile, pronouns: 'they/them', profileCategory: 'Founder Mindset', creatorType: 'Creator', socialTwitter: 'https://x.com/example', socialInstagram: 'https://instagram.com/example' });
  assert.equal(projection.pronouns, 'they/them');
  assert.equal(projection.profileCategory, 'Founder Mindset');
  assert.equal(projection.creatorType, 'Creator');
  assert.equal(projection.socialTwitter, 'https://x.com/example');
  assert.equal(projection.socialInstagram, 'https://instagram.com/example');
});


test('persists status text and emoji in the public profile projection', () => {
  const projection = createPublicProfileProjection({
    ...profile,
    statusText: 'Building something new',
    statusEmoji: '🚀',
  } as User);

  assert.equal(projection.statusText, 'Building something new');
  assert.equal(projection.statusEmoji, '🚀');
  assert.equal('email' in projection, false);
  assert.equal('interestDNA' in projection, false);
});
