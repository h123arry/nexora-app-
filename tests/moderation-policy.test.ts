import test from 'node:test';
import assert from 'node:assert/strict';
import { canSubmitAppeal, hasReviewerRole, isValidReportInput, restrictionProjection } from '../src/services/moderation/moderationPolicy.ts';

test('moderation policy validates bounded report inputs and rejects forged paths', () => {
  assert.equal(isValidReportInput({ targetType: 'post', targetId: 'post-1', category: 'spam', explanation: 'Repeated links' }), true);
  assert.equal(isValidReportInput({ targetType: 'post', targetId: 'posts/post-1', category: 'spam' }), false);
  assert.equal(isValidReportInput({ targetType: 'post', targetId: 'post-1', category: 'made_up' }), false);
  assert.equal(isValidReportInput({ targetType: 'post', targetId: 'post-1', category: 'spam', explanation: 'x'.repeat(1001) }), false);
});

test('only server-issued reviewer claims authorize moderation review', () => {
  assert.equal(hasReviewerRole({ role: 'moderator' }), true);
  assert.equal(hasReviewerRole({ admin: true }), true);
  assert.equal(hasReviewerRole({ role: 'user', admin: false }), false);
  assert.equal(hasReviewerRole({ role: 'admin' }), true);
});

test('enforcement actions project onto the correct interaction restrictions', () => {
  assert.deepEqual(restrictionProjection('restrict_posting'), { postingRestricted: true, messagingRestricted: false, suspended: false });
  assert.deepEqual(restrictionProjection('restrict_messaging'), { postingRestricted: false, messagingRestricted: true, suspended: false });
  assert.deepEqual(restrictionProjection('ban'), { postingRestricted: true, messagingRestricted: true, suspended: true });
});

test('appeals require an active enforcement and deduplicate open appeals', () => {
  assert.equal(canSubmitAppeal(true, false), true);
  assert.equal(canSubmitAppeal(true, true), false);
  assert.equal(canSubmitAppeal(false, false), false);
});
