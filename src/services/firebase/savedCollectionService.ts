import {
  collection, doc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, writeBatch,
} from 'firebase/firestore';
import { auth, db } from './config';

const MAX_COLLECTIONS = 50;
const MAX_ITEMS_PER_COLLECTION = 500;
const MAX_NAME_LENGTH = 48;

export interface SavedCollection {
  id: string;
  name: string;
  itemCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function requireOwner(uid: string): void {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('Sign in to manage your saved collections.');
  }
}

function validateName(value: string): string {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new Error('Collection names must be between 1 and 48 characters.');
  }
  return name;
}

function validateId(value: string): void {
  if (!value || value.length > 150 || value.includes('/')) throw new Error('Invalid saved item.');
}

export async function listSavedCollections(uid: string): Promise<SavedCollection[]> {
  requireOwner(uid);
  const snapshot = await getDocs(query(
    collection(db, 'users', uid, 'savedCollections'),
    orderBy('updatedAt', 'desc'),
    limit(MAX_COLLECTIONS),
  ));
  return snapshot.docs.map(item => ({
    id: item.id,
    name: String(item.data().name || 'Untitled collection'),
    itemCount: Number(item.data().itemCount || 0),
    createdAt: item.data().createdAt,
    updatedAt: item.data().updatedAt,
  }));
}

export async function createSavedCollection(uid: string, rawName: string): Promise<string> {
  requireOwner(uid);
  const name = validateName(rawName);
  const parent = collection(db, 'users', uid, 'savedCollections');
  const existing = await getDocs(query(parent, limit(MAX_COLLECTIONS)));
  if (existing.size >= MAX_COLLECTIONS) throw new Error('You have reached the 50-collection limit.');
  if (existing.docs.some(item => String(item.data().name || '').toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error('A collection with that name already exists.');
  }
  const ref = doc(parent);
  await setDoc(ref, { name, itemCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function listSavedCollectionPostIds(uid: string, collectionId: string): Promise<string[]> {
  requireOwner(uid);
  validateId(collectionId);
  const items = await getDocs(query(
    collection(db, 'users', uid, 'savedCollections', collectionId, 'items'),
    limit(MAX_ITEMS_PER_COLLECTION),
  ));
  return items.docs
    .filter(item => item.data().itemType === 'post' && typeof item.data().itemId === 'string')
    .map(item => String(item.data().itemId));
}

export async function addPostToSavedCollection(uid: string, collectionId: string, postId: string): Promise<boolean> {
  requireOwner(uid);
  validateId(collectionId);
  validateId(postId);
  const parentRef = doc(db, 'users', uid, 'savedCollections', collectionId);
  const itemRef = doc(parentRef, 'items', `post_${postId}`);
  const postRef = doc(db, 'posts', postId);
  return runTransaction(db, async transaction => {
    const [parent, item, post] = await Promise.all([
      transaction.get(parentRef), transaction.get(itemRef), transaction.get(postRef),
    ]);
    if (!parent.exists()) throw new Error('This collection no longer exists.');
    if (!post.exists() || post.data().audience !== 'public') throw new Error('This public post is unavailable.');
    if (item.exists()) return false;
    const count = Number(parent.data().itemCount || 0);
    if (count >= MAX_ITEMS_PER_COLLECTION) throw new Error('This collection has reached its 500-item limit.');
    transaction.set(itemRef, { itemType: 'post', itemId: postId, createdAt: serverTimestamp() });
    transaction.update(parentRef, { itemCount: count + 1, updatedAt: serverTimestamp() });
    return true;
  });
}

export async function removeSavedCollection(uid: string, collectionId: string): Promise<void> {
  requireOwner(uid);
  validateId(collectionId);
  const parentRef = doc(db, 'users', uid, 'savedCollections', collectionId);
  const items = await getDocs(query(collection(parentRef, 'items'), limit(MAX_ITEMS_PER_COLLECTION)));
  for (let index = 0; index < items.docs.length; index += 450) {
    const batch = writeBatch(db);
    items.docs.slice(index, index + 450).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
  await writeBatch(db).delete(parentRef).commit();
}
