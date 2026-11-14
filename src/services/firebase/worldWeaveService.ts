import {
  arrayUnion, collection, collectionGroup, deleteDoc, doc, documentId, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, startAfter,
  serverTimestamp, setDoc, updateDoc, where, runTransaction, writeBatch, type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './config';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import { uploadMediaFile } from './storageService';

export type WorldWeaveVisibility = 'public' | 'private';
export const MAX_WORLDWEAVE_MEMBERS = 500;
export interface WorldWeave {
  id: string; ownerId: string; ownerName: string; title: string; description: string;
  visibility: WorldWeaveVisibility; participantIds: string[]; memberCount: number;
  momentCount: number; createdAt?: unknown; updatedAt?: unknown;
}
export interface WorldWeaveInvite { id: string; weaveId: string; inviteeId: string; invitedBy: string; ownerName: string; weaveTitle: string; status: 'pending' | 'accepted'; createdAt?: unknown; }
export interface WorldWeaveMoment {
  id: string; weaveId: string; authorId: string; authorName: string; authorUsername: string;
  authorAvatar: string; text: string; mediaType: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string; storagePath?: string; createdAt?: unknown;
}
function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to use WorldWeave.');
  return user;
}
export function subscribeToMyWorldWeaves(userId: string, onItems: (items: WorldWeave[]) => void, onError: (error: Error) => void): Unsubscribe {
  if (auth.currentUser?.uid !== userId) throw new Error('Your account must match the WorldWeave profile.');
  return onSnapshot(query(collection(db, 'worldWeaves'), where('participantIds', 'array-contains', userId), orderBy('updatedAt', 'desc'), limit(100)),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeave))), onError);
}
export function subscribeToPublicWorldWeaves(onItems: (items: WorldWeave[]) => void, onError: (error: Error) => void): Unsubscribe {
  requireUser();
  return onSnapshot(query(collection(db, 'worldWeaves'), where('visibility', '==', 'public'), orderBy('updatedAt', 'desc'), limit(50)),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeave))), onError);
}
export function subscribeToWorldWeaveMoments(weaveId: string, onItems: (items: WorldWeaveMoment[]) => void, onError: (error: Error) => void): Unsubscribe {
  requireUser();
  return onSnapshot(query(collection(db, 'worldWeaves', weaveId, 'moments'), orderBy('createdAt', 'desc'), orderBy(documentId(), 'desc'), limit(100)),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeaveMoment)).reverse()), onError);
}
export async function fetchOlderWorldWeaveMoments(weaveId: string, before: WorldWeaveMoment): Promise<WorldWeaveMoment[]> {
  requireUser();
  if (!before.createdAt) return [];
  const snapshot = await getDocs(query(
    collection(db, 'worldWeaves', weaveId, 'moments'),
    orderBy('createdAt', 'desc'), orderBy(documentId(), 'desc'),
    startAfter(before.createdAt, before.id), limit(100),
  ));
  return snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeaveMoment)).reverse();
}
export async function createWorldWeave(input: { title: string; description: string; visibility: WorldWeaveVisibility; ownerName: string }): Promise<string> {
  const user = requireUser();
  const title = input.title.trim(); const description = input.description.trim();
  if (title.length < 3 || title.length > 90) throw new Error('Give your WorldWeave a title between 3 and 90 characters.');
  if (description.length > 500) throw new Error('Description must be 500 characters or fewer.');
  const ref = doc(collection(db, 'worldWeaves'));
  await setDoc(ref, { id: ref.id, ownerId: user.uid, ownerName: input.ownerName.slice(0, 80), title, description,
    visibility: input.visibility, participantIds: [user.uid], memberCount: 1, momentCount: 0,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateWorldWeaveDetails(weaveId: string, input: { title: string; description: string; visibility: WorldWeaveVisibility }): Promise<void> {
  const user = requireUser();
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3 || title.length > 90) throw new Error('Title must be between 3 and 90 characters.');
  if (description.length > 500) throw new Error('Description must be 500 characters or fewer.');
  const weaveRef = doc(db, 'worldWeaves', weaveId);
  const snapshot = await getDoc(weaveRef);
  if (!snapshot.exists() || snapshot.data().ownerId !== user.uid) throw new Error('Only the owner can edit this WorldWeave.');
  await updateDoc(weaveRef, { title, description, visibility: input.visibility, updatedAt: serverTimestamp() });
}
export async function joinPublicWorldWeave(weaveId: string): Promise<WorldWeave> {
  const user = requireUser();
  return runTransaction(db, async transaction => {
    const weaveRef = doc(db, 'worldWeaves', weaveId);
    const snapshot = await transaction.get(weaveRef);
    if (!snapshot.exists() || snapshot.data().visibility !== 'public') {
      throw new Error('This public WorldWeave is no longer available.');
    }
    const data = snapshot.data();
    const participantIds: string[] = Array.isArray(data.participantIds) ? data.participantIds : [];
    const alreadyJoined = participantIds.includes(user.uid);
    if (!alreadyJoined && participantIds.length >= MAX_WORLDWEAVE_MEMBERS) throw new Error('This WorldWeave has reached its contributor limit.');
    if (!alreadyJoined) transaction.update(weaveRef, {
      participantIds: arrayUnion(user.uid), memberCount: increment(1), updatedAt: serverTimestamp(),
    });
    return { ...data, id: weaveId, participantIds: [...participantIds, ...(alreadyJoined ? [] : [user.uid])],
      memberCount: participantIds.length + (alreadyJoined ? 0 : 1) } as WorldWeave;
  });
}
export async function inviteToWorldWeave(weaveId: string, inviteeId: string): Promise<void> {
  const user = requireUser();
  if (!inviteeId || inviteeId === user.uid) throw new Error('Choose another NEXORA member to invite.');
  const weaveRef = doc(db, 'worldWeaves', weaveId);
  const inviteRef = doc(db, 'worldWeaves', weaveId, 'invites', inviteeId);
  await runTransaction(db, async transaction => {
    const [weaveSnapshot, inviteSnapshot] = await Promise.all([
      transaction.get(weaveRef), transaction.get(inviteRef),
    ]);
    if (!weaveSnapshot.exists()) throw new Error('This WorldWeave no longer exists.');
    const weave = weaveSnapshot.data();
    if (weave.ownerId !== user.uid) throw new Error('Only the WorldWeave owner can invite contributors.');
    const participantIds: string[] = Array.isArray(weave.participantIds) ? weave.participantIds : [];
    if (participantIds.includes(inviteeId)) throw new Error('That member is already contributing.');
    if (participantIds.length >= MAX_WORLDWEAVE_MEMBERS) throw new Error('This WorldWeave has reached its contributor limit.');
    if (inviteSnapshot.exists()) throw new Error('An invitation already exists for this member.');
    transaction.set(inviteRef, { weaveId, inviteeId, invitedBy: user.uid, ownerName: String(weave.ownerName || '').slice(0, 80),
      weaveTitle: String(weave.title || '').slice(0, 90), status: 'pending', createdAt: serverTimestamp() });
  });
}
export function subscribeToWorldWeaveInvites(weaveId: string, onItems: (items: WorldWeaveInvite[]) => void, onError: (error: Error) => void): Unsubscribe {
  requireUser();
  return onSnapshot(query(collection(db, 'worldWeaves', weaveId, 'invites'), where('status', '==', 'pending'), limit(50)),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeaveInvite))), onError);
}
export async function revokeWorldWeaveInvite(weaveId: string, inviteeId: string): Promise<void> {
  const user = requireUser();
  const weave = await getDoc(doc(db, 'worldWeaves', weaveId));
  if (!weave.exists() || weave.data().ownerId !== user.uid) throw new Error('Only the WorldWeave owner can revoke invitations.');
  await deleteDoc(doc(db, 'worldWeaves', weaveId, 'invites', inviteeId));
}
export function subscribeToMyWorldWeaveInvites(userId: string, onItems: (items: WorldWeaveInvite[]) => void, onError: (error: Error) => void): Unsubscribe {
  if (auth.currentUser?.uid !== userId) throw new Error('Your account must match the invitation recipient.');
  return onSnapshot(query(collectionGroup(db, 'invites'), where('inviteeId', '==', userId)),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeaveInvite)).filter(item => item.status === 'pending')), onError);
}
export async function inviteToWorldWeaveByUsername(weaveId: string, username: string): Promise<void> {
  const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{2,30}$/.test(cleanUsername)) throw new Error('Enter a valid NEXORA username.');
  const matches = await getDocs(query(collection(db, 'publicProfiles'), where('username', '==', cleanUsername), limit(2)));
  if (matches.size !== 1) throw new Error(matches.empty ? 'No NEXORA member was found with that username.' : 'That username is not unique.');
  await inviteToWorldWeave(weaveId, matches.docs[0].id);
}
export async function acceptWorldWeaveInvite(weaveId: string): Promise<WorldWeave> {
  const user = requireUser();
  return runTransaction(db, async transaction => {
    const weaveRef = doc(db, 'worldWeaves', weaveId);
    const inviteRef = doc(db, 'worldWeaves', weaveId, 'invites', user.uid);
    const [weave, invite] = await Promise.all([transaction.get(weaveRef), transaction.get(inviteRef)]);
    if (!weave.exists() || !invite.exists() || invite.data().status !== 'pending' || invite.data().inviteeId !== user.uid) {
      throw new Error('This WorldWeave invitation is no longer available.');
    }
    const data = weave.data();
    const participantIds: string[] = Array.isArray(data.participantIds) ? data.participantIds : [];
    const alreadyJoined = participantIds.includes(user.uid);
    if (!alreadyJoined && participantIds.length >= MAX_WORLDWEAVE_MEMBERS) throw new Error('This WorldWeave has reached its contributor limit.');
    transaction.update(inviteRef, { status: 'accepted', acceptedAt: serverTimestamp() });
    if (!alreadyJoined) {
      transaction.update(weaveRef, { participantIds: arrayUnion(user.uid), memberCount: increment(1), updatedAt: serverTimestamp() });
    }
    return { ...data, id: weave.id, participantIds: [...participantIds, ...(alreadyJoined ? [] : [user.uid])],
      memberCount: participantIds.length + (alreadyJoined ? 0 : 1) } as WorldWeave;
  });
}
export async function declineWorldWeaveInvite(weaveId: string): Promise<void> {
  const user = requireUser();
  await deleteDoc(doc(db, 'worldWeaves', weaveId, 'invites', user.uid));
}
export async function addWorldWeaveTextMoment(weaveId: string, author: { id: string; name: string; username: string; avatar: string }, text: string): Promise<void> {
  const user = requireUser(); const cleanText = text.trim();
  if (user.uid !== author.id) throw new Error('The signed-in account must own this contribution.');
  if (!cleanText || cleanText.length > 2000) throw new Error('A moment must contain 1 to 2,000 characters.');
  const momentRef = doc(collection(db, 'worldWeaves', weaveId, 'moments'));
  const batch = writeBatch(db);
  batch.set(momentRef, { weaveId, authorId: user.uid,
    authorName: author.name.slice(0, 80), authorUsername: author.username.slice(0, 40), authorAvatar: author.avatar || '',
    text: cleanText, mediaType: 'text', createdAt: serverTimestamp() });
  batch.update(doc(db, 'worldWeaves', weaveId), { momentCount: increment(1), updatedAt: serverTimestamp(), lastMomentId: momentRef.id });
  await batch.commit();
}
export async function addWorldWeaveMediaMoment(weaveId: string, author: { id: string; name: string; username: string; avatar: string },
  file: File, text: string, onProgress?: (progress: number) => void): Promise<void> {
  const user = requireUser();
  if (user.uid !== author.id) throw new Error('The signed-in account must own this contribution.');
  if (!file || file.size <= 0) throw new Error('Choose a photo or video first.');
  if (text.trim().length > 2000) throw new Error('Moment text must be 2,000 characters or fewer.');
  const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : null;
  if (!mediaType) throw new Error('Choose a supported photo, video or voice note.');
  const momentRef = doc(collection(db, 'worldWeaves', weaveId, 'moments'));
  let uploaded: Awaited<ReturnType<typeof uploadMediaFile>> | null = null;
  try {
    uploaded = await uploadMediaFile({ file, userId: user.uid, mediaId: momentRef.id, metadata: { purpose: 'worldweave', weaveId, momentId: momentRef.id }, onProgress });
    const batch = writeBatch(db);
    batch.set(momentRef, { weaveId, authorId: user.uid, authorName: author.name.slice(0, 80),
      authorUsername: author.username.slice(0, 40), authorAvatar: author.avatar || '', text: text.trim(),
      mediaType, mediaUrl: uploaded.downloadUrl, storagePath: uploaded.storagePath, createdAt: serverTimestamp() });
    batch.update(doc(db, 'worldWeaves', weaveId), { momentCount: increment(1), updatedAt: serverTimestamp(), lastMomentId: momentRef.id });
    await batch.commit();
  } catch (error) {
    if (uploaded) {
      const cleanup = httpsCallable(functions, 'cleanupUnpublishedWorldWeaveMedia');
      await Promise.allSettled([cleanup({ weaveId, momentId: momentRef.id })]);
    }
    throw error;
  }
}

