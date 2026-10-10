import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where
} from 'firebase/firestore';
import { auth, db } from './config';
import { User } from '../../types';

export interface NexoraStory {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  caption: string;
  mediaType: 'text';
  privacy: 'everyone';
  createdAt: Timestamp | Date | number;
  expiresAt: Timestamp | Date | number;
}

const STORIES_COLLECTION = 'stories';
const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

function timestampMillis(value: NexoraStory['createdAt'] | NexoraStory['expiresAt']): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

export function subscribeToPublicStories(
  onStories: (stories: NexoraStory[]) => void,
  onError: (error: Error) => void
) {
  if (!auth.currentUser) throw new Error('Sign in to read stories.');

  const storiesQuery = query(
    collection(db, STORIES_COLLECTION),
    where('privacy', '==', 'everyone'),
    where('expiresAt', '>', Timestamp.fromMillis(Date.now())),
    orderBy('expiresAt', 'asc'),
    limit(100)
  );

  return onSnapshot(
    storiesQuery,
    (snapshot) => {
      const now = Date.now();
      const stories = snapshot.docs
        .map((storyDoc) => ({ ...storyDoc.data(), id: storyDoc.id } as NexoraStory))
        .filter((story) => timestampMillis(story.expiresAt) > now)
        .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
      onStories(stories);
    },
    onError
  );
}

export async function createTextStory(user: User, caption: string): Promise<string> {
  const signedInUser = auth.currentUser;
  const cleanCaption = caption.trim();
  if (!signedInUser || signedInUser.uid !== user.id) throw new Error('The signed-in account does not match the story author.');
  if (!cleanCaption || cleanCaption.length > 500) throw new Error('Story text must be between 1 and 500 characters.');

  const storyRef = doc(collection(db, STORIES_COLLECTION));
  await setDoc(storyRef, {
    id: storyRef.id,
    userId: signedInUser.uid,
    name: user.name,
    username: user.username,
    avatar: user.avatar || '',
    caption: cleanCaption,
    mediaType: 'text',
    privacy: 'everyone',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + STORY_LIFETIME_MS)
  });
  return storyRef.id;
}

export async function deleteStory(storyId: string): Promise<void> {
  const signedInUser = auth.currentUser;
  if (!signedInUser) throw new Error('Sign in to delete a story.');
  await deleteDoc(doc(db, STORIES_COLLECTION, storyId));
}
