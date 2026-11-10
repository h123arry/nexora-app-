import {
  addDoc, arrayUnion, collection, collectionGroup, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where, runTransaction, type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './config';
import { uploadMediaFile, deleteMediaFile } from './storageService';

export type WorldWeaveVisibility = 'public' | 'private';
export interface WorldWeave {
  id: string; ownerId: string; ownerName: string; title: string; description: string;
  visibility: WorldWeaveVisibility; participantIds: string[]; memberCount: number;
  momentCount: number; createdAt?: unknown; updatedAt?: unknown;
}
export interface WorldWeaveInvite { id: string; weaveId: string; inviteeId: string; invitedBy: string; ownerName: string; weaveTitle: string; weaveDescription: string; visibility: WorldWeaveVisibility; status: 'pending' | 'accepted'; createdAt?: unknown; }\nexport interface WorldWeaveMoment {
  id: string; weaveId: string; authorId: string; authorName: string; authorUsername: string;
  authorAvatar: string; text: string; mediaType: 'text' | 'image' | 'video';
  mediaUrl?: string; storagePath?: string; createdAt?: unknown;
}
function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to use WorldWeave.');
  return user;
}
export function subscribeToMyWorldWeaves(userId: string, onItems: (items: WorldWeave[]) => void, onError: (error: Error) => void): Unsubscribe {
  if (auth.currentUser?.uid !== userId) throw new Error('Your account must match the WorldWeave profile.');
  return onSnapshot(query(collection(db, 'worldWeaves'), where('participantIds', 'array-contains', userId), orderBy('updatedAt', 'desc')),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeave))), onError);
}
export function subscribeToPublicWorldWeaves(onItems: (items: WorldWeave[]) => void, onError: (error: Error) => void): Unsubscribe {
  requireUser();
  return onSnapshot(query(collection(db, 'worldWeaves'), where('visibility', '==', 'public'), orderBy('updatedAt', 'desc')),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeave))), onError);
}
export function subscribeToWorldWeaveMoments(weaveId: string, onItems: (items: WorldWeaveMoment[]) => void, onError: (error: Error) => void): Unsubscribe {
  requireUser();
  return onSnapshot(query(collection(db, 'worldWeaves', weaveId, 'moments'), orderBy('createdAt', 'asc')),
    snapshot => onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorldWeaveMoment))), onError);
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
export async function inviteToWorldWeave(weaveId: string, inviteeId: string): Promise<void> {
  const user = requireUser();
  if (!inviteeId || inviteeId === user.uid) throw new Error('Choose another NEXORA member to invite.');
  await setDoc(doc(db, 'worldWeaves', weaveId, 'invites', inviteeId), {
    weaveId, inviteeId, invitedBy: user.uid, status: 'pending', createdAt: serverTimestamp(),
  });
}
export async function acceptWorldWeaveInvite(weaveId: string): Promise<WorldWeave> {
  const user = requireUser();
  await runTransaction(db, async transaction => {
    const weaveRef = doc(db, 'worldWeaves', weaveId);
    const inviteRef = doc(db, 'worldWeaves', weaveId, 'invites', user.uid);
    const [weave, invite] = await Promise.all([transaction.get(weaveRef), transaction.get(inviteRef)]);
    if (!weave.exists() || !invite.exists() || invite.data().status !== 'pending' || invite.data().inviteeId !== user.uid) {
      throw new Error('This WorldWeave invitation is no longer available.');
    }
    if (weave.data().participantIds?.includes(user.uid)) return;
    transaction.update(inviteRef, { status: 'accepted', acceptedAt: serverTimestamp() });
    transaction.update(weaveRef, { participantIds: arrayUnion(user.uid), memberCount: increment(1), updatedAt: serverTimestamp() });
  });
}
export async function addWorldWeaveTextMoment(weaveId: string, author: { id: string; name: string; username: string; avatar: string }, text: string): Promise<void> {
  const user = requireUser(); const cleanText = text.trim();
  if (user.uid !== author.id) throw new Error('The signed-in account must own this contribution.');
  if (!cleanText || cleanText.length > 2000) throw new Error('A moment must contain 1 to 2,000 characters.');
  await addDoc(collection(db, 'worldWeaves', weaveId, 'moments'), { weaveId, authorId: user.uid,
    authorName: author.name.slice(0, 80), authorUsername: author.username.slice(0, 40), authorAvatar: author.avatar || '',
    text: cleanText, mediaType: 'text', createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'worldWeaves', weaveId), { momentCount: increment(1), updatedAt: serverTimestamp() });
}
export async function addWorldWeaveMediaMoment(weaveId: string, author: { id: string; name: string; username: string; avatar: string },
  file: File, text: string, onProgress?: (progress: number) => void): Promise<void> {
  const user = requireUser();
  if (user.uid !== author.id) throw new Error('The signed-in account must own this contribution.');
  if (!file || file.size <= 0) throw new Error('Choose a photo or video first.');
  if (text.trim().length > 2000) throw new Error('Moment text must be 2,000 characters or fewer.');
  const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
  if (!mediaType) throw new Error('WorldWeave supports image and video contributions.');
  const momentRef = doc(collection(db, 'worldWeaves', weaveId, 'moments'));
  let uploaded: Awaited<ReturnType<typeof uploadMediaFile>> | null = null;
  try {
    uploaded = await uploadMediaFile({ file, userId: user.uid, mediaId: momentRef.id, metadata: { purpose: 'worldweave', weaveId, momentId: momentRef.id }, onProgress });
    await setDoc(momentRef, { weaveId, authorId: user.uid, authorName: author.name.slice(0, 80),
      authorUsername: author.username.slice(0, 40), authorAvatar: author.avatar || '', text: text.trim(),
      mediaType, mediaUrl: uploaded.downloadUrl, storagePath: uploaded.storagePath, createdAt: serverTimestamp() });
    await updateDoc(doc(db, 'worldWeaves', weaveId), { momentCount: increment(1), updatedAt: serverTimestamp() });
  } catch (error) {
    if (uploaded) await Promise.allSettled([deleteMediaFile(uploaded.storagePath)]);
    throw error;
  }
}

export async function inviteToWorldWeaveByUsername(weaveId: string, username: string): Promise<void> {
  const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{2,30}$/.test(cleanUsername)) throw new Error('Enter a valid NEXORA username.');
  const matches = await getDocs(query(collection(db, 'publicProfiles'), where('username', '==', cleanUsername), limit(2)));
  if (matches.size !== 1) throw new Error(matches.empty ? 'No NEXORA member was found with that username.' : 'That username is not unique.');
  await inviteToWorldWeave(weaveId, matches.docs[0].id);
}
