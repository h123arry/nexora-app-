import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREATOR_LENS_LIMIT,
  canReviewCreatorLens,
  canSubmitCreatorLens,
  creatorLensFilter,
  validateCreatorLensId,
  validateCreatorLensInput,
} from '../src/creatorLensPolicy.ts';

test('creator lens publishing limits and recipe validation are bounded', () => {
  assert.equal(CREATOR_LENS_LIMIT, 50);
  assert.deepEqual(validateCreatorLensInput({
    name: '  Violet Hour  ',
    recipe: { brightness: 105, contrast: 110, saturation: 125, hue: -18 },
  }), { name: 'Violet Hour', recipe: { brightness: 105, contrast: 110, saturation: 125, hue: -18 } });
});

test('creator lens recipe rejects arbitrary strings and out-of-range values', () => {
  assert.throws(() => validateCreatorLensInput({ name: 'Unsafe', recipe: { brightness: 'url(x)', contrast: 100, saturation: 100, hue: 0 } }));
  assert.throws(() => validateCreatorLensInput({ name: 'Too bright', recipe: { brightness: 500, contrast: 100, saturation: 100, hue: 0 } }));
  assert.throws(() => validateCreatorLensInput({ name: 'No recipe', recipe: null }));
  assert.throws(() => validateCreatorLensInput({ name: 'x', recipe: { brightness: 100, contrast: 100, saturation: 100, hue: 0 } }));
});

test('creator lens filter is derived only from validated numeric recipe values', () => {
  const { recipe } = validateCreatorLensInput({ name: 'Nexa Glow', recipe: { brightness: 100, contrast: 110, saturation: 90, hue: 12 } });
  assert.equal(creatorLensFilter(recipe), 'brightness(1.00) contrast(1.10) saturate(0.90) hue-rotate(12deg)');
});

test('only draft or rejected creator lenses can be resubmitted and only pending lenses can be reviewed', () => {
  assert.equal(canSubmitCreatorLens('draft'), true);
  assert.equal(canSubmitCreatorLens('rejected'), true);
  assert.equal(canSubmitCreatorLens('approved'), false);
  assert.equal(canReviewCreatorLens('pending_review'), true);
  assert.equal(canReviewCreatorLens('draft'), false);
  assert.equal(validateCreatorLensId('lens_123'), 'lens_123');
  assert.throws(() => validateCreatorLensId('../other'));
});
