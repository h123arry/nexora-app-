import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const projectId = 'demo-nexora-profile-permissions';
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') }
  });
});
after(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

const dbFor = (uid) => env.authenticatedContext(uid, {
  email: `${uid}@example.test`, email_verified: true
}).firestore();
const seed = async (callback) => env.withSecurityRulesDisabled(async context => callback(context.firestore()));

describe('profile editing Firestore permissions', () => {
  it('allows an owner to save all profile editor identity and creator-link fields to both projections', async () => {
    await seed(async db => {
      await setDoc(doc(db, 'users', 'alice'), {
        id: 'alice', email: 'alice@example.test', username: 'alice', name: 'Alice',
        bio: '', avatar: '', location: '', website: '', coverImage: ''
      });
      await setDoc(doc(db, 'publicProfiles', 'alice'), {
        id: 'alice', username: 'alice', name: 'Alice', avatar: '', bio: '',
        location: '', website: '', followers: 0, following: 0, sparks: 0, coverImage: ''
      });
    });

    const db = dbFor('alice');
    const identity = {
      name: 'Alice Updated',
      username: 'alice_updated',
      pronouns: 'she/her',
      profileCategory: 'Digital Creator',
      creatorType: 'Premium creator',
      socialTwitter: 'https://x.com/alice',
      socialInstagram: 'https://instagram.com/alice',
      lastDisplayNameChangeTime: new Date().toISOString(),
      lastUsernameChangeTime: new Date().toISOString(),
      updatedAt: serverTimestamp()
    };

    await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), identity));
    await assertSucceeds(updateDoc(doc(db, 'publicProfiles', 'alice'), {
      ...identity,
      updatedAt: serverTimestamp()
    }));

    const publicSnapshot = await getDoc(doc(db, 'publicProfiles', 'alice'));
    assert.equal(publicSnapshot.get('pronouns'), 'she/her');
    assert.equal(publicSnapshot.get('profileCategory'), 'Digital Creator');
    assert.equal(publicSnapshot.get('creatorType'), 'Premium creator');
    assert.equal(publicSnapshot.get('socialTwitter'), 'https://x.com/alice');
    assert.equal(publicSnapshot.get('socialInstagram'), 'https://instagram.com/alice');
  });

  it('does not allow profile editing to change private account or moderation fields', async () => {
    await seed(async db => {
      await setDoc(doc(db, 'users', 'alice'), {
        id: 'alice', email: 'alice@example.test', username: 'alice', name: 'Alice',
        bio: '', avatar: '', location: '', website: '', coverImage: '', role: 'user'
      });
    });
    await assertFails(updateDoc(doc(dbFor('alice'), 'users', 'alice'), {
      role: 'admin'
    }));
    await assertFails(updateDoc(doc(dbFor('bob'), 'users', 'alice'), {
      name: 'Not Alice'
    }));
  });
});
