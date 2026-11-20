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

test('counts only qualified public views from other accounts once per daily marker',()=>{
 const base={viewerId:'viewer-1',creatorId:'creator-1',audience:'public',creditedSeconds:5,alreadyCounted:false};
 assert.equal(shouldCountPublicVideoView(base),true);
 assert.equal(shouldCountPublicVideoView({...base,viewerId:'creator-1'}),false);
 assert.equal(shouldCountPublicVideoView({...base,audience:'followers'}),false);
 assert.equal(shouldCountPublicVideoView({...base,creditedSeconds:0}),false);
 assert.equal(shouldCountPublicVideoView({...base,alreadyCounted:true}),false);
});
