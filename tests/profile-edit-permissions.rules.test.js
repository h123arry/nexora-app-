import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction, deleteField } from 'firebase/firestore';

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
      name: identity.name,
      username: identity.username,
      pronouns: identity.pronouns,
      profileCategory: identity.profileCategory,
      creatorType: identity.creatorType,
      socialTwitter: identity.socialTwitter,
      socialInstagram: identity.socialInstagram
    }));

    const publicSnapshot = await getDoc(doc(db, 'publicProfiles', 'alice'));
    assert.equal(publicSnapshot.get('pronouns'), 'she/her');
    assert.equal(publicSnapshot.get('profileCategory'), 'Digital Creator');
    assert.equal(publicSnapshot.get('creatorType'), 'Premium creator');
    assert.equal(publicSnapshot.get('socialTwitter'), 'https://x.com/alice');
    assert.equal(publicSnapshot.get('socialInstagram'), 'https://instagram.com/alice');
  });


  it('allows the profile editor transaction to persist avatar and cover updates to both profile documents', async () => {
    await seed(async db => {
      await setDoc(doc(db, 'users', 'alice'), {
        id: 'alice', email: 'alice@example.test', username: 'alice', name: 'Alice',
        bio: '', avatar: '', location: '', website: '', coverImage: '',
        followers: 0, following: 0, sparks: 0, hasStory: false,
        joinedDate: 'Joined November 2026', reputationPoints: 0,
        reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
        skills: ['Community building']
      });
      await setDoc(doc(db, 'publicProfiles', 'alice'), {
        id: 'alice', username: 'alice', name: 'Alice', avatar: '', bio: '',
        website: '', followers: 0, following: 0, sparks: 0, coverImage: ''
      });
    });

    const db = dbFor('alice');
    await assertSucceeds(runTransaction(db, async transaction => {
      const privateRef = doc(db, 'users', 'alice');
      const publicRef = doc(db, 'publicProfiles', 'alice');
      const settingsRef = doc(db, 'users', 'alice', 'settings', 'preferences');
      const [privateSnapshot, settingsSnapshot] = await Promise.all([
        transaction.get(privateRef),
        transaction.get(settingsRef)
      ]);
      assert.equal(privateSnapshot.exists(), true);
      const updates = {
        avatar: 'https://media.example.test/alice-avatar.webp',
        coverImage: 'https://media.example.test/alice-cover.webp'
      };
      transaction.update(privateRef, { ...updates, updatedAt: serverTimestamp() });
      transaction.set(publicRef, {
        id: 'alice',
        username: 'alice',
        name: 'Alice',
        avatar: updates.avatar,
        bio: '',
        website: '',
        followers: 0,
        following: 0,
        sparks: 0,
        hasStory: privateSnapshot.get('hasStory'),
        joinedDate: privateSnapshot.get('joinedDate'),
        reputationPoints: privateSnapshot.get('reputationPoints'),
        reputationBreakdown: privateSnapshot.get('reputationBreakdown'),
        skills: privateSnapshot.get('skills'),
        coverImage: updates.coverImage,
        location: settingsSnapshot.get('privacy.profileVisibility.location') === 'everyone' ? '' : deleteField(),
        interestDNA: deleteField()
      }, { merge: true });
    }));

    const privateSnapshot = await getDoc(doc(db, 'users', 'alice'));
    const publicSnapshot = await getDoc(doc(db, 'publicProfiles', 'alice'));
    assert.equal(privateSnapshot.get('avatar'), 'https://media.example.test/alice-avatar.webp');
    assert.equal(privateSnapshot.get('coverImage'), 'https://media.example.test/alice-cover.webp');
    assert.equal(publicSnapshot.get('avatar'), 'https://media.example.test/alice-avatar.webp');
    assert.equal(publicSnapshot.get('coverImage'), 'https://media.example.test/alice-cover.webp');
    assert.equal(publicSnapshot.get('reputationPoints'), 0);
    assert.deepEqual(publicSnapshot.get('reputationBreakdown'), { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 });
    assert.deepEqual(publicSnapshot.get('skills'), ['Community building']);
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
