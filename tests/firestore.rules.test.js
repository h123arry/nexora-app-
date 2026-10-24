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
  serverTimestamp,
  setDoc,
  Timestamp,
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
      voiceAudioUrl: `chats/chat-1/audio/alice/${'a'.repeat(36)}`, voiceDuration: '3s', fileName: 'recording.webm'
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

  it('restricts stories to authenticated readers and verified text-story authors, with owner-only deletion', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'publicProfiles', 'alice'), publicProfile('alice'));
    });
    const story = {
      id: 'story-1', userId: 'alice', name: 'alice', username: 'alice', avatar: '',
      caption: 'A real text update', mediaType: 'text', privacy: 'everyone',
      createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 23 * 60 * 60 * 1000)
    };

    await assertSucceeds(setDoc(doc(dbFor('alice'), 'stories', 'story-1'), story));
    await assertFails(setDoc(doc(dbFor('bob'), 'stories', 'spoofed'), { ...story, id: 'spoofed' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'stories', 'forged-metrics'), { ...story, id: 'forged-metrics', views: 500 }));
    await assertFails(setDoc(doc(dbFor('alice'), 'stories', 'too-long'), { ...story, id: 'too-long', caption: 'x'.repeat(501) }));
    await assertFails(getDoc(doc(guestDb(), 'stories', 'story-1')));
    await assertSucceeds(getDocs(query(
      collection(dbFor('bob'), 'stories'),
      where('privacy', '==', 'everyone'),
      where('expiresAt', '>', Timestamp.now())
    )));
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
    await assertFails(setDoc(doc(dbFor('alice'), 'communities', 'mismatched-community'), community));
    await assertFails(setDoc(doc(dbFor('bob'), 'pages', 'forged-page'), { ...page, id: 'forged-page' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'pages', page.id), { isVerified: true }));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'pages', page.id), { name: 'Updated Studio' }));
    await assertFails(updateDoc(doc(dbFor('bob'), 'communities', community.id), { name: 'Hijacked' }));
  });

  it('scopes moderation reports and appeals to their owner and rejects forged review state', async () => {
    const report = {
      reporterId: 'alice', targetType: 'post', targetId: 'post-1', reason: 'Spam: repeated links',
      status: 'pending', policyVersion: '2026-10', source: 'client-report', createdAt: serverTimestamp()
    };
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'moderationReports', 'report-1'), report));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'moderationReports', 'report-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'moderationReports', 'report-1')));
    await assertFails(setDoc(doc(dbFor('bob'), 'moderationReports', 'report-2'), report));
    await assertFails(setDoc(doc(dbFor('alice'), 'moderationReports', 'report-3'), { ...report, status: 'resolved' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'moderationReports', 'report-4'), { ...report, targetType: 'account' }));

    const appeal = {
      userId: 'alice', targetType: 'post', targetId: 'post-1', reason: 'This content is original and complies with the policy.',
      status: 'pending', policyVersion: '2026-10', createdAt: serverTimestamp()
    };
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'moderationAppeals', 'appeal-1'), appeal));
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
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'accountLifecycleRequests', 'delete-1'), deletionRequest));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'accountLifecycleRequests', 'delete-1')));
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
});
