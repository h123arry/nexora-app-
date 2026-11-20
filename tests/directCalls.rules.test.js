import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

const projectId = 'demo-nexora-rules';
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

const dbFor = uid => env.authenticatedContext(uid, {
  email: uid + '@example.test',
  email_verified: true,
}).firestore();
const seed = callback => env.withSecurityRulesDisabled(context => callback(context.firestore()));

describe('Direct-call Firestore access', () => {
  it('allows only the two call participants to read a call record', async () => {
    await seed(async db => {
      await setDoc(doc(db, 'directCalls', 'call_record_123456'), {
        id: 'call_record_123456',
        callerId: 'alice',
        recipientId: 'bob',
        participants: ['alice', 'bob'],
        type: 'voice',
        status: 'ringing',
      });
    });
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'directCalls', 'call_record_123456')));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'directCalls', 'call_record_123456')));
    await assertFails(getDoc(doc(dbFor('mallory'), 'directCalls', 'call_record_123456')));
    await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'directCalls'), where('participants', 'array-contains', 'alice'))));
  });

  it('prevents clients from creating, changing or deleting call state and active-call locks', async () => {
    await seed(async db => {
      await setDoc(doc(db, 'directCalls', 'call_record_123456'), {
        id: 'call_record_123456', callerId: 'alice', recipientId: 'bob',
        participants: ['alice', 'bob'], type: 'voice', status: 'ringing',
      });
    });
    const alice = dbFor('alice');
    await assertFails(setDoc(doc(alice, 'directCalls', 'forged_call_record_123'), {
      callerId: 'alice', recipientId: 'mallory', participants: ['alice', 'mallory'], status: 'accepted',
    }));
    await assertFails(updateDoc(doc(alice, 'directCalls', 'call_record_123456'), { status: 'accepted' }));
    await assertFails(deleteDoc(doc(alice, 'directCalls', 'call_record_123456')));
    await assertFails(setDoc(doc(alice, 'activeDirectCalls', 'alice'), { callId: 'forged_call_record_123' }));
    await assertFails(getDoc(doc(alice, 'activeDirectCalls', 'alice')));
  });
});
