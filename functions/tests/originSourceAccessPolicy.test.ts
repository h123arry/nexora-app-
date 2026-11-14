import assert from 'node:assert/strict';
import test from 'node:test';
import { assertOriginSourceAccess } from '../src/originSourceAccessPolicy.js';
const base = {
 derivativeOwnerUid:'remixer', sourceOwnerUid:'source',
 derivativeSettings:{messaging:{blockedUserIds:[]},feed:{blockedCreatorIds:[]}},
 sourceSettings:{privacy:{isPrivateAccount:false},messaging:{blockedUserIds:[]},feed:{blockedCreatorIds:[]}},
 sourcePost:{audience:'public',status:'published'},
};
test('allows public available source when neither account blocks the other',()=>assert.doesNotThrow(()=>assertOriginSourceAccess(base)));
test('rejects absent, non-public, private and unavailable source content',()=>{
 for(const patch of [
  {sourcePost:null},{sourcePost:{audience:'followers'}},
  {sourceSettings:{privacy:{isPrivateAccount:true}}},
  {sourcePost:{audience:'public',deleted:true}},
  {sourcePost:{audience:'public',status:'hidden'}},
  {sourcePost:{audience:'public',moderationStatus:'restricted'}},
 ]) assert.throws(()=>assertOriginSourceAccess({...base,...patch}));
});
test('rejects blocks in both directions from messaging and feed settings',()=>{
 assert.throws(()=>assertOriginSourceAccess({...base,derivativeSettings:{messaging:{blockedUserIds:['source']}}}),/blocked/);
 assert.throws(()=>assertOriginSourceAccess({...base,sourceSettings:{messaging:{blockedUserIds:['remixer']}}}),/blocked/);
 assert.throws(()=>assertOriginSourceAccess({...base,derivativeSettings:{feed:{blockedCreatorIds:['source']}}}),/blocked/);
 assert.throws(()=>assertOriginSourceAccess({...base,sourceSettings:{feed:{blockedCreatorIds:['remixer']}}}),/blocked/);
});
