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
  it('blocks direct client identity changes while allowing other profile editor fields', async () => {
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

    await assertFails(updateDoc(doc(db, 'users', 'alice'), identity));
    await assertFails(updateDoc(doc(db, 'publicProfiles', 'alice'), {
      name: identity.name,
      username: identity.username
    }));
    await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), {
      pronouns: identity.pronouns,
      profileCategory: identity.profileCategory,
      creatorType: identity.creatorType,
      socialTwitter: identity.socialTwitter,
      socialInstagram: identity.socialInstagram,
      updatedAt: serverTimestamp()
    }));
    await assertSucceeds(updateDoc(doc(db, 'publicProfiles', 'alice'), {
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

  it('does not allow an owner to recreate a public profile with a forged name or username', async () => {
    await seed(async db => {
      await setDoc(doc(db, 'users', 'alice'), {
        id: 'alice', email: 'alice@example.test', username: 'alice', name: 'Alice',
        avatar: '', bio: '', location: '', website: '', followers: 0, following: 0, sparks: 0
      });
    });
    const db = dbFor('alice');
    await assertFails(setDoc(doc(db, 'publicProfiles', 'alice'), {
      id: 'alice', username: 'impersonator', name: 'Not Alice', avatar: '', bio: '',
      website: '', followers: 0, following: 0, sparks: 0
    }));
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

  it('allows owners to rebuild a missing public profile using real private counters without allowing forged counters', async () => {
    await seed(async db => {
      await setDoc(doc(db, 'users', 'alice'), {
        id: 'alice', email: 'alice@example.test', username: 'alice', name: 'Alice',
        bio: 'Existing bio', avatar: 'https://media.example.test/alice.webp',
        location: '', website: 'https://alice.example.test',
        coverImage: 'https://media.example.test/alice-cover.webp',
        followers: 42, following: 17, sparks: 125, hasStory: true,
        joinedDate: 'Joined November 2026', reputationPoints: 350,
        reputationBreakdown: { contributions: 150, helpfulness: 100, missionsCompleted: 50, skillsVerified: 50 },
        skills: ['Community building']
      });
      await setDoc(doc(db, 'users', 'bob'), {
        id: 'bob', email: 'bob@example.test', username: 'bob', name: 'Bob',
        bio: '', avatar: '', location: '', website: '', coverImage: '',
        followers: 7, following: 3, sparks: 9, hasStory: false,
        joinedDate: 'Joined November 2026', reputationPoints: 80,
        reputationBreakdown: { contributions: 30, helpfulness: 20, missionsCompleted: 20, skillsVerified: 10 },
        skills: []
      });
    });

    const aliceDb = dbFor('alice');
    await assertSucceeds(setDoc(doc(aliceDb, 'publicProfiles', 'alice'), {
      id: 'alice', username: 'alice', name: 'Alice',
      bio: 'Existing bio', avatar: 'https://media.example.test/alice.webp',
      website: 'https://alice.example.test', coverImage: 'https://media.example.test/alice-cover.webp',
      followers: 42, following: 17, sparks: 125, hasStory: true,
      joinedDate: 'Joined November 2026', reputationPoints: 350,
      reputationBreakdown: { contributions: 150, helpfulness: 100, missionsCompleted: 50, skillsVerified: 50 },
      skills: ['Community building']
    }));

    const bobDb = dbFor('bob');
    await assertFails(setDoc(doc(bobDb, 'publicProfiles', 'bob'), {
      id: 'bob', username: 'bob', name: 'Bob', bio: '', avatar: '', website: '', coverImage: '',
      followers: 999, following: 3, sparks: 9, hasStory: false,
      joinedDate: 'Joined November 2026', reputationPoints: 80,
      reputationBreakdown: { contributions: 30, helpfulness: 20, missionsCompleted: 20, skillsVerified: 10 },
      skills: []
    }));
  });

  it('allows early community members to update bio, avatar and cover without losing their protected recognition flag', async () => {
    await seed(async db => {
      await setDoc(doc(db, 'users', 'early-alice'), {
        id: 'early-alice', email: 'early-alice@example.test', username: 'early_alice', name: 'Early Alice',
        bio: '', avatar: '', location: '', website: '', coverImage: '',
        followers: 0, following: 0, sparks: 0, hasStory: false,
        joinedDate: 'Joined November 2026', reputationPoints: 0,
        reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
        skills: [], earlyCommunityMember: true
      });
      await setDoc(doc(db, 'publicProfiles', 'early-alice'), {
        id: 'early-alice', username: 'early_alice', name: 'Early Alice', avatar: '', bio: '',
        website: '', followers: 0, following: 0, sparks: 0, coverImage: '', earlyCommunityMember: true
      });
    });

    const db = dbFor('early-alice');
    await assertSucceeds(runTransaction(db, async transaction => {
      const privateRef = doc(db, 'users', 'early-alice');
      const publicRef = doc(db, 'publicProfiles', 'early-alice');
      const settingsRef = doc(db, 'users', 'early-alice', 'settings', 'preferences');
      const [privateSnapshot, settingsSnapshot] = await Promise.all([
        transaction.get(privateRef), transaction.get(settingsRef)
      ]);
      const updates = {
        avatar: 'https://media.example.test/early-avatar.webp',
        coverImage: 'https://media.example.test/early-cover.webp',
        bio: 'A recognised early NEXORA community member.'
      };
      transaction.update(privateRef, { ...updates, updatedAt: serverTimestamp() });
      transaction.set(publicRef, {
        id: 'early-alice',
        username: 'early_alice',
        name: 'Early Alice',
        ...updates,
        followers: 0,
        following: 0,
        sparks: 0,
        hasStory: false,
        joinedDate: 'Joined November 2026',
        reputationPoints: 0,
        reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
        skills: [],
        earlyCommunityMember: true,
        location: settingsSnapshot.get('privacy.profileVisibility.location') === 'everyone' ? '' : deleteField(),
        interestDNA: deleteField()
      }, { merge: true });
    }));

    const privateSnapshot = await getDoc(doc(db, 'users', 'early-alice'));
    const publicSnapshot = await getDoc(doc(db, 'publicProfiles', 'early-alice'));
    assert.equal(privateSnapshot.get('bio'), 'A recognised early NEXORA community member.');
    assert.equal(publicSnapshot.get('avatar'), 'https://media.example.test/early-avatar.webp');
    assert.equal(publicSnapshot.get('coverImage'), 'https://media.example.test/early-cover.webp');
    assert.equal(publicSnapshot.get('earlyCommunityMember'), true);
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
