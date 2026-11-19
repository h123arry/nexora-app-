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


test('the 100 new collection prefixes receive dedicated animation choreography', () => {
  const expected = ['oceanic','elemental','architecture','gemstone','adventure','couture','spirit','arena','timepiece','dreamscape'];
  for (const category of expected) {
    assert.equal(getGiftAnimationProfile(category + '-n01', 'cinematic').category, category);
  }
});

test('rarity animation tier controls a bounded visual budget', () => {
  const common = getGiftAnimationProfile('dragon-01', 'sparkle');
  const legendary = getGiftAnimationProfile('dragon-10', 'legendary');
  assert.equal(common.durationMs, 3400);
  assert.equal(legendary.durationMs, 6400);
  assert.ok(legendary.particleCount > common.particleCount);
  assert.ok(legendary.particleCount <= 16);
});
