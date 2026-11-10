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
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch
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
const recentlyAuthenticatedDbFor = (uid, ageSeconds = 0) => env.authenticatedContext(uid, {
  email: `${uid}@example.test`, email_verified: true, auth_time: Math.floor(Date.now() / 1000) - ageSeconds
}).firestore();
const guestDb = () => env.unauthenticatedContext().firestore();
const unverifiedDbFor = (uid) => env.authenticatedContext(uid, { email: `${uid}@example.test`, email_verified: false, phone_number_verified: false }).firestore();
const seed = async (callback) => env.withSecurityRulesDisabled(async (context) => callback(context.firestore()));

const profile = (uid) => ({
  id: uid, email: `${uid}@example.test`, username: uid, name: uid,
  role: 'user', bio: 'private account profile'
});
const publicProfile = (uid) => ({
  id: uid, username: uid, name: uid, avatar: '', bio: '', location: '', website: '',
  followers: 0, following: 0, sparks: 0, isVerified: false, coverImage: '', joinedDate: 'Joined 2026',
  reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
  skills: []
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
    await assertFails(setDoc(doc(dbFor('bob'), 'publicProfiles', 'bob'), { ...publicProfile('bob'), interestDNA: { AI: 1 } }));
  });

  it('rejects client-assigned public verification, reputation, and initial engagement metrics', async () => {
    const unverifiedDb = unverifiedDbFor('unverified');
    const unverifiedProfile = { ...publicProfile('unverified'), isVerified: false };
    await assertSucceeds(setDoc(doc(unverifiedDb, 'publicProfiles', 'unverified'), unverifiedProfile));
    await assertFails(setDoc(doc(unverifiedDb, 'publicProfiles', 'forged-badge'), {
      ...publicProfile('forged-badge'), id: 'forged-badge', isVerified: true
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'publicProfiles', 'inflated-reputation'), {
      ...publicProfile('inflated-reputation'), id: 'inflated-reputation', reputationPoints: 50000
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'publicProfiles', 'inflated-breakdown'), {
      ...publicProfile('inflated-breakdown'), id: 'inflated-breakdown',
      reputationBreakdown: { contributions: 10, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 }
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'publicProfiles', 'fake-followers'), {
      ...publicProfile('fake-followers'), id: 'fake-followers', followers: 900000
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'inflated-reputation'), {
      ...profile('inflated-reputation'), reputationPoints: 50000
    }));
    await assertFails(setDoc(doc(unverifiedDb, 'users', 'forged-badge'), {
      id: 'forged-badge', email: 'unverified@example.test', username: 'unverified', name: 'Unverified', isVerified: true,
      reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 }
    }));
  });

  it('prevents profile owners from forging follower and following totals after creation', async () => {
    const alice = dbFor('alice');
    await assertSucceeds(setDoc(doc(alice, 'publicProfiles', 'alice'), publicProfile('alice')));
    await assertFails(updateDoc(doc(alice, 'publicProfiles', 'alice'), { followers: 900000 }));
    await seed(async adminDb => setDoc(doc(adminDb, 'users', 'alice'), {
      id: 'alice', username: 'alice', name: 'Alice', followers: 0, following: 0
    }));
    await assertFails(updateDoc(doc(alice, 'users', 'alice'), { following: 900000 }));
  });

  it('keeps creator audience aggregates and visitor history server-owned', async () => {
    const alice = dbFor('alice');
    for (const collectionName of ['creatorAudienceDaily', 'creatorAudienceEventReceipts', 'creatorFollowProjections', 'creatorProfileDailyVisitors', 'creatorProfileVisitorHistory']) {
      await assertFails(setDoc(doc(alice, collectionName, 'forged'), { creatorId: 'alice', follows: 999999 }));
      await assertFails(getDoc(doc(alice, collectionName, 'forged')));
    }
  });

  it('protects canonical username claims from collisions and forged ownership', async () => {
    const claim = {
      userId: 'alice', username: 'alice_handle',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    };
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'usernames', 'alice_handle'), claim));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'usernames', 'alice_handle')));
    await assertFails(setDoc(doc(dbFor('bob'), 'usernames', 'alice_handle'), { ...claim, userId: 'bob' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'usernames', 'other_handle'), { ...claim, username: 'wrong_handle' }));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'usernames', 'alice_handle'), { updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'usernames', 'alice_handle'), { username: 'renamed' }));
    await assertFails(deleteDoc(doc(dbFor('bob'), 'usernames', 'alice_handle')));
    await assertSucceeds(deleteDoc(doc(dbFor('alice'), 'usernames', 'alice_handle')));
  });

  it('allows public posts and public profile projections without exposing private account records', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'posts', 'post-1'), { id: 'post-1', userId: 'alice', audience: 'public', content: 'public' });
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
      await setDoc(doc(db, 'publicProfiles', 'alice'), { ...publicProfile('alice'), interestDNA: { AI: 0.9 } });
    });
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'users', 'alice'), { bio: 'updated by owner' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'users', 'alice'), { role: 'admin' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'users', 'alice'), { email: 'attacker@example.test' }));
    await assertFails(updateDoc(doc(dbFor('bob'), 'users', 'alice'), { bio: 'intrusion' }));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'publicProfiles', 'alice'), { bio: 'public bio' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'publicProfiles', 'alice'), { email: 'leak@example.test' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'publicProfiles', 'alice'), { interestDNA: { AI: 0.1 } }));
    await assertSucceeds(setDoc(
      doc(dbFor('alice'), 'publicProfiles', 'alice'),
      { interestDNA: deleteField() },
      { merge: true }
    ));
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
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'client-group-chat'), {
      id: 'client-group-chat', participants: ['alice', 'bob', 'charlie'], isGroup: true, ownerId: 'alice', lastMessage: ''
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'duplicate-direct-chat'), {
      id: 'duplicate-direct-chat', participants: ['alice', 'alice'], lastMessage: ''
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1'), { participants: ['alice', 'mallory'] }));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1'), { lastMessage: 'hello' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1'), { lastMessage: 'x'.repeat(10001) }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1'), { unreadCount: -1 }));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm1'), {
      id: 'm1', chatId: 'chat-1', senderId: 'alice', content: 'hello', status: 'sent', timestamp: new Date().toISOString()
    }));
    await assertSucceeds(updateDoc(doc(dbFor('bob'), 'chats', 'chat-1', 'messages', 'm1'), { status: 'read' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm1'), { status: 'read' }));
    await assertSucceeds(setDoc(doc(dbFor('bob'), 'chats', 'chat-1', 'typing', 'bob'), {
      state: 'typing', updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'typing', 'bob'), {
      state: 'typing', updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('mallory'), 'chats', 'chat-1', 'messages', 'm2'), {
      id: 'm2', chatId: 'chat-1', senderId: 'alice', content: 'forged', status: 'sent'
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm2'), {
      id: 'm2', chatId: 'chat-1', senderId: 'alice', content: 'forged read', status: 'read', timestamp: new Date().toISOString()
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm2'), {
      id: 'm2', chatId: 'chat-1', senderId: 'alice', content: 'x'.repeat(10001), status: 'sent', timestamp: new Date().toISOString()
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm2'), {
      id: 'm2', chatId: 'chat-1', senderId: 'alice', content: 'forged media', status: 'sent',
      timestamp: new Date().toISOString(),
      voiceAudioUrl: `chats/chat-1/audio/bob/${'a'.repeat(36)}`
    }));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm3'), {
      id: 'm3', chatId: 'chat-1', senderId: 'alice', content: '[VOICE]', status: 'sent',
      timestamp: new Date().toISOString(),
      voiceAudioUrl: `chats/chat-1/audio/alice/${'a'.repeat(36)}`, voiceDuration: '3s', fileName: 'recording.webm',
      customMediaType: 'voice'
    }));
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'bob', 'settings', 'preferences'), {
        privacy: {}, notifications: {}, appearance: {}, content: {}, feed: {}, security: {},
        messaging: { mutedChatIds: [], blockedUserIds: ['alice'] }
      });
    });
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm-blocked'), {
      id: 'm-blocked', chatId: 'chat-1', senderId: 'alice', content: 'blocked sender', status: 'sent',
      timestamp: new Date().toISOString()
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1'), { lastMessage: 'blocked sender metadata' }));
    await assertSucceeds(setDoc(doc(dbFor('bob'), 'chats', 'chat-1', 'messages', 'm-from-blocker'), {
      id: 'm-from-blocker', chatId: 'chat-1', senderId: 'bob', content: 'blocker can still send', status: 'sent',
      timestamp: new Date().toISOString()
    }));
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'bob', 'settings', 'preferences'), {
        privacy: { allowDms: false }, notifications: {}, appearance: {}, content: {}, feed: {}, security: {},
        messaging: { mutedChatIds: [], blockedUserIds: [] }
      });
    });
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-opted-out'), {
      id: 'chat-opted-out', participants: ['alice', 'bob'], lastMessage: ''
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm-opted-out'), {
      id: 'm-opted-out', chatId: 'chat-1', senderId: 'alice', content: 'recipient disabled DMs', status: 'sent',
      timestamp: new Date().toISOString()
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'chats', 'chat-1'), { lastMessage: 'recipient disabled DMs' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm4'), {
      id: 'm4', chatId: 'chat-1', senderId: 'alice', content: 'still sending', status: 'sending',
      timestamp: new Date().toISOString()
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm5'), {
      id: 'm5', chatId: 'chat-1', senderId: 'alice', content: 'unsupported attachment', status: 'sent',
      timestamp: new Date().toISOString(), customMediaType: 'video'
    }));
    await assertFails(getDocs(collection(dbFor('mallory'), 'chats', 'chat-1', 'messages')));
    await assertSucceeds(deleteDoc(doc(dbFor('alice'), 'chats', 'chat-1', 'messages', 'm1')));
  });

  it('allows group members to message but reserves group deletion for its owner', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'chats', 'server-group-chat'), {
        id: 'server-group-chat', participants: ['alice', 'bob', 'charlie'],
        isGroup: true, ownerId: 'alice', partnerName: 'Test Group', lastMessage: ''
      });
    });
    await assertSucceeds(setDoc(doc(dbFor('bob'), 'chats', 'server-group-chat', 'messages', 'group-message'), {
      id: 'group-message', chatId: 'server-group-chat', senderId: 'bob',
      content: 'Hello group', status: 'sent', timestamp: new Date().toISOString()
    }));
    await assertFails(deleteDoc(doc(dbFor('bob'), 'chats', 'server-group-chat')));
    await assertSucceeds(deleteDoc(doc(dbFor('alice'), 'chats', 'server-group-chat')));
  });

  it('allows creators to list only their own uploaded media assets', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'mediaAssets', 'alice-media'), {
        id: 'alice-media', ownerId: 'alice', storagePath: 'users/alice/media/alice-media',
        kind: 'image', contentType: 'image/png', size: 1024, status: 'uploaded',
        createdAt: Timestamp.now(), updatedAt: Timestamp.now()
      });
    });
    await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'mediaAssets'), where('ownerId', '==', 'alice'))));
    await assertFails(getDocs(query(collection(dbFor('alice'), 'mediaAssets'), where('ownerId', '==', 'bob'))));
    await assertFails(getDoc(doc(dbFor('bob'), 'mediaAssets', 'alice-media')));
  });

  it('lets owners clean up only abandoned pending media upload intents', async () => {
    const pendingRef = doc(dbFor('alice'), 'mediaAssets', 'alice-pending');
    await assertSucceeds(setDoc(pendingRef, {
      id: 'alice-pending',
      ownerId: 'alice',
      storagePath: 'users/alice/media/alice-pending',
      kind: 'image',
      contentType: 'image/png',
      size: 1024,
      status: 'pending_upload',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(pendingRef));
    await assertFails(getDoc(doc(dbFor('bob'), 'mediaAssets', 'alice-pending')));
    await assertFails(updateDoc(pendingRef, { status: 'ready' }));
    await assertFails(deleteDoc(doc(dbFor('bob'), 'mediaAssets', 'alice-pending')));
    await assertSucceeds(deleteDoc(pendingRef));

    await seed(async (db) => {
      await setDoc(doc(db, 'mediaAssets', 'alice-uploaded'), {
        id: 'alice-uploaded',
        ownerId: 'alice',
        storagePath: 'users/alice/media/alice-uploaded',
        kind: 'image',
        contentType: 'image/png',
        size: 1024,
        status: 'uploaded',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    });
    await assertFails(deleteDoc(doc(dbFor('alice'), 'mediaAssets', 'alice-uploaded')));
  });

  it('stores inbox organisation preferences per account and only for chats the user belongs to', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'chats', 'chat-1'), { participants: ['alice', 'bob'], lastMessage: '' });
    });
    const preference = doc(dbFor('alice'), 'users', 'alice', 'inboxPreferences', 'chat-1');
    await assertSucceeds(setDoc(preference, {
      chatId: 'chat-1', pinned: true, archived: false, updatedAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(preference));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'inboxPreferences', 'chat-1')));
    await assertFails(setDoc(doc(dbFor('mallory'), 'users', 'mallory', 'inboxPreferences', 'chat-1'), {
      chatId: 'chat-1', pinned: true, archived: false, updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'inboxPreferences', 'not-a-member-chat'), {
      chatId: 'not-a-member-chat', pinned: true, archived: false, updatedAt: serverTimestamp()
    }));
  });

  it('stores creator drafts per account and validates draft metadata', async () => {
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'drafts', 'draft-1'), {
      userId: 'alice', caption: 'A creator draft', videoUrl: '', type: 'text', tags: ['nexora'], updatedAt: serverTimestamp()
    }));
    await assertFails(getDoc(doc(dbFor('bob'), 'drafts', 'draft-1')));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'drafts', 'draft-1'), {
      caption: 'Updated draft', tags: ['nexora', 'creator'], updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'drafts', 'draft-1'), { type: 'scheduled' }));
    await assertFails(deleteDoc(doc(dbFor('bob'), 'drafts', 'draft-1')));
    await assertSucceeds(deleteDoc(doc(dbFor('alice'), 'drafts', 'draft-1')));
  });

  it('does not allow clients to forge notification recipients, security logs, or cross-account mail', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'notifications', 'fake'), { userId: 'victim', content: 'fake' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'securityLogs', 'fake'), { eventType: 'ADMIN_GRANTED' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'mail', 'fake'), {
      to: ['victim@example.test'], message: { subject: 'x', text: 'x' }
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'mail', 'self'), {
      to: ['alice@example.test'], message: { subject: 'x', text: 'x' }
    }));
    await seed(async (db) => {
      await setDoc(doc(db, 'notifications', 'n1'), { userId: 'alice', isRead: false });
    });
    await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'notifications'), where('userId', '==', 'alice'))));
    await assertFails(getDocs(collection(dbFor('alice'), 'notifications')));
    await assertFails(getDoc(doc(dbFor('bob'), 'notifications', 'n1')));
    await assertFails(updateDoc(doc(dbFor('bob'), 'notifications', 'n1'), { isRead: true }));
    await assertFails(deleteDoc(doc(dbFor('bob'), 'notifications', 'n1')));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'notifications', 'n1'), { isRead: true }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'notifications', 'n1'), { userId: 'bob' }));
  });

  it('permits append-only comments by their author but blocks forged comment authorship and counter edits', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'posts', 'p-comments'), { id: 'p-comments', userId: 'alice', audience: 'public', commentsCount: 0, comments: [] });
    });
    const ownComment = { id: 'c1', postId: 'p-comments', userId: 'bob', username: 'bob', name: 'Bob', avatar: '', content: 'hello', timestamp: 'now', likes: 0 };
    await assertSucceeds(updateDoc(doc(dbFor('bob'), 'posts', 'p-comments'), { commentsCount: 1, comments: [ownComment] }));
    await assertFails(updateDoc(doc(dbFor('mallory'), 'posts', 'p-comments'), { likes: 1 }));
    const forged = { ...ownComment, id: 'c2', userId: 'alice' };
    await assertFails(updateDoc(doc(dbFor('bob'), 'posts', 'p-comments'), { commentsCount: 2, comments: [ownComment, forged] }));
  });

  it('rejects unauthenticated/forged post writes while preserving legitimate public reads and owner edits', async () => {
    const post = { id: 'p1', userId: 'alice', authorId: 'alice', audience: 'public', content: 'hello', likes: 0 };
    await assertFails(setDoc(doc(guestDb(), 'posts', 'guest'), { ...post, userId: 'alice' }));
    await assertFails(setDoc(doc(dbFor('mallory'), 'posts', 'forged'), { ...post, userId: 'alice' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'inflated'), { ...post, id: 'inflated', likes: 500 }));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'posts', 'p1'), post));
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'private-field'), { ...post, id: 'private-field', email: 'private@example.test' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'admin-field'), { ...post, id: 'admin-field', role: 'admin' }));
    await assertFails(setDoc(doc(unverifiedDbFor('alice'), 'posts', 'unverified-badge'), {
      ...post, id: 'unverified-badge', isVerified: true
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'forged-poll'), {
      ...post, id: 'forged-poll', interactivePoll: {
        question: 'Forged votes?', options: [
          { id: 'yes', text: 'Yes', votes: 900 }, { id: 'no', text: 'No', votes: 0 }
        ]
      }
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'forged-broadcast'), {
      ...post, id: 'forged-broadcast', broadcastReactions: { '🔥': 99 }
    }));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'posts', 'valid-poll'), {
      ...post, id: 'valid-poll', interactivePoll: {
        question: 'Valid poll?', options: [
          { id: 'yes', text: 'Yes', votes: 0 }, { id: 'no', text: 'No', votes: 0 }
        ]
      }
    }));
    await seed(async (db) => {
      await setDoc(doc(db, 'accountStatus', 'alice'), {
        accountId: 'alice', postingRestricted: true, messagingRestricted: false, suspended: false,
        expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000)
      });
    });
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'p2'), { ...post, id: 'p2' }));
    await seed(async (db) => {
      await setDoc(doc(db, 'accountStatus', 'alice'), {
        accountId: 'alice', postingRestricted: true, messagingRestricted: false, suspended: false,
        expiresAt: Timestamp.fromMillis(Date.now() - 60 * 1000)
      });
    });
    await assertSucceeds(getDoc(doc(guestDb(), 'posts', 'p1')));
    await assertSucceeds(getDocs(query(collection(guestDb(), 'posts'), where('audience', '==', 'public'))));
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'only-me'), { ...post, id: 'only-me', audience: 'onlyme' }));
    await seed(async (db) => {
      await setDoc(doc(db, 'posts', 'legacy-private'), { id: 'legacy-private', userId: 'alice', audience: 'onlyme', content: 'private' });
    });
    await assertFails(getDoc(doc(guestDb(), 'posts', 'legacy-private')));
    await assertFails(getDocs(query(collection(guestDb(), 'posts'), where('audience', '==', 'onlyme'))));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'posts', 'p1'), { content: 'edited by owner' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'posts', 'p1'), { audience: 'onlyme' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'posts', 'p1'), { likes: 500 }));
    await assertFails(updateDoc(doc(dbFor('mallory'), 'posts', 'p1'), { content: 'hijacked' }));
    await assertFails(deleteDoc(doc(dbFor('mallory'), 'posts', 'p1')));
  });

  it('restricts stories to authenticated readers, validates media stories, expires active reads, and protects viewer records', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'publicProfiles', 'alice'), publicProfile('alice'));
    });
    const story = {
      id: 'story-1', userId: 'alice', name: 'alice', username: 'alice', avatar: '',
      caption: 'A real text update', mediaType: 'text', privacy: 'everyone',
      createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 23 * 60 * 60 * 1000)
    };

    await assertSucceeds(setDoc(doc(dbFor('alice'), 'stories', 'story-1'), story));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'stories', 'story-media'), {
      ...story,
      id: 'story-media',
      mediaType: 'image',
      caption: '',
      mediaUrl: 'https://firebasestorage.googleapis.com/v0/b/demo/o/users%2Falice%2Fmedia%2Fstory-media',
      storagePath: 'users/alice/media/story-media',
      mediaId: 'story-media',
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'stories', 'spoofed'), { ...story, id: 'spoofed' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'stories', 'forged-metrics'), { ...story, id: 'forged-metrics', views: 500 }));
    await assertFails(setDoc(doc(dbFor('alice'), 'stories', 'forged-media-id'), {
      ...story, id: 'forged-media-id', mediaType: 'image', caption: '',
      mediaUrl: 'https://example.test/story', storagePath: 'users/alice/media/other', mediaId: 'other'
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'stories', 'too-long'), { ...story, id: 'too-long', caption: 'x'.repeat(501) }));
    await assertFails(getDoc(doc(guestDb(), 'stories', 'story-1')));
    await assertSucceeds(getDocs(query(
      collection(dbFor('bob'), 'stories'),
      where('privacy', '==', 'everyone'),
      where('expiresAt', '>', Timestamp.now())
    )));
    await assertSucceeds(setDoc(doc(dbFor('bob'), 'stories', 'story-1', 'views', 'bob'), {
      storyId: 'story-1', viewerId: 'bob', createdAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'stories', 'story-1', 'views', 'bob')));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'stories', 'story-1', 'views')));
    await assertSucceeds(setDoc(doc(dbFor('bob'), 'stories', 'story-1', 'reactions', 'bob'), {
      storyId: 'story-1', userId: 'bob', emoji: '🔥', updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('mallory'), 'stories', 'story-1', 'reactions', 'bob'), {
      storyId: 'story-1', userId: 'bob', emoji: '🔥', updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'stories', 'story-1', 'reactions', 'bob'), {
      storyId: 'story-1', userId: 'alice', emoji: '🔥', updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'stories', 'story-1', 'reactions', 'bob'), {
      storyId: 'story-1', userId: 'bob', emoji: '💣', updatedAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'stories', 'story-1', 'reactions', 'bob')));
    await assertFails(getDoc(doc(dbFor('mallory'), 'stories', 'story-1', 'reactions', 'bob')));
    await assertSucceeds(setDoc(doc(dbFor('bob'), 'stories', 'story-1', 'replies', 'reply-bob'), {
      storyId: 'story-1', authorId: 'bob', authorName: 'Bob', message: 'Great moment!', createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'stories', 'story-1', 'replies', 'reply-forged'), {
      storyId: 'story-1', authorId: 'alice', authorName: 'Alice', message: 'Forged', createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'stories', 'story-1', 'replies', 'reply-too-long'), {
      storyId: 'story-1', authorId: 'bob', authorName: 'Bob', message: 'x'.repeat(501), createdAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'stories', 'story-1', 'replies', 'reply-bob')));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'stories', 'story-1', 'replies', 'reply-bob')));
    await assertFails(getDoc(doc(dbFor('mallory'), 'stories', 'story-1', 'replies', 'reply-bob')));

    await assertFails(getDoc(doc(dbFor('bob'), 'stories', 'story-1', 'views', 'bob')));
    await assertFails(getDocs(collection(dbFor('bob'), 'stories', 'story-1', 'views')));
    await assertFails(setDoc(doc(dbFor('mallory'), 'stories', 'story-1', 'views', 'bob'), {
      storyId: 'story-1', viewerId: 'bob', createdAt: serverTimestamp()
    }));
    await seed(async (db) => {
      await setDoc(doc(db, 'stories', 'expired-story'), {
        ...story, id: 'expired-story', createdAt: Timestamp.fromMillis(Date.now() - 25 * 60 * 60 * 1000), expiresAt: Timestamp.fromMillis(Date.now() - 60 * 60 * 1000)
      });
    });
    await assertFails(getDoc(doc(dbFor('bob'), 'stories', 'expired-story')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'stories', 'expired-story')));
    await assertFails(deleteDoc(doc(dbFor('bob'), 'stories', 'story-1')));
    await assertFails(updateDoc(doc(dbFor('alice'), 'stories', 'story-1'), { caption: 'Changed after publishing' }));
    await assertSucceeds(deleteDoc(doc(dbFor('alice'), 'stories', 'story-1')));
  });

  it('binds Pages and Communities to their owner and document ID, and prevents client-assigned Page verification', async () => {
    const page = { id: 'page-alice', ownerId: 'alice', name: 'Alice Studio', isVerified: false };
    const community = { id: 'community-alice', ownerId: 'alice', name: 'Alice Community', type: 'public' };

    await assertSucceeds(setDoc(doc(dbFor('alice'), 'pages', page.id), page));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'communities', community.id), community));
    await assertSucceeds(getDoc(doc(guestDb(), 'pages', page.id)));
    await assertSucceeds(getDoc(doc(guestDb(), 'communities', community.id)));
    await assertFails(setDoc(doc(dbFor('alice'), 'pages', 'mismatched-page'), page));
    await assertFails(setDoc(doc(dbFor('alice'), 'pages', 'inflated-page'), {
      ...page, id: 'inflated-page', followersCount: 50000
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'communities', 'mismatched-community'), community));
    await assertFails(setDoc(doc(dbFor('alice'), 'communities', 'public-report-leak'), {
      id: 'public-report-leak', ownerId: 'alice', type: 'public', name: 'Open',
      reports: [{ targetContent: 'private report text', status: 'pending' }]
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'communities', 'public-role-injection'), {
      id: 'public-role-injection', ownerId: 'alice', type: 'public', name: 'Open', role: 'admin'
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'pages', 'forged-page'), { ...page, id: 'forged-page' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'pages', page.id), { isVerified: true }));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'pages', page.id), { name: 'Updated Studio' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'pages', page.id), { followersCount: 50000 }));
    await assertFails(updateDoc(doc(dbFor('bob'), 'communities', community.id), { name: 'Hijacked' }));
  });

  it('scopes moderation reports and appeals to their owner and rejects forged review state', async () => {
    const report = {
      reporterId: 'alice', targetType: 'post', targetId: 'post-1', reason: 'Spam: repeated links',
      status: 'pending', policyVersion: '2026-10', source: 'client-report', createdAt: serverTimestamp()
    };
    await seed(async (db) => {
      await setDoc(doc(db, 'moderationReports', 'report-1'), report);
    });
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'moderationReports', 'report-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'moderationReports', 'report-1')));
    await assertFails(setDoc(doc(dbFor('bob'), 'moderationReports', 'report-2'), report));
    await assertFails(setDoc(doc(dbFor('alice'), 'moderationReports', 'report-3'), { ...report, status: 'resolved' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'moderationReports', 'report-4'), { ...report, targetType: 'account' }));

    const appeal = {
      userId: 'alice', targetType: 'post', targetId: 'post-1', reason: 'This content is original and complies with the policy.',
      status: 'pending', policyVersion: '2026-10', createdAt: serverTimestamp()
    };
    await seed(async (db) => {
      await setDoc(doc(db, 'moderationAppeals', 'appeal-1'), appeal);
    });
    await assertFails(getDoc(doc(dbFor('bob'), 'moderationAppeals', 'appeal-1')));
    await assertFails(updateDoc(doc(dbFor('alice'), 'moderationAppeals', 'appeal-1'), { status: 'approved' }));
  });

  it('allows an account owner to create and read a pending deletion request but never complete it client-side', async () => {
    const deletionRequest = {
      type: 'delete_account',
      requesterId: 'alice',
      status: 'pending',
      policyVersion: '2026-10',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      retentionNote: 'Cleanup is asynchronous and may be limited by backups.'
    };
    await assertFails(setDoc(doc(dbFor('alice'), 'accountLifecycleRequests', 'delete-no-auth-time'), deletionRequest));
    await assertFails(setDoc(doc(recentlyAuthenticatedDbFor('alice', 301), 'accountLifecycleRequests', 'delete-stale'), deletionRequest));
    const freshDb = recentlyAuthenticatedDbFor('alice');
    await assertSucceeds(setDoc(doc(freshDb, 'accountLifecycleRequests', 'delete-1'), deletionRequest));
    await assertSucceeds(getDoc(doc(freshDb, 'accountLifecycleRequests', 'delete-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'accountLifecycleRequests', 'delete-1')));
    await assertFails(setDoc(doc(dbFor('bob'), 'accountLifecycleRequests', 'delete-2'), deletionRequest));
    await assertFails(updateDoc(doc(dbFor('alice'), 'accountLifecycleRequests', 'delete-1'), { status: 'completed' }));
    await assertFails(deleteDoc(doc(dbFor('alice'), 'accountLifecycleRequests', 'delete-1')));
  });
  it('limits follow-graph reads to edges involving the requesting user', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'follows', 'a-b'), { followerId: 'alice', followingId: 'bob', createdAt: new Date() });
      await setDoc(doc(db, 'follows', 'c-d'), { followerId: 'carol', followingId: 'dave', createdAt: new Date() });
    });
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'follows', 'a-b')));
    await assertFails(getDoc(doc(dbFor('alice'), 'follows', 'c-d')));
    await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'follows'), where('followerId', '==', 'alice'))));
    await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'follows'), where('followingId', '==', 'alice'))));
    await assertFails(getDocs(collection(dbFor('alice'), 'follows')));
    await assertFails(getDocs(query(collection(dbFor('alice'), 'follows'), where('followerId', '==', 'carol'))));
  });
  it('requires trusted transactions for follow writes while preserving participant-scoped reads', async () => {
    const followRef = doc(dbFor('alice'), 'follows', 'alice_bob');
    await assertFails(setDoc(followRef, {
      followerId: 'alice', followingId: 'bob', createdAt: serverTimestamp()
    }));
    await seed(async adminDb => setDoc(doc(adminDb, 'follows', 'alice_bob'), {
      followerId: 'alice', followingId: 'bob', createdAt: new Date()
    }));
    await assertSucceeds(getDoc(followRef));
    await assertFails(updateDoc(followRef, { createdAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor('bob'), 'follows', 'alice_bob'), { createdAt: serverTimestamp() }));
    await assertFails(deleteDoc(followRef));
  });
  it('allows only owner-scoped preference settings with a bounded top-level contract', async () => {
    const preferences = {
      privacy: { isPrivateAccount: false, allowDms: true },
      notifications: { pushEnabled: true },
      appearance: { theme: 'stealth-dark' },
      content: { contentPreferences: ['AI'], sensitiveContentFilter: true },
      feed: { tab: 'posts', notInterestedTags: ['spam'], mutedCreatorIds: [], hiddenPostIds: [], seenPostIds: [] },
      security: { twoFactorEnabled: false },
      updatedAt: serverTimestamp()
    };
    const ownerRef = doc(dbFor('alice'), 'users', 'alice', 'settings', 'preferences');
    await assertSucceeds(setDoc(ownerRef, preferences));
    await assertSucceeds(getDoc(ownerRef));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'users', 'alice', 'settings')));
    await assertFails(getDocs(collection(dbFor('bob'), 'users', 'alice', 'settings')));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'settings', 'preferences')));
    await assertFails(setDoc(doc(dbFor('bob'), 'users', 'alice', 'settings', 'preferences'), preferences));
    await assertFails(updateDoc(ownerRef, { injectedPrivilege: true }));
  });
  it('keeps legacy top-level privacy settings accessible only to their owner', async () => {
    const ownerRef = doc(dbFor('alice'), 'privacySettings', 'alice');
    await assertSucceeds(setDoc(ownerRef, { userId: 'alice', isPrivate: true, commentPermission: 'followers' }));
    await assertSucceeds(getDoc(ownerRef));
    await assertFails(getDoc(doc(dbFor('bob'), 'privacySettings', 'alice')));
    await assertFails(setDoc(doc(dbFor('bob'), 'privacySettings', 'alice'), {
      userId: 'alice', isPrivate: false, commentPermission: 'everyone'
    }));
    await assertFails(getDoc(doc(guestDb(), 'privacySettings', 'alice')));
  });
  it('scopes notification reads, read-state updates, and deletion to the owning account', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'alice', 'notifications', 'notice-1'), {
        userId: 'alice', type: 'system', username: 'NEXORA', content: 'Welcome', isRead: false,
        timestamp: new Date().toISOString()
      });
    });
    const ownNotification = doc(dbFor('alice'), 'users', 'alice', 'notifications', 'notice-1');
    await assertSucceeds(getDoc(ownNotification));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'users', 'alice', 'notifications')));
    await assertSucceeds(updateDoc(ownNotification, { isRead: true }));
    await assertSucceeds(updateDoc(ownNotification, { isRead: false }));
    await assertFails(updateDoc(ownNotification, { isRead: 'yes' }));
    await assertFails(updateDoc(ownNotification, { content: 'tampered' }));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'notifications', 'notice-1')));
    await assertFails(deleteDoc(doc(dbFor('bob'), 'users', 'alice', 'notifications', 'notice-1')));
    await assertSucceeds(deleteDoc(ownNotification));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'notifications', 'forged'), {
      userId: 'alice', type: 'system', content: 'Forged', isRead: false
    }));
  });
  it('applies notification bulk batches atomically under owner-only rules', async () => {
    await seed(async (db) => {
      for (const id of ['notice-a', 'notice-b']) {
        await setDoc(doc(db, 'users', 'alice', 'notifications', id), {
          userId: 'alice', type: 'system', username: 'NEXORA', content: id, isRead: false,
          timestamp: new Date().toISOString()
        });
      }
      await setDoc(doc(db, 'users', 'bob', 'notifications', 'notice-private'), {
        userId: 'bob', type: 'system', username: 'NEXORA', content: 'Private', isRead: false,
        timestamp: new Date().toISOString()
      });
    });

    const aliceDb = dbFor('alice');
    const first = doc(aliceDb, 'users', 'alice', 'notifications', 'notice-a');
    const second = doc(aliceDb, 'users', 'alice', 'notifications', 'notice-b');
    const foreign = doc(aliceDb, 'users', 'bob', 'notifications', 'notice-private');

    const rejectedBatch = writeBatch(aliceDb);
    rejectedBatch.update(first, { isRead: true });
    rejectedBatch.update(foreign, { isRead: true });
    await assertFails(rejectedBatch.commit());
    assert.equal((await getDoc(first)).data().isRead, false, 'a rejected batch must not partially update owned records');

    const readBatch = writeBatch(aliceDb);
    readBatch.update(first, { isRead: true });
    readBatch.update(second, { isRead: true });
    await assertSucceeds(readBatch.commit());
    assert.equal((await getDoc(first)).data().isRead, true);
    assert.equal((await getDoc(second)).data().isRead, true);

    const deleteBatch = writeBatch(aliceDb);
    deleteBatch.delete(first);
    deleteBatch.delete(second);
    await assertSucceeds(deleteBatch.commit());
    assert.equal((await getDoc(first)).exists(), false);
    assert.equal((await getDoc(second)).exists(), false);
  });

  it('keeps recent search history private and owner-managed', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'alice', 'searchHistory', 'nexora'), {
        term: 'NEXORA', updatedAt: new Date()
      });
    });
    const ownSearch = doc(dbFor('alice'), 'users', 'alice', 'searchHistory', 'nexora');
    await assertSucceeds(getDoc(ownSearch));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'users', 'alice', 'searchHistory')));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'searchHistory', 'nexora')));
    await assertFails(getDocs(collection(dbFor('bob'), 'users', 'alice', 'searchHistory')));
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'users', 'alice', 'searchHistory', 'instagram'), {
      term: 'Instagram', updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'searchHistory', 'invalid'), {
      term: 'x', updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'users', 'alice', 'searchHistory', 'forged'), {
      term: 'private query', updatedAt: serverTimestamp()
    }));
    await assertSucceeds(deleteDoc(ownSearch));
  });

  it('lets users read their own trusted like markers but never create or modify them directly', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'alice', 'postLikes', 'post-1'), { postId: 'post-1', userId: 'alice' });
    });
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'users', 'alice', 'postLikes', 'post-1')));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'users', 'alice', 'postLikes')));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'postLikes', 'post-1')));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'postLikes', 'forged'), { postId: 'forged', userId: 'alice' }));
    await assertFails(deleteDoc(doc(dbFor('alice'), 'users', 'alice', 'postLikes', 'post-1')));
  });
  it('allows public community discovery but denies private/invite records to strangers and guests', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'communities', 'public-community'), { id: 'public-community', ownerId: 'alice', type: 'public', name: 'Open' });
      await setDoc(doc(db, 'communities', 'private-community'), { id: 'private-community', ownerId: 'alice', type: 'private', name: 'Private', pendingMembers: ['bob'], reports: ['private-report'] });
      await setDoc(doc(db, 'communities', 'invite-community'), { id: 'invite-community', ownerId: 'bob', type: 'invite-only', name: 'Invite only' });
    });
    await assertSucceeds(getDoc(doc(guestDb(), 'communities', 'public-community')));
    await assertFails(getDoc(doc(guestDb(), 'communities', 'private-community')));
    await assertFails(getDoc(doc(dbFor('mallory'), 'communities', 'private-community')));
    await assertFails(getDoc(doc(dbFor('mallory'), 'communities', 'invite-community')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'communities', 'private-community')));
    await assertSucceeds(getDocs(query(collection(guestDb(), 'communities'), where('type', '==', 'public'))));
    await assertFails(getDocs(collection(dbFor('mallory'), 'communities')));
    await assertFails(setDoc(doc(dbFor('alice'), 'communities', 'bad-type'), { id: 'bad-type', ownerId: 'alice', type: 'unknown' }));
  });
  it('enforces self-scoped Circle membership and prevents client-assigned elevated roles', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'communities', 'member-circle'), {
        id: 'member-circle', ownerId: 'alice', creatorId: 'alice', type: 'public', name: 'Members', bannedUsers: ['mallory']
      });
    });

    const aliceMembers = collection(dbFor('alice'), 'communities', 'member-circle', 'members');
    const bobMember = doc(dbFor('bob'), 'communities', 'member-circle', 'members', 'bob');
    const malloryMember = doc(dbFor('mallory'), 'communities', 'member-circle', 'members', 'bob');

    await assertSucceeds(setDoc(doc(dbFor('alice'), 'communities', 'member-circle', 'members', 'alice'), {
      userId: 'alice', role: 'owner', status: 'active', joinedAt: serverTimestamp()
    }));
    await assertSucceeds(setDoc(bobMember, {
      userId: 'bob', role: 'member', status: 'active', joinedAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(bobMember));
    await assertFails(getDoc(doc(dbFor('mallory'), 'communities', 'member-circle', 'members', 'bob')));
    await assertSucceeds(getDocs(aliceMembers));
    await assertSucceeds(getDocs(query(collection(dbFor('bob'), 'communities', 'member-circle', 'members'), where('status', '==', 'active'))));
    await assertFails(getDocs(collection(dbFor('bob'), 'communities', 'member-circle', 'members')));
    await assertFails(setDoc(doc(dbFor('mallory'), 'communities', 'member-circle', 'members', 'mallory'), {
      userId: 'mallory', role: 'admin', status: 'active', joinedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('mallory'), 'communities', 'member-circle', 'members', 'mallory'), {
      userId: 'mallory', role: 'member', status: 'active', joinedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'communities', 'member-circle', 'members', 'alice'), {
      userId: 'alice', role: 'member', status: 'active', joinedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(bobMember, { role: 'admin' }));
    await assertSucceeds(deleteDoc(bobMember));
    await assertFails(deleteDoc(doc(dbFor('alice'), 'communities', 'member-circle', 'members', 'alice')));
  });

  it('allows only active Circle members to read and send bounded messages', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'communities', 'chat-circle'), {
        id: 'chat-circle', ownerId: 'alice', creatorId: 'alice', type: 'public', name: 'Chat'
      });
      await setDoc(doc(db, 'communities', 'chat-circle', 'members', 'alice'), {
        userId: 'alice', role: 'owner', status: 'active', joinedAt: Timestamp.now()
      });
      await setDoc(doc(db, 'communities', 'chat-circle', 'members', 'bob'), {
        userId: 'bob', role: 'member', status: 'active', joinedAt: Timestamp.now()
      });
    });

    const bobMessages = collection(dbFor('bob'), 'communities', 'chat-circle', 'messages');
    const bobMessage = doc(bobMessages, 'message-1');
    await assertSucceeds(setDoc(bobMessage, {
      id: 'message-1', senderId: 'bob', content: 'Hello Circle', createdAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'communities', 'chat-circle', 'messages', 'message-1')));
    await assertSucceeds(getDocs(collection(dbFor('bob'), 'communities', 'chat-circle', 'messages')));
    await assertFails(getDocs(collection(dbFor('mallory'), 'communities', 'chat-circle', 'messages')));
    await assertFails(setDoc(doc(dbFor('mallory'), 'communities', 'chat-circle', 'messages', 'forged'), {
      id: 'forged', senderId: 'bob', content: 'Impersonation', createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('bob'), 'communities', 'chat-circle', 'messages', 'too-long'), {
      id: 'too-long', senderId: 'bob', content: 'x'.repeat(2001), createdAt: serverTimestamp()
    }));
    await assertFails(updateDoc(bobMessage, { content: 'Edited without policy' }));
    await assertFails(deleteDoc(bobMessage));
  });
  it('keeps raw analytics and daily aggregates behind server-owned boundaries', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'analyticsEvents', 'event-1'), { eventType: 'post_open', actorId: 'alice' });
      await setDoc(doc(db, 'analyticsDaily', '2026-10-24'), { day: '2026-10-24', totalEvents: 4 });
    });
    await assertFails(getDoc(doc(dbFor('alice'), 'analyticsEvents', 'event-1')));
    await assertFails(setDoc(doc(dbFor('alice'), 'analyticsEvents', 'event-2'), { eventType: 'post_open' }));
    await assertFails(getDoc(doc(dbFor('alice'), 'analyticsDaily', '2026-10-24')));
    await assertSucceeds(getDoc(doc(env.authenticatedContext('admin', { admin: true }).firestore(), 'analyticsDaily', '2026-10-24')));
    await assertFails(updateDoc(doc(env.authenticatedContext('admin', { admin: true }).firestore(), 'analyticsDaily', '2026-10-24'), { totalEvents: 99 }));
  });


  it('allows active Circle members to list the member directory without exposing it to strangers', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'communities', 'directory-circle'), { id: 'directory-circle', ownerId: 'alice', type: 'public', name: 'Directory' });
      await setDoc(doc(db, 'communities', 'directory-circle', 'members', 'alice'), { userId: 'alice', role: 'owner', status: 'active', joinedAt: Timestamp.now() });
      await setDoc(doc(db, 'communities', 'directory-circle', 'members', 'bob'), { userId: 'bob', role: 'member', status: 'active', joinedAt: Timestamp.now() });
    });
    const directory = query(collection(dbFor('bob'), 'communities', 'directory-circle', 'members'), where('status', '==', 'active'));
    const members = await assertSucceeds(getDocs(directory));
    assert.equal(members.size, 2);
    await assertFails(getDocs(query(collection(dbFor('mallory'), 'communities', 'directory-circle', 'members'), where('status', '==', 'active'))));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'communities', 'directory-circle', 'members')));
  });

  it('allows active Circle members to read feed posts and reserves creation for trusted callables', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'communities', 'feed-circle'), { id: 'feed-circle', ownerId: 'alice', type: 'private', name: 'Feed' });
      await setDoc(doc(db, 'communities', 'feed-circle', 'members', 'alice'), { userId: 'alice', role: 'owner', status: 'active', joinedAt: Timestamp.now() });
      await setDoc(doc(db, 'communities', 'feed-circle', 'members', 'bob'), { userId: 'bob', role: 'member', status: 'active', joinedAt: Timestamp.now() });
      await setDoc(doc(db, 'communities', 'feed-circle', 'posts', 'post-1'), {
        id: 'post-1', communityId: 'feed-circle', authorId: 'alice', authorName: 'Alice',
        content: 'A real member post', status: 'published', createdAt: Timestamp.now()
      });
    });
    const postPath = ['communities', 'feed-circle', 'posts', 'post-1'];
    await assertSucceeds(getDoc(doc(dbFor('bob'), ...postPath)));
    await assertSucceeds(getDocs(collection(dbFor('bob'), 'communities', 'feed-circle', 'posts')));
    await assertFails(getDoc(doc(dbFor('mallory'), ...postPath)));
    await assertFails(getDocs(collection(dbFor('mallory'), 'communities', 'feed-circle', 'posts')));
    await assertFails(setDoc(doc(dbFor('bob'), 'communities', 'feed-circle', 'posts', 'forged'), {
      id: 'forged', communityId: 'feed-circle', authorId: 'alice', content: 'Impersonation', createdAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), ...postPath), { content: 'Edited without policy' }));
    await assertFails(deleteDoc(doc(dbFor('alice'), ...postPath)));
  });

  it('allows active Circle members to read announcements but reserves all writes for trusted callables', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'communities', 'announcement-circle'), {
        id: 'announcement-circle', ownerId: 'alice', type: 'public', name: 'Announcements'
      });
      await setDoc(doc(db, 'communities', 'announcement-circle', 'members', 'alice'), {
        userId: 'alice', role: 'owner', status: 'active', joinedAt: Timestamp.now()
      });
      await setDoc(doc(db, 'communities', 'announcement-circle', 'members', 'bob'), {
        userId: 'bob', role: 'member', status: 'active', joinedAt: Timestamp.now()
      });
      await setDoc(doc(db, 'communities', 'announcement-circle', 'announcements', 'notice-1'), {
        id: 'notice-1', communityId: 'announcement-circle', title: 'Welcome',
        body: 'Read the Circle rules.', createdBy: 'alice', createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(), pinned: true
      });
    });
    const announcementPath = ['communities', 'announcement-circle', 'announcements', 'notice-1'];
    await assertSucceeds(getDoc(doc(dbFor('alice'), ...announcementPath)));
    await assertSucceeds(getDoc(doc(dbFor('bob'), ...announcementPath)));
    await assertSucceeds(getDocs(collection(dbFor('bob'), 'communities', 'announcement-circle', 'announcements')));
    await assertFails(getDoc(doc(dbFor('mallory'), ...announcementPath)));
    await assertFails(setDoc(doc(dbFor('alice'), 'communities', 'announcement-circle', 'announcements', 'forged'), {
      id: 'forged', title: 'Client-forged', body: 'Not allowed', createdBy: 'alice', createdAt: serverTimestamp(), pinned: true
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), ...announcementPath), { pinned: false }));
    await assertFails(deleteDoc(doc(dbFor('alice'), ...announcementPath)));
  });

  it('allows active Circle members to read events and only their own RSVP marker', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'communities', 'event-circle'), { id: 'event-circle', ownerId: 'alice', type: 'public', name: 'Events' });
      await setDoc(doc(db, 'communities', 'event-circle', 'members', 'alice'), { userId: 'alice', role: 'owner', status: 'active', joinedAt: Timestamp.now() });
      await setDoc(doc(db, 'communities', 'event-circle', 'members', 'bob'), { userId: 'bob', role: 'member', status: 'active', joinedAt: Timestamp.now() });
      await setDoc(doc(db, 'communities', 'event-circle', 'events', 'event-1'), {
        id: 'event-1', communityId: 'event-circle', title: 'Member meetup',
        startsAt: Timestamp.fromDate(new Date(Date.now() + 86400000)), location: '',
        createdBy: 'alice', attendeeCount: 1, status: 'scheduled', createdAt: Timestamp.now()
      });
      await setDoc(doc(db, 'communities', 'event-circle', 'events', 'event-1', 'rsvps', 'alice'), {
        userId: 'alice', attending: true, createdAt: Timestamp.now()
      });
    });
    const eventPath = ['communities', 'event-circle', 'events', 'event-1'];
    await assertSucceeds(getDoc(doc(dbFor('bob'), ...eventPath)));
    await assertSucceeds(getDocs(collection(dbFor('bob'), 'communities', 'event-circle', 'events')));
    await assertFails(getDoc(doc(dbFor('mallory'), ...eventPath)));
    await assertSucceeds(getDoc(doc(dbFor('alice'), ...eventPath, 'rsvps', 'alice')));
    await assertFails(getDoc(doc(dbFor('bob'), ...eventPath, 'rsvps', 'alice')));
    await assertFails(getDocs(collection(dbFor('alice'), ...eventPath, 'rsvps')));
    await assertFails(setDoc(doc(dbFor('bob'), ...eventPath), { id: 'forged', title: 'Forged event' }));
    await assertFails(setDoc(doc(dbFor('bob'), ...eventPath, 'rsvps', 'bob'), { userId: 'bob', attending: true }));
    await assertFails(updateDoc(doc(dbFor('alice'), ...eventPath), { attendeeCount: 999 }));
  });

  it('allows active Circle members to read polls and only their own vote marker', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'communities', 'poll-circle'), {
        id: 'poll-circle', ownerId: 'alice', creatorId: 'alice', type: 'public', name: 'Polls'
      });
      await setDoc(doc(db, 'communities', 'poll-circle', 'members', 'alice'), {
        userId: 'alice', role: 'owner', status: 'active', joinedAt: Timestamp.now()
      });
      await setDoc(doc(db, 'communities', 'poll-circle', 'members', 'bob'), {
        userId: 'bob', role: 'member', status: 'active', joinedAt: Timestamp.now()
      });
      await setDoc(doc(db, 'communities', 'poll-circle', 'polls', 'poll-1'), {
        id: 'poll-1', communityId: 'poll-circle', question: 'Which topic next?',
        options: [{ id: 'a', text: 'Design', votes: 0 }, { id: 'b', text: 'Engineering', votes: 0 }],
        createdBy: 'alice', status: 'open', createdAt: Timestamp.now()
      });
      await setDoc(doc(db, 'communities', 'poll-circle', 'polls', 'poll-1', 'votes', 'alice'), {
        userId: 'alice', optionId: 'a', createdAt: Timestamp.now()
      });
    });

    const pollPath = ['communities', 'poll-circle', 'polls', 'poll-1'];
    await assertSucceeds(getDoc(doc(dbFor('bob'), ...pollPath)));
    await assertSucceeds(getDocs(collection(dbFor('bob'), 'communities', 'poll-circle', 'polls')));
    await assertFails(getDoc(doc(dbFor('mallory'), ...pollPath)));
    await assertSucceeds(getDoc(doc(dbFor('alice'), ...pollPath, 'votes', 'alice')));
    await assertFails(getDoc(doc(dbFor('bob'), ...pollPath, 'votes', 'alice')));
    await assertFails(getDocs(collection(dbFor('alice'), ...pollPath, 'votes')));
    await assertFails(setDoc(doc(dbFor('alice'), ...pollPath), {
      id: 'poll-2', question: 'Forged poll', options: [], createdBy: 'alice', status: 'open'
    }));
    await assertFails(setDoc(doc(dbFor('alice'), ...pollPath, 'votes', 'bob'), {
      userId: 'bob', optionId: 'a', createdAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), ...pollPath), { status: 'closed' }));
  });

  it('protects financial records from client mutation and cross-account reads', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'financialTransactions', 'txn-1'), { ownerId: 'alice', amountMinor: 1299, currency: 'USD', status: 'payment_confirmed' });
      await setDoc(doc(db, 'subscriptions', 'sub-1'), { ownerId: 'alice', productId: 'nexora_plus', status: 'active' });
      await setDoc(doc(db, 'entitlements', 'ent-1'), { ownerId: 'alice', key: 'nexora_plus', status: 'active' });
      await setDoc(doc(db, 'creatorEarnings', 'earn-1'), { creatorId: 'alice', creatorShareMinor: 7200, currency: 'USD' });
      await setDoc(doc(db, 'creatorMembershipTiers', 'tier-1'), { creatorId: 'alice', name: 'Insider', status: 'draft', benefits: ['Monthly Q&A'] });
    });
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'financialTransactions', 'txn-1')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'subscriptions', 'sub-1')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'entitlements', 'ent-1')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'creatorEarnings', 'earn-1')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'creatorMembershipTiers', 'tier-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'creatorMembershipTiers', 'tier-1')));
    await assertFails(setDoc(doc(dbFor('alice'), 'creatorMembershipTiers', 'forged'), { creatorId: 'alice', name: 'Forged', status: 'draft' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'creatorMembershipTiers', 'tier-1'), { name: 'Client edited' }));
    await assertFails(deleteDoc(doc(dbFor('alice'), 'creatorMembershipTiers', 'tier-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'financialTransactions', 'txn-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'entitlements', 'ent-1')));
    await assertFails(setDoc(doc(dbFor('alice'), 'financialTransactions', 'forged'), { ownerId: 'alice', amountMinor: 999999, currency: 'USD', status: 'payment_confirmed' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'subscriptions', 'sub-1'), { status: 'active' }));
    await assertFails(deleteDoc(doc(dbFor('alice'), 'creatorEarnings', 'earn-1')));
  });

  it('persists bookmarks privately and permits only owner bookmarks of public posts', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'posts', 'bookmark-public'), {
        id: 'bookmark-public', userId: 'author', audience: 'public', content: 'Public post', likes: 0, commentsCount: 0
      });
      await setDoc(doc(db, 'posts', 'bookmark-private'), {
        id: 'bookmark-private', userId: 'author', audience: 'followers', content: 'Restricted post'
      });
    });

    const aliceBookmark = doc(dbFor('alice'), 'users', 'alice', 'postBookmarks', 'bookmark-public');
    await assertSucceeds(setDoc(aliceBookmark, {
      postId: 'bookmark-public', createdAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(aliceBookmark));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'users', 'alice', 'postBookmarks')));
    await assertFails(getDocs(collection(dbFor('bob'), 'users', 'alice', 'postBookmarks')));
    await assertFails(setDoc(doc(dbFor('bob'), 'users', 'alice', 'postBookmarks', 'forged'), {
      postId: 'forged', createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'postBookmarks', 'bookmark-private'), {
      postId: 'bookmark-private', createdAt: serverTimestamp()
    }));
    await assertFails(updateDoc(aliceBookmark, { postId: 'bookmark-private' }));
    await assertSucceeds(deleteDoc(aliceBookmark));
  });
  it('keeps named saved collections private and limits their records to public post references', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'posts', 'collection-public'), {
        id: 'collection-public', userId: 'author', audience: 'public', content: 'Public'
      });
      await setDoc(doc(db, 'posts', 'collection-private'), {
        id: 'collection-private', userId: 'author', audience: 'followers', content: 'Private'
      });
      await setDoc(doc(db, 'communities', 'collection-circle'), { id: 'collection-circle', type: 'public', name: 'Public Circle' });
      await setDoc(doc(db, 'pages', 'collection-page'), { id: 'collection-page', ownerId: 'owner', name: 'Public Page' });
      await setDoc(doc(db, 'communities', 'collection-event-circle'), { id: 'collection-event-circle', type: 'private' });
      await setDoc(doc(db, 'communities', 'collection-event-circle', 'members', 'alice'), { userId: 'alice', status: 'active' });
      await setDoc(doc(db, 'communities', 'collection-event-circle', 'events', 'collection-event'), { id: 'collection-event', status: 'scheduled' });
    });
    const collectionRef = doc(dbFor('alice'), 'users', 'alice', 'savedCollections', 'reading-list');
    await assertSucceeds(setDoc(collectionRef, {
      name: 'Reading list', itemCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(collectionRef));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'savedCollections', 'reading-list')));
    await assertFails(setDoc(doc(dbFor('bob'), 'users', 'alice', 'savedCollections', 'forged'), {
      name: 'Forged', itemCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    }));
    const itemRef = doc(collectionRef, 'items', 'post_collection-public');
    await assertSucceeds(setDoc(itemRef, {
      itemType: 'post', itemId: 'collection-public', createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(collectionRef, 'items', 'post_collection-private'), {
      itemType: 'post', itemId: 'collection-private', createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(collectionRef, 'items', 'bad-type'), {
      itemType: 'circle', itemId: 'collection-public', createdAt: serverTimestamp()
    }));
    await assertSucceeds(setDoc(doc(collectionRef, 'items', 'circle_collection-circle'), {
      itemType: 'circle', itemId: 'collection-circle', createdAt: serverTimestamp()
    }));
    await assertSucceeds(setDoc(doc(collectionRef, 'items', 'page_collection-page'), {
      itemType: 'page', itemId: 'collection-page', createdAt: serverTimestamp()
    }));
    await assertSucceeds(setDoc(doc(collectionRef, 'items', 'event_collection-event-circle_collection-event'), {
      itemType: 'event', itemId: 'collection-event', parentId: 'collection-event-circle', createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(collectionRef, 'items', 'event_other-circle_private-event'), {
      itemType: 'event', itemId: 'private-event', parentId: 'other-circle', createdAt: serverTimestamp()
    }));
    await assertSucceeds(updateDoc(collectionRef, { itemCount: 4, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(collectionRef, { itemCount: 501, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(collectionRef, { name: 'Tampered' }));
    await assertSucceeds(deleteDoc(itemRef));
    await assertSucceeds(deleteDoc(collectionRef));
  });

  it('restricts official Page channel updates to Page owners and followers', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'pages', 'channel-page'), { id: 'channel-page', ownerId: 'page-owner', category: 'Creator' });
      await setDoc(doc(db, 'pages', 'channel-page', 'channelUpdates', 'update-1'), {
        id: 'update-1', pageId: 'channel-page', ownerId: 'page-owner', content: 'Official update', status: 'published'
      });
      await setDoc(doc(db, 'follows', 'alice_channel-page'), { followerId: 'alice', followingId: 'channel-page' });
    });
    const update = doc(dbFor('alice'), 'pages', 'channel-page', 'channelUpdates', 'update-1');
    await assertSucceeds(getDoc(update));
    await assertSucceeds(getDoc(doc(dbFor('page-owner'), 'pages', 'channel-page', 'channelUpdates', 'update-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'pages', 'channel-page', 'channelUpdates', 'update-1')));
    await assertFails(setDoc(doc(dbFor('page-owner'), 'pages', 'channel-page', 'channelUpdates', 'forged'), {
      id: 'forged', pageId: 'channel-page', content: 'Forged', status: 'published'
    }));
  });

  it('allows public service reads but keeps paused listings owner-only', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'pages', 'service-page'), { id: 'service-page', ownerId: 'service-owner', category: 'Business' });
      await setDoc(doc(db, 'pages', 'service-page', 'services', 'active-service'), {
        id: 'active-service', status: 'active', bookable: true, name: 'Active'
      });
      await setDoc(doc(db, 'pages', 'service-page', 'services', 'paused-service'), {
        id: 'paused-service', status: 'paused', bookable: false, name: 'Paused'
      });
    });
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'pages', 'service-page', 'services', 'active-service')));
    await assertFails(getDoc(doc(dbFor('alice'), 'pages', 'service-page', 'services', 'paused-service')));
    await assertSucceeds(getDoc(doc(dbFor('service-owner'), 'pages', 'service-page', 'services', 'paused-service')));
    await assertFails(setDoc(doc(dbFor('service-owner'), 'pages', 'service-page', 'services', 'forged'), {
      id: 'forged', status: 'active', bookable: true, name: 'Forged'
    }));
  });

  it('keeps push device tokens private and owner-managed', async () => {
    const tokenPath = ['users', 'alice', 'pushTokens', 'a'.repeat(64)];
    const aliceToken = doc(dbFor('alice'), ...tokenPath);
    await assertSucceeds(setDoc(aliceToken, {
      token: 'fcm-device-token-value-that-is-long-enough',
      platform: 'web',
      updatedAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(aliceToken));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'users', 'alice', 'pushTokens')));
    await assertFails(getDoc(doc(dbFor('bob'), ...tokenPath)));
    await assertFails(setDoc(doc(dbFor('bob'), ...tokenPath), {
      token: 'forged-device-token-value-that-is-long-enough',
      platform: 'web',
      updatedAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'pushTokens', 'invalid-id'), {
      token: 'fcm-device-token-value-that-is-long-enough',
      platform: 'web',
      updatedAt: serverTimestamp()
    }));
    await assertSucceeds(deleteDoc(aliceToken));
    await assertFails(deleteDoc(doc(dbFor('bob'), ...tokenPath)));
  });

  it('keeps notification inbox records private and server-created', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'alice', 'notifications', 'like-1'), {
        id: 'like-1', type: 'like', userId: 'alice', content: 'liked your post',
        timestamp: new Date().toISOString(), isRead: false
      });
    });
    const aliceNotification = doc(dbFor('alice'), 'users', 'alice', 'notifications', 'like-1');
    await assertSucceeds(getDoc(aliceNotification));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'users', 'alice', 'notifications')));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'notifications', 'like-1')));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'notifications', 'forged'), {
      id: 'forged', type: 'like', userId: 'alice', content: 'forged notification',
      timestamp: new Date().toISOString(), isRead: false
    }));
    await assertSucceeds(updateDoc(aliceNotification, { isRead: true }));
    await assertFails(updateDoc(aliceNotification, { content: 'tampered notification' }));
  });

  it('keeps Nex Coin wallets owner-readable and all wallet and ledger writes server-only', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'nexWallets', 'alice'), {
        currency: 'NEX', availableBalance: 250, lifetimeCredited: 300,
        lifetimeDebited: 50, schemaVersion: 1
      });
      await setDoc(doc(db, 'nexWallets', 'alice', 'transactions', 'tx-1'), {
        direction: 'credit', units: 250, currency: 'NEX', status: 'posted'
      });
      await setDoc(doc(db, 'nexLedgerEntries', 'tx-1-credit'), {
        accountId: 'alice', direction: 'credit', units: 250, currency: 'NEX'
      });
    });

    await assertSucceeds(getDoc(doc(dbFor('alice'), 'nexWallets', 'alice')));
    await assertFails(getDoc(doc(dbFor('bob'), 'nexWallets', 'alice')));
    await assertFails(getDocs(collection(dbFor('alice'), 'nexWallets')));
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'nexWallets', 'alice', 'transactions')));
    await assertFails(getDocs(collection(dbFor('bob'), 'nexWallets', 'alice', 'transactions')));

    await assertFails(setDoc(doc(dbFor('alice'), 'nexWallets', 'alice'), {
      currency: 'NEX', availableBalance: 999999, lifetimeCredited: 999999, lifetimeDebited: 0
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'nexWallets', 'alice'), { availableBalance: 999999 }));
    await assertFails(deleteDoc(doc(dbFor('alice'), 'nexWallets', 'alice')));
    await assertFails(setDoc(doc(dbFor('alice'), 'nexWallets', 'alice', 'transactions', 'forged'), {
      direction: 'credit', units: 999999, currency: 'NEX', status: 'posted'
    }));
    await assertFails(getDoc(doc(dbFor('alice'), 'nexLedgerEntries', 'tx-1-credit')));
    await assertFails(setDoc(doc(dbFor('alice'), 'nexLedgerEntries', 'forged'), {
      accountId: 'alice', direction: 'credit', units: 999999, currency: 'NEX'
    }));
    await assertFails(getDoc(doc(dbFor('alice'), 'nexLedgerTransactions', 'tx-1')));
    await assertFails(getDoc(doc(dbFor('alice'), 'nexLedgerRequests', 'request-1')));
  });
  it('keeps Creator Academy learning progress owner-scoped and prevents client-issued credentials', async () => {
    const alice = dbFor('alice');
    const ownProgress = {
      userId: 'alice', courseId: 'creator-foundations',
      completedLessonIds: ['identity'], updatedAt: serverTimestamp(), schemaVersion: 1
    };
    await assertSucceeds(setDoc(doc(alice, 'academyProgress', 'alice_creator-foundations'), ownProgress));
    await assertSucceeds(getDoc(doc(alice, 'academyProgress', 'alice_creator-foundations')));
    await assertSucceeds(getDocs(query(collection(alice, 'academyProgress'), where('userId', '==', 'alice'))));
    await assertFails(getDoc(doc(dbFor('bob'), 'academyProgress', 'alice_creator-foundations')));
    await assertFails(setDoc(doc(dbFor('bob'), 'academyProgress', 'bob_creator-foundations'), {
      ...ownProgress, userId: 'alice'
    }));
    await assertFails(setDoc(doc(alice, 'academyProgress', 'alice_unknown-course'), {
      ...ownProgress, courseId: 'unknown-course'
    }));
    await assertFails(setDoc(doc(alice, 'academyProgress', 'alice_creator-foundations'), {
      ...ownProgress, completedLessonIds: ['a', 'b', 'c', 'd']
    }));
    await assertFails(setDoc(doc(alice, 'academyProgress', 'alice_creator-foundations'), {
      ...ownProgress, certificateId: 'forged-certificate'
    }));
    await assertFails(updateDoc(doc(alice, 'academyProgress', 'alice_creator-foundations'), {
      userId: 'bob'
    }));
    await assertFails(deleteDoc(doc(alice, 'academyProgress', 'alice_creator-foundations')));
  });

  it('keeps Academy lesson notes private, bounded and tied to valid bundled lessons', async () => {
    const alice = dbFor('alice');
    const note = {
      userId: 'alice', courseId: 'creator-foundations', lessonId: 'identity',
      note: 'My audience promise and examples.', updatedAt: serverTimestamp(), schemaVersion: 1
    };
    await assertSucceeds(setDoc(doc(alice, 'academyLessonNotes', 'alice_creator-foundations_identity'), note));
    await assertSucceeds(getDoc(doc(alice, 'academyLessonNotes', 'alice_creator-foundations_identity')));
    await assertSucceeds(getDocs(query(collection(alice, 'academyLessonNotes'), where('userId', '==', 'alice'))));
    await assertFails(getDoc(doc(dbFor('bob'), 'academyLessonNotes', 'alice_creator-foundations_identity')));
    await assertFails(setDoc(doc(dbFor('bob'), 'academyLessonNotes', 'bob_creator-foundations_identity'), note));
    await assertFails(setDoc(doc(alice, 'academyLessonNotes', 'alice_creator-foundations_unknown'), {
      ...note, lessonId: 'unknown'
    }));
    await assertFails(setDoc(doc(alice, 'academyLessonNotes', 'alice_creator-foundations_identity'), {
      ...note, note: 'x'.repeat(5001)
    }));
    await assertFails(setDoc(doc(alice, 'academyLessonNotes', 'alice_creator-foundations_identity'), {
      ...note, isInstructor: true
    }));
    await assertFails(updateDoc(doc(alice, 'academyLessonNotes', 'alice_creator-foundations_identity'), {
      userId: 'bob'
    }));
    await assertSucceeds(deleteDoc(doc(alice, 'academyLessonNotes', 'alice_creator-foundations_identity')));
    await assertFails(getDoc(doc(alice, 'academyLessonNotes', 'alice_creator-foundations_identity')));
  });

  it('keeps Creator Academy workbooks private and restricts them to approved templates', async () => {
    const alice = dbFor('alice');
    const workbook = {
      userId: 'alice', templateId: 'content-brief',
      content: JSON.stringify({ audience: 'New creators', goal: 'Teach a useful skill.' }),
      updatedAt: serverTimestamp(), schemaVersion: 1
    };
    await assertSucceeds(setDoc(doc(alice, 'academyCreatorWorkbooks', 'alice_content-brief'), workbook));
    await assertSucceeds(getDoc(doc(alice, 'academyCreatorWorkbooks', 'alice_content-brief')));
    await assertSucceeds(getDocs(query(collection(alice, 'academyCreatorWorkbooks'), where('userId', '==', 'alice'))));
    await assertFails(getDoc(doc(dbFor('bob'), 'academyCreatorWorkbooks', 'alice_content-brief')));
    await assertFails(setDoc(doc(dbFor('bob'), 'academyCreatorWorkbooks', 'bob_content-brief'), workbook));
    await assertFails(setDoc(doc(alice, 'academyCreatorWorkbooks', 'alice_unapproved'), {
      ...workbook, templateId: 'unapproved'
    }));
    await assertFails(setDoc(doc(alice, 'academyCreatorWorkbooks', 'alice_content-brief'), {
      ...workbook, content: 'x'.repeat(16001)
    }));
    await assertFails(setDoc(doc(alice, 'academyCreatorWorkbooks', 'alice_content-brief'), {
      ...workbook, isInstructor: true
    }));
    await assertFails(updateDoc(doc(alice, 'academyCreatorWorkbooks', 'alice_content-brief'), {
      userId: 'bob'
    }));
    await assertSucceeds(deleteDoc(doc(alice, 'academyCreatorWorkbooks', 'alice_content-brief')));
  });

  it('keeps Academy institution content, grading and credentials server-authoritative', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'academyCourses', 'forged-course'), {
      id: 'forged-course', ownerId: 'alice', status: 'published', title: 'Forged'
    }));
    await assertFails(getDoc(doc(dbFor('alice'), 'academyCourses', 'private-draft')));
    await assertFails(setDoc(doc(dbFor('alice'), 'academyCourses', 'course-1', 'lessons', 'lesson-1'), {
      id: 'lesson-1', title: 'Forged lesson', body: 'Client-authored lesson content', status: 'published'
    }));
    await assertFails(getDoc(doc(dbFor('alice'), 'academyCourses', 'course-1', 'assessments', 'final')));
    await assertFails(setDoc(doc(dbFor('alice'), 'academyAssessmentAttempts', 'forged-attempt'), {
      userId: 'alice', courseId: 'course-1', passed: true, scorePercent: 100
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'academyCertificates', 'forged-certificate'), {
      userId: 'alice', courseId: 'course-1', status: 'valid', verificationCode: 'AAAAAAAAAAAAAAAAAAAAAAAA'
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'academyMentorshipSessions', 'forged-session'), {
      mentorId: 'alice', status: 'scheduled', capacity: 1000, bookedCount: 0
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'academyMentorshipSessions', 'session-1', 'bookings', 'alice'), {
      userId: 'alice', status: 'booked'
    }));
  });

  it('keeps GIFTVERSE live events server-created and creator galleries read-only', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'giftDeliveryEvents', 'live-event'), {
        targetType: 'live', targetId: 'session-1', giftName: 'Violet Rose'
      });
      await setDoc(doc(db, 'giftDeliveryEvents', 'profile-event'), {
        targetType: 'profile', targetId: 'alice', giftName: 'Violet Rose'
      });
      await setDoc(doc(db, 'users', 'alice', 'giftGallery', 'gift-1'), {
        giftId: 'floral-01', giftName: 'Violet Rose', image: '/giftverse/gifts/floral-01.svg'
      });
    });
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'giftDeliveryEvents', 'live-event')));
    await assertFails(getDoc(doc(dbFor('alice'), 'giftDeliveryEvents', 'profile-event')));
    await assertFails(setDoc(doc(dbFor('alice'), 'giftDeliveryEvents', 'forged'), {
      targetType: 'live', targetId: 'session-1', giftName: 'Forged gift'
    }));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'users', 'alice', 'giftGallery', 'gift-1')));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'giftGallery', 'forged'), {
      giftId: 'royal-01', giftName: 'Forged Crown'
    }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'users', 'alice', 'giftGallery', 'gift-1'), {
      giftName: 'Tampered gift'
    }));
  });

  it('protects live room sessions and persistent chat as server-owned state', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'liveSessions', 'active-room'), { hostId: 'alice', status: 'live', viewerCount: 1 });
      await setDoc(doc(db, 'liveSessions', 'ended-room'), { hostId: 'alice', status: 'ended', viewerCount: 0 });
      await setDoc(doc(db, 'liveSessions', 'active-room', 'messages', 'message-1'), { senderId: 'bob', message: 'Hello live room' });
      await setDoc(doc(db, 'liveSessions', 'ended-room', 'messages', 'message-2'), { senderId: 'bob', message: 'Past chat' });
      await setDoc(doc(db, 'liveSessions', 'active-room', 'guestRequests', 'bob'), { guestId: 'bob', guestName: 'Bob', status: 'pending' });
      await setDoc(doc(db, 'liveSessions', 'active-room', 'guestRequests', 'charlie'), { guestId: 'charlie', guestName: 'Charlie', status: 'approved' });
    });
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'liveSessions', 'active-room')));
    await assertFails(getDoc(doc(dbFor('bob'), 'liveSessions', 'ended-room')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'liveSessions', 'ended-room')));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'liveSessions', 'active-room', 'messages', 'message-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'liveSessions', 'ended-room', 'messages', 'message-2')));
    await assertFails(setDoc(doc(dbFor('alice'), 'liveSessions', 'forged-room'), { hostId: 'alice', status: 'live' }));
    await assertFails(setDoc(doc(dbFor('bob'), 'liveSessions', 'active-room', 'messages', 'forged'), { senderId: 'bob', message: 'forged' }));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'liveSessions', 'active-room', 'guestRequests', 'bob')));
    await assertFails(getDoc(doc(dbFor('bob'), 'liveSessions', 'active-room', 'guestRequests', 'charlie')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'liveSessions', 'active-room', 'guestRequests', 'bob')));
    await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'liveSessions', 'active-room', 'guestRequests'), where('status', '==', 'pending'))));
    await assertFails(getDocs(query(collection(dbFor('bob'), 'liveSessions', 'active-room', 'guestRequests'), where('status', '==', 'pending'))));
    await assertFails(setDoc(doc(dbFor('bob'), 'liveSessions', 'active-room', 'guestRequests', 'bob'), { guestId: 'bob', status: 'approved' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'liveSessions', 'active-room', 'guestRequests', 'bob'), { status: 'approved' }));
    await assertFails(deleteDoc(doc(dbFor('alice'), 'liveSessions', 'active-room', 'guestRequests', 'bob')));
    await assertFails(setDoc(doc(dbFor('bob'), 'liveSessionViewers', 'forged'), { sessionId: 'active-room', viewerId: 'bob' }));
  });
});