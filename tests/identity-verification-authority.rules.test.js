import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
      await setDoc(doc(adminDb, 'identityVerificationApplications', 'alice'), {
        userId: 'alice', status: 'pending_review', evidenceUrls: ['https://example.com/private-evidence'],
      });
      await setDoc(doc(adminDb, 'identityVerificationApplications', 'bob'), {
        userId: 'bob', status: 'pending_review', evidenceUrls: ['https://example.com/bob-private-evidence'],
      });
      await setDoc(doc(adminDb, 'verifiedIdentities', 'alice'), {
        userId: 'alice', status: 'verified', identityType: 'creator', displayName: 'Alice Creator',
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
    await assertSucceeds(getDoc(doc(db, 'identityVerificationApplications', 'alice')));
    await assertFails(getDoc(doc(db, 'identityVerificationApplications', 'bob')));
    await assertFails(updateDoc(doc(db, 'identityVerificationApplications', 'alice'), { status: 'approved' }));
    await assertFails(updateDoc(doc(db, 'verifiedIdentities', 'alice'), { status: 'revoked' }));
    await assertSucceeds(getDoc(doc(db, 'verifiedIdentities', 'alice')));
    await assertSucceeds(updateDoc(doc(db, 'publicProfiles', 'alice'), { name: 'Alice Updated' }));
  });
});
