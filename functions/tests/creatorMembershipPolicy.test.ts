import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATOR_MEMBERSHIP_BENEFIT_LIMIT, CREATOR_MEMBERSHIP_TIER_LIMIT, validateCreatorMembershipTierId, validateCreatorMembershipTierInput } from '../src/creatorMembershipPolicy.ts';

test('creator membership tier limits are deliberately bounded', () => {
  assert.equal(CREATOR_MEMBERSHIP_TIER_LIMIT, 3);
  assert.equal(CREATOR_MEMBERSHIP_BENEFIT_LIMIT, 5);
});

test('creator membership tier input trims and validates creator-authored details', () => {
  assert.deepEqual(validateCreatorMembershipTierInput({ name: '  Insider  ', description: '  Behind the scenes access  ', benefits: ['  Monthly Q&A ', 'Early previews'] }), {
    name: 'Insider', description: 'Behind the scenes access', benefits: ['Monthly Q&A', 'Early previews'],
  });
});

test('creator membership tier rejects oversized, incomplete and duplicate benefits', () => {
  assert.throws(() => validateCreatorMembershipTierInput({ name: 'A', description: 'Too short', benefits: ['Benefit'] }));
  assert.throws(() => validateCreatorMembershipTierInput({ name: 'Supporter', description: 'A valid description', benefits: [] }));
  assert.throws(() => validateCreatorMembershipTierInput({ name: 'Supporter', description: 'A valid description', benefits: ['Same benefit', ' same BENEFIT '] }));
  assert.throws(() => validateCreatorMembershipTierInput({ name: 'Supporter', description: 'A valid description', benefits: ['one','two','three','four','five','six'] }));
});

test('creator membership tier ids reject paths and malformed values', () => {
  assert.equal(validateCreatorMembershipTierId('tier_123'), 'tier_123');
  assert.throws(() => validateCreatorMembershipTierId('../otherCreator'));
  assert.throws(() => validateCreatorMembershipTierId(12));
});
