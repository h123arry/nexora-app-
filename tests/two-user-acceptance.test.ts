import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

(globalThis as typeof globalThis & { __NEXORA_FIREBASE_EMULATORS__?: boolean }).__NEXORA_FIREBASE_EMULATORS__ = true;

const { auth, db } = await import('../src/lib/firebase.ts');
const { AuthService } = await import('../src/services/firebase/authService.ts');
const { serializeOutgoingMessage } = await import('../src/utils/messageSerialization.ts');

const testPassword = 'Nexora-Two-User-Test-42!';
const createdAccounts: Array<{ email: string; uid: string }> = [];

async function registerAccount(label: 'alice' | 'bob') {
  const nonce = `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const email = `nexora-${label}-${nonce}@example.test`;
  const username = `${label.slice(0, 2)}${nonce.slice(-10)}`.toLowerCase();
  const result = await AuthService.registerWithEmail(email, testPassword, label, username);
  const account = { email, uid: result.firebaseUser.uid, username };
  createdAccounts.push(account);
  return account;
}

async function login(account: { email: string; uid: string }) {
  await signOut(auth);
  const result = await AuthService.loginWithEmail(account.email, testPassword);
  assert.equal(result.firebaseUser.uid, account.uid);
  assert.equal(auth.currentUser?.uid, account.uid);
}

async function cleanupCreatedAccounts() {
  await signOut(auth).catch(() => undefined);
  const accounts = [...createdAccounts].reverse();
  createdAccounts.length = 0;
  for (const account of accounts) {
    const credential = await signInWithEmailAndPassword(auth, account.email, testPassword).catch(() => null);
    if (credential) await deleteUser(credential.user).catch(() => undefined);
  }
  await signOut(auth).catch(() => undefined);
}

function isPermissionDenied(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error
    && (error as { code?: string }).code === 'permission-denied');
}

test('two emulator accounts retain separate identities and exercise public social and private messaging boundaries', async () => {
  assert.ok(db, 'Firebase emulator Firestore must be configured');
  await signOut(auth);
  const alice = await registerAccount('alice');
  const bob = await registerAccount('bob');
  assert.notEqual(alice.uid, bob.uid);

  const postId = `two-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const chatId = `two-user-chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const followRef = doc(db, 'follows', `${alice.uid}_${bob.uid}`);
  const postRef = doc(db, 'posts', postId);
  const chatRef = doc(db, 'chats', chatId);

  try {
    await login(alice);

    const bobPublicProfile = await getDoc(doc(db, 'publicProfiles', bob.uid));
    assert.equal(bobPublicProfile.exists(), true);
    const searchResults = await getDocs(query(collection(db, 'publicProfiles'), where('username', '==', bob.username)));
    assert.ok(searchResults.docs.some((profileDoc) => profileDoc.id === bob.uid));
    await assert.rejects(getDoc(doc(db, 'users', bob.uid)), isPermissionDenied);

    await setDoc(followRef, {
      followerId: alice.uid,
      followingId: bob.uid,
      createdAt: serverTimestamp(),
    });
    assert.equal((await getDoc(followRef)).exists(), true);

    await setDoc(postRef, {
      id: postId,
      userId: alice.uid,
      authorId: alice.uid,
      username: alice.username,
      name: 'alice',
      avatar: '',
      audience: 'public',
      content: 'Two-user emulator acceptance post',
      likes: 0,
      commentsCount: 0,
      comments: [],
    });

    await setDoc(chatRef, {
      id: chatId,
      participants: [alice.uid, bob.uid],
      lastMessage: '',
      lastTimestamp: new Date().toISOString(),
      unreadCount: 0,
    });
    const aliceMessage = serializeOutgoingMessage({
      id: 'alice-message',
      chatId,
      senderId: alice.uid,
      content: 'Hello Bob',
      timestamp: new Date().toISOString(),
      status: 'sending',
    });
    assert.equal(aliceMessage.status, 'sent');
    await setDoc(doc(db, `chats/${chatId}/messages`, aliceMessage.id), aliceMessage);

    await login(bob);
    assert.equal((await getDoc(followRef)).exists(), true);
    assert.equal((await getDoc(doc(db, 'chats', chatId))).exists(), true);
    assert.equal((await getDoc(doc(db, `chats/${chatId}/messages`, 'alice-message'))).exists(), true);
    assert.equal((await getDocs(query(collection(db, 'posts'), where('audience', '==', 'public'))))
      .docs.some((postDoc) => postDoc.id === postId), true);
    await updateDoc(doc(db, `chats/${chatId}/messages`, 'alice-message'), { status: 'delivered' });
    await updateDoc(doc(db, `chats/${chatId}/messages`, 'alice-message'), { status: 'read' });

    const bobComment = {
      id: 'bob-comment',
      postId,
      userId: bob.uid,
      username: bob.username,
      name: 'bob',
      avatar: '',
      content: 'Reply from Bob',
      timestamp: new Date().toISOString(),
      likes: 0,
    };
    await updateDoc(postRef, { commentsCount: 1, comments: [bobComment] });
    await assert.rejects(updateDoc(postRef, { likes: 99 }), isPermissionDenied);
    await assert.rejects(setDoc(doc(db, 'notifications', `forged-${postId}`), {
      userId: alice.uid,
      content: 'Forged notification',
      isRead: false,
    }), isPermissionDenied);

    const bobMessage = {
      id: 'bob-message',
      chatId,
      senderId: bob.uid,
      content: 'Hello Alice',
      timestamp: new Date().toISOString(),
      status: 'sent',
      customMediaType: 'voice',
      voiceAudioUrl: `chats/${chatId}/audio/${bob.uid}/test-audio-1`,
      voiceDuration: '2s',
      fileName: 'voice-note.webm',
    };
    await setDoc(doc(db, `chats/${chatId}/messages`, bobMessage.id), bobMessage);

    await login(alice);
    const updatedPost = await getDoc(postRef);
    assert.equal(updatedPost.data()?.commentsCount, 1);
    assert.equal(updatedPost.data()?.comments?.[0]?.userId, bob.uid);
    assert.equal((await getDoc(doc(db, `chats/${chatId}/messages`, 'bob-message'))).exists(), true);
    await updateDoc(doc(db, `chats/${chatId}/messages`, 'bob-message'), { status: 'read' });
    await deleteDoc(followRef);
    const remainingOutgoingFollows = await getDocs(query(collection(db, 'follows'), where('followerId', '==', alice.uid)));
    assert.equal(remainingOutgoingFollows.docs.some((followDoc) => followDoc.id === followRef.id), false);

    await login(bob);
    const remainingIncomingFollows = await getDocs(query(collection(db, 'follows'), where('followingId', '==', bob.uid)));
    assert.equal(remainingIncomingFollows.docs.some((followDoc) => followDoc.id === followRef.id), false);
    await assert.rejects(getDoc(doc(db, 'users', alice.uid)), isPermissionDenied);
  } finally {
    await signOut(auth).catch(() => undefined);
    const aliceCredential = await signInWithEmailAndPassword(auth, alice.email, testPassword).catch(() => null);
    if (aliceCredential) {
      await deleteDoc(postRef).catch(() => undefined);
      await deleteDoc(followRef).catch(() => undefined);
      await deleteDoc(doc(db, `chats/${chatId}/messages`, 'alice-message')).catch(() => undefined);
    }
    await signOut(auth).catch(() => undefined);
    const bobCredential = await signInWithEmailAndPassword(auth, bob.email, testPassword).catch(() => null);
    if (bobCredential) {
      await deleteDoc(doc(db, `chats/${chatId}/messages`, 'bob-message')).catch(() => undefined);
    }
    await signOut(auth).catch(() => undefined);
    const aliceAgain = await signInWithEmailAndPassword(auth, alice.email, testPassword).catch(() => null);
    if (aliceAgain) await deleteDoc(chatRef).catch(() => undefined);
    await cleanupCreatedAccounts();
  }
});

after(async () => {
  await cleanupCreatedAccounts();
});
