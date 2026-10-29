import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
import { deleteMediaFile, uploadMediaFile } from './storageService';

export interface NexoraStory {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  caption: string;
  mediaType: 'text' | 'image' | 'video';
  privacy: 'everyone';
  mediaUrl?: string;
  storagePath?: string;
  mediaId?: string;
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

export async function createMediaStory(
  user: User,
  file: File,
  caption: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const signedInUser = auth.currentUser;
  const cleanCaption = caption.trim();
  if (!signedInUser || signedInUser.uid !== user.id) {
    throw new Error('The signed-in account does not match the story author.');
  }
  if (cleanCaption.length > 500) throw new Error('Story captions must be 500 characters or fewer.');
  if (!file || file.size <= 0) throw new Error('Choose a non-empty image or video.');
  const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
  if (!mediaType) throw new Error('Stories support image and video files only.');

  const storyRef = doc(collection(db, STORIES_COLLECTION));
  let upload: Awaited<ReturnType<typeof uploadMediaFile>> | null = null;
  try {
    upload = await uploadMediaFile({
      file,
      userId: signedInUser.uid,
      mediaId: storyRef.id,
      metadata: { purpose: 'story', storyId: storyRef.id },
      onProgress,
      signal,
    });
    await setDoc(storyRef, {
      id: storyRef.id,
      userId: signedInUser.uid,
      name: user.name,
      username: user.username,
      avatar: user.avatar || '',
      caption: cleanCaption,
      mediaType,
      mediaUrl: upload.downloadUrl,
      storagePath: upload.storagePath,
      mediaId: upload.mediaId,
      privacy: 'everyone',
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STORY_LIFETIME_MS),
    });
    return storyRef.id;
  } catch (error) {
    if (upload) {
      await Promise.allSettled([
        deleteMediaFile(upload.storagePath),
        deleteDoc(doc(db, 'mediaAssets', upload.mediaId)),
      ]);
    }
    throw error;
  }
}

export async function markStoryViewed(story: NexoraStory): Promise<void> {
  const signedInUser = auth.currentUser;
  if (!signedInUser) throw new Error('Sign in to view stories.');
  if (timestampMillis(story.expiresAt) <= Date.now()) return;
  await setDoc(doc(db, STORIES_COLLECTION, story.id, 'views', signedInUser.uid), {
    storyId: story.id,
    viewerId: signedInUser.uid,
    createdAt: serverTimestamp(),
  });
}

export async function deleteStory(storyId: string): Promise<void> {
  const signedInUser = auth.currentUser;
  if (!signedInUser) throw new Error('Sign in to delete a story.');
  const storyRef = doc(db, STORIES_COLLECTION, storyId);
  const snapshot = await getDoc(storyRef);
  if (!snapshot.exists() || snapshot.data().userId !== signedInUser.uid) {
    throw new Error('You can only delete your own story.');
  }
  const story = snapshot.data() as NexoraStory;
  await deleteDoc(storyRef);
  if (story.storagePath) {
    await Promise.allSettled([
      deleteMediaFile(story.storagePath),
      story.mediaId ? deleteDoc(doc(db, 'mediaAssets', story.mediaId)) : Promise.resolve(),
    ]);
  }
}