export async function deleteWorldWeaveMoment(weaveId: string, moment: WorldWeaveMoment): Promise<void> {
  const user = requireUser();
  if (moment.authorId !== user.uid) {
    const weave = await getDoc(doc(db, 'worldWeaves', weaveId));
    if (!weave.exists() || weave.data().ownerId !== user.uid) {
      throw new Error('Only the contributor or WorldWeave owner can remove this moment.');
    }
  }
  await deleteDoc(doc(db, 'worldWeaves', weaveId, 'moments', moment.id));
  // A trusted Firestore delete trigger removes the Storage object and its
  // mediaAssets record. Completed media assets are intentionally not client-deletable.
}

export async function leaveWorldWeave(weaveId: string): Promise<void> {
  const user = requireUser();
  if (!weaveId || weaveId.length > 128 || weaveId.includes('/')) throw new Error('Choose a valid WorldWeave.');
  const action = httpsCallable(functions, 'leaveWorldWeave');
  await action({ weaveId });
}

export async function removeWorldWeaveContributor(weaveId: string, memberId: string): Promise<void> {
  const user = requireUser();
  if (!weaveId || weaveId.length > 128 || weaveId.includes('/') || !memberId || memberId.length > 128 || memberId.includes('/')) {
    throw new Error('Choose a valid contributor.');
  }
  const action = httpsCallable(functions, 'removeWorldWeaveContributor');
  await action({ weaveId, memberId });
}

