import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptedWatchCredit } from '../functions/src/videoWatchAnalyticsPolicy';

test('credits plausible forward playback using server elapsed time',()=>{
 assert.equal(acceptedWatchCredit({elapsedSeconds:5,previousPositionSeconds:10,nextPositionSeconds:15}),5);
 assert.equal(acceptedWatchCredit({elapsedSeconds:20,previousPositionSeconds:0,nextPositionSeconds:18}),15);
});
test('rejects seeks, rewinds, paused gaps and impossible progress',()=>{
 for(const input of [
  {elapsedSeconds:1,previousPositionSeconds:0,nextPositionSeconds:1},
  {elapsedSeconds:40,previousPositionSeconds:0,nextPositionSeconds:40},
  {elapsedSeconds:5,previousPositionSeconds:10,nextPositionSeconds:0},
  {elapsedSeconds:5,previousPositionSeconds:0,nextPositionSeconds:30},
  {elapsedSeconds:5,previousPositionSeconds:4,nextPositionSeconds:4},
  {elapsedSeconds:NaN,previousPositionSeconds:0,nextPositionSeconds:5},
 ]) assert.equal(acceptedWatchCredit(input),0);
});
