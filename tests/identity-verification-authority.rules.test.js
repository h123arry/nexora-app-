import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-nexora-identity-rules';
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

after(async () => env?.cleanup());

describe('verification authority rules', () => {
  it('keeps contact-verification state immutable to profile owners after account creation', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users', 'alice'), {
        id: 'alice', username: 'alice', name: 'Alice', isVerified: true,
      });
      await setDoc(doc(adminDb, 'publicProfiles', 'alice'), {
        id: 'alice', username: 'alice', name: 'Alice', isVerified: true,
      });
      await setDoc(doc(adminDb, 'users', 'bob'), {
        id: 'bob', username: 'bob', name: 'Bob', isVerified: false,
      });
      await setDoc(doc(adminDb, 'publicProfiles', 'bob'), {
        id: 'bob', username: 'bob', name: 'Bob', isVerified: false,
      });
    });

    const db = env.authenticatedContext('alice', {
      email: 'alice@example.test',
      email_verified: true,
      phone_number_verified: false,
    }).firestore();

    await assertFails(updateDoc(doc(db, 'users', 'alice'), { isVerified: false }));
    await assertFails(updateDoc(doc(db, 'publicProfiles', 'alice'), { isVerified: false }));

    const verifiedBobDb = env.authenticatedContext('bob', {
      email: 'bob@example.test', email_verified: true, phone_number_verified: false,
    }).firestore();
    await assertFails(updateDoc(doc(verifiedBobDb, 'users', 'bob'), { isVerified: true }));
    await assertFails(updateDoc(doc(verifiedBobDb, 'publicProfiles', 'bob'), { isVerified: true }));

    await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { name: 'Alice Updated' }));
    await assertSucceeds(updateDoc(doc(db, 'publicProfiles', 'alice'), { name: 'Alice Updated' }));
  });
});