export async function transferWorldWeaveOwnership(weaveId: string, memberId: string): Promise<void> {
  const user = requireUser();
  if (!weaveId || weaveId.length > 128 || weaveId.includes('/') || !memberId || memberId.length > 128 || memberId.includes('/')) {
    throw new Error('Choose a valid new owner.');
  }
  const action = httpsCallable(functions, 'transferWorldWeaveOwnership');
  await action({ weaveId, memberId, actorUid: user.uid });
}

export interface WorldWeaveContributor {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  role: 'owner' | 'contributor';
}

export async function listWorldWeaveContributors(weaveId: string): Promise<WorldWeaveContributor[]> {
  const user = requireUser();
  if (!weaveId || weaveId.length > 128 || weaveId.includes('/')) throw new Error('Choose a valid WorldWeave.');
  const snapshot = await getDoc(doc(db, 'worldWeaves', weaveId));
  if (!snapshot.exists()) throw new Error('This WorldWeave no longer exists.');
  const data = snapshot.data();
  const ids = Array.isArray(data.participantIds) ? [...new Set(data.participantIds.filter((id): id is string => typeof id === 'string'))] : [];
  if (data.ownerId !== user.uid && !ids.includes(user.uid)) throw new Error('Join this WorldWeave before viewing its contributors.');
  const contributors = await Promise.all(ids.slice(0, 100).map(async userId => {
    const profile = await getDoc(doc(db, 'publicProfiles', userId));
    const value = profile.data() || {};
    return {
      userId,
      name: String(value.name || value.username || 'NEXORA member').slice(0, 80),
      username: String(value.username || '').slice(0, 40),
      avatar: String(value.avatar || '').slice(0, 2048),
      role: (data.ownerId === userId ? 'owner' : 'contributor') as 'owner' | 'contributor',
    };
  }));
  return contributors;
}

export interface WorldWeaveActivity {
  id: string;
  actorUid: string;
  targetUid?: string;
  action: 'member_left' | 'member_removed' | 'ownership_transferred' | string;
  createdAt?: unknown;
}

export function subscribeToWorldWeaveActivity(
  weaveId: string,
  onItems: (items: WorldWeaveActivity[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  requireUser();
  return onSnapshot(
    query(collection(db, 'worldWeaves', weaveId, 'activity'), orderBy('createdAt', 'desc'), limit(20)),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeaveActivity))),
    onError,
  );
}
