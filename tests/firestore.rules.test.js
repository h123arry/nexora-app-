import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

const projectId = 'demo-nexora-rules';
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') }
  });
});

after(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

const dbFor = (uid) => env.authenticatedContext(uid, { email: `${uid}@example.test`, email_verified: true }).firestore();
const guestDb = () => env.unauthenticatedContext().firestore();
const seed = async (callback) => env.withSecurityRulesDisabled(async (context) => callback(context.firestore()));

const profile = (uid) => ({
  id: uid, email: `${uid}@example.test`, username: uid, name: uid,
  role: 'user', bio: 'private account profile'
});
const publicProfile = (uid) => ({
  id: uid, username: uid, name: uid, avatar: '', bio: '', location: '', website: '',
  followers: 0, following: 0, sparks: 0, isVerified: false, coverImage: '', joinedDate: 'Joined 2026',
  reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
  interestDNA: {}, skills: []
});

 describe('Firestore authorization regression tests', () => {
  it('allows a user to create their own private/public profile pair but rejects spoofed identity and privilege fields', async () => {
    const ownPrivate = {
      id: 'alice', email: 'alice@example.test', username: 'alice', name: 'Alice',
      bio: '', avatar: '', location: '', website: '', followers: 0, following: 0,
      sparks: 0, isVerified: true, coverImage: '', joinedDate: 'Joined 2026',
      reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA: {}, skills: [], createdAt: new Date(), updatedAt: new Date()
    };
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'users', 'alice'), ownPrivate));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'publicProfiles', 'alice'), publicProfile('alice')));
    await assertFails(setDoc(doc(dbFor('bob'), 'users', 'bob'), { ...ownPrivate, id: 'bob', email: 'alice@example.test' }));
    await assertFails(setDoc(doc(dbFor('bob'), 'users', 'bob'), { ...ownPrivate, id: 'bob', email: 'bob@example.test', role: 'admin' }));
    await assertFails(setDoc(doc(dbFor('bob'), 'publicProfiles', 'bob'), { ...publicProfile('bob'), email: 'bob@example.test' }));
  });

  it('allows public posts and public profile projections without exposing private account records', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'posts', 'post-1'), { id: 'post-1', userId: 'alice', content: 'public' });
      await setDoc(doc(db, 'publicProfiles', 'alice'), publicProfile('alice'));
      await setDoc(doc(db, 'users', 'alice'), profile('alice'));
    });
    await assertSucceeds(getDoc(doc(guestDb(), 'posts', 'post-1')));
    await assertSucceeds(getDoc(doc(guestDb(), 'publicProfiles', 'alice')));
    await assertFails(getDoc(doc(guestDb(), 'users', 'alice')));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice')));
  });

  it('allows users to update their public bio but blocks changes to protected account fields and other accounts', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'alice'), profile('alice'));
      await setDoc(doc(db, 'publicProfiles', 'alice'), publicProfile('alice'));
    });
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'users', 'alice'), { bio: 'updated by owner' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'users', 'alice'), { role: 'admin' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'users', 'alice'), { email: 'attacker@example.test' }));
    await assertFails(updateDoc(doc(dbFor('bob'), 'users', 'alice'), { bio: 'intrusion' }));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'publicProfiles', 'alice'), { bio: 'public bio' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'publicProfiles', 'alice'), { email: 'leak@example.test' }));
  });

  it('denies cross-account user-directory queries against private account documents', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'alice'), profile('alice'));
      await setDoc(doc(db, 'users', 'bob'), profile('bob'));
    });
    await assertFails(getDocs(collection(dbFor('alice'), 'users')));
    await assertSucceeds(getDocs(query(collection(guestDb(), 'publicProfiles'), where('username', '==', 'alice'))));
  });

  it('restricts chat reads and writes to participants and binds message authorship to Firebase UID', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'chats', 'chat-1'), { id: 'chat-1', participants: ['alice', 'bob'], lastMessage: '' });
    });
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'chats', 'chat-1')));
    await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'chats'), where('participants', 'array-contains', 'alice'))));
    await assertFails(getDoc(doc(dbFor('mallory'), 'chats', 'chat-1')));
    await assertFails(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1'), { participants: ['alice', 'mallory'] }));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1'), { lastMessage: 'hello' }));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm1'), {
      id: 'm1', chatId: 'chat-1', senderId: 'alice', content: 'hello', status: 'sent'
    }));
    await assertFails(setDoc(doc(dbFor('mallory'), 'chats', 'chat-1', 'messages', 'm2'), {
      id: 'm2', chatId: 'chat-1', senderId: 'alice', content: 'forged', status: 'sent'
    }));
    await assertFails(getDocs(collection(dbFor('mallory'), 'chats', 'chat-1', 'messages')));
    await assertSucceeds(deleteDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm1')));
  });

  it('does not allow clients to forge notification recipients, security logs, or cross-account mail', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'notifications', 'fake'), { userId: 'victim', content: 'fake' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'securityLogs', 'fake'), { eventType: 'ADMIN_GRANTED' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'mail', 'fake'), {
      to: ['victim@example.test'], message: { subject: 'x', text: 'x' }
    }));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'mail', 'self'), {
      to: ['alice@example.test'], message: { subject: 'x', text: 'x' }
    }));
    await seed(async (db) => {
      await setDoc(doc(db, 'notifications', 'n1'), { userId: 'alice', isRead: false });
    });
    await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'notifications'), where('userId', '==', 'alice'))));
    await assertFails(getDoc(doc(dbFor('bob'), 'notifications', 'n1')));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'notifications', 'n1'), { isRead: true }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'notifications', 'n1'), { userId: 'bob' }));
  });

  it('permits append-only comments by their author but blocks forged comment authorship and counter edits', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'posts', 'p-comments'), { id: 'p-comments', userId: 'alice', commentsCount: 0, comments: [] });
    });
    const ownComment = { id: 'c1', postId: 'p-comments', userId: 'bob', username: 'bob', name: 'Bob', avatar: '', content: 'hello', timestamp: 'now', likes: 0 };
    await assertSucceeds(updateDoc(doc(dbFor('bob'), 'posts', 'p-comments'), { commentsCount: 1, comments: [ownComment] }));
    await assertFails(updateDoc(doc(dbFor('mallory'), 'posts', 'p-comments'), { likes: 1 }));
    const forged = { ...ownComment, id: 'c2', userId: 'alice' };
    await assertFails(updateDoc(doc(dbFor('bob'), 'posts', 'p-comments'), { commentsCount: 2, comments: [ownComment, forged] }));
  });

  it('rejects unauthenticated/forged post writes while preserving legitimate public reads and owner edits', async () => {
    const post = { id: 'p1', userId: 'alice', authorId: 'alice', content: 'hello', likes: 0 };
    await assertFails(setDoc(doc(guestDb(), 'posts', 'guest'), { ...post, userId: 'alice' }));
    await assertFails(setDoc(doc(dbFor('mallory'), 'posts', 'forged'), { ...post, userId: 'alice' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'inflated'), { ...post, id: 'inflated', likes: 500 }));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'posts', 'p1'), post));
    await assertSucceeds(getDoc(doc(guestDb(), 'posts', 'p1')));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'posts', 'p1'), { content: 'edited by owner' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'posts', 'p1'), { likes: 500 }));
    await assertFails(updateDoc(doc(dbFor('mallory'), 'posts', 'p1'), { content: 'hijacked' }));
    await assertFails(deleteDoc(doc(dbFor('mallory'), 'posts', 'p1')));
  });
});
