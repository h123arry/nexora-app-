import test from 'node:test';
import assert from 'node:assert/strict';
import { getGiftAnimationProfile } from '../src/utils/giftAnimationProfile.ts';

test('GIFTVERSE resolves distinct choreography for signature gift worlds', () => {
  assert.equal(getGiftAnimationProfile('dragon-10', 'legendary').category, 'dragon');
  assert.equal(getGiftAnimationProfile('wildlife-01', 'sparkle').category, 'wildlife');
  assert.equal(getGiftAnimationProfile('floral-01', 'sparkle').category, 'floral');
  assert.equal(getGiftAnimationProfile('royal-10', 'legendary').category, 'royal');
  assert.equal(getGiftAnimationProfile('unknown-01', 'reveal').category, 'other');
});

test('rarity animation tier controls a bounded visual budget', () => {
  const common = getGiftAnimationProfile('dragon-01', 'sparkle');
  const legendary = getGiftAnimationProfile('dragon-10', 'legendary');
  assert.equal(common.durationMs, 3400);
  assert.equal(legendary.durationMs, 6400);
  assert.ok(legendary.particleCount > common.particleCount);
  assert.ok(legendary.particleCount <= 16);
});
