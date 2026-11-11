import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isStudioCloudAssetPathOwnedByUser,
  isStudioCloudDraftNewer,
  isStudioCloudRevisionCurrent,
} from '../src/utils/studioCloudDraftPolicy';

test('cloud draft freshness only wins when its timestamp is newer', () => {
  assert.equal(isStudioCloudDraftNewer(100, 101), true);
  assert.equal(isStudioCloudDraftNewer(101, 100), false);
  assert.equal(isStudioCloudDraftNewer(100, 100), false);
  assert.equal(isStudioCloudDraftNewer(0, Number.NaN), false);
});

test('cloud draft revision checks reject stale writers', () => {
  assert.equal(isStudioCloudRevisionCurrent(4, 4), true);
  assert.equal(isStudioCloudRevisionCurrent(4, 5), false);
  assert.equal(isStudioCloudRevisionCurrent(-1, -1), false);
  assert.equal(isStudioCloudRevisionCurrent(1.5, 1.5), false);
});

test('cloud draft media references must stay inside the signed-in owner path', () => {
  assert.equal(isStudioCloudAssetPathOwnedByUser('users/u1/studio-drafts/active/assets/a1', 'u1'), true);
  assert.equal(isStudioCloudAssetPathOwnedByUser('users/u2/studio-drafts/active/assets/a1', 'u1'), false);
  assert.equal(isStudioCloudAssetPathOwnedByUser('users/u1/studio-drafts/active/assets/../u2/a1', 'u1'), false);
});
