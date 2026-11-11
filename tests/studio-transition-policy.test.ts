import test from 'node:test';
import assert from 'node:assert/strict';
import { getCrossDissolveProgress, STUDIO_CROSS_DISSOLVE_SECONDS } from '../src/utils/studioTransitionPolicy';
test('cross-dissolve progress is clamped to the clip overlap', () => {
 assert.equal(getCrossDissolveProgress(9.4,10),0);
 assert.equal(getCrossDissolveProgress(9.7,10),0.5);
 assert.equal(getCrossDissolveProgress(10,10),1);
 assert.equal(STUDIO_CROSS_DISSOLVE_SECONDS,0.6);
});
test('cross-dissolve rejects invalid timing and zero duration', () => {
 assert.equal(getCrossDissolveProgress(Number.NaN,10),0);
 assert.equal(getCrossDissolveProgress(10,10,0),0);
});

import { getCrossDissolveAudioGains } from '../src/utils/studioTransitionPolicy';

test('cross-dissolve audio uses equal-power outgoing and incoming gains', () => {
 const start = getCrossDissolveAudioGains(0);
 const middle = getCrossDissolveAudioGains(0.5);
 const end = getCrossDissolveAudioGains(1);
 assert.equal(start.outgoing, 1);
 assert.equal(start.incoming, 0);
 assert.ok(Math.abs(middle.outgoing - Math.SQRT1_2) < 0.000001);
 assert.ok(Math.abs(middle.incoming - Math.SQRT1_2) < 0.000001);
 assert.ok(Math.abs(end.outgoing) < 0.000001);
 assert.equal(end.incoming, 1);
 assert.equal(getCrossDissolveAudioGains(Number.NaN).outgoing, 1);
 assert.equal(getCrossDissolveAudioGains(-1).incoming, 0);
 assert.equal(getCrossDissolveAudioGains(2).incoming, 1);
});
