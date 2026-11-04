import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';

export type SavedContentType = 'post' | 'circle' | 'page' | 'event';
export interface SavedContentReference {
  itemType: SavedContentType;
  itemId: string;
  parentId?: string;
  createdAt?: unknown;
}

const MAX_ITEMS = 500;

function requireOwner(uid: string): void {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error('Sign in to manage saved content.');
}
function validId(value: string): void {
  if (!value || value.length > 150 || value.includes('/')) throw new Error('A valid content reference is required.');
}

function itemDocumentId(type: SavedContentType, itemId: string, parentId?: string): string {
  return type === 'event' ? `event_${parentId}_${itemId}` : `${type}_${itemId}`;
}

export async function listSavedContentReferences(uid: string, collectionId: string): Promise<SavedContentReference[]> {
  requireOwner(uid);
  validId(collectionId);
  const snapshot = await getDocs(query(
    collection(db, 'users', uid, 'savedCollections', collectionId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(MAX_ITEMS),
  ));
  return snapshot.docs.map(item => ({
    itemType: item.data().itemType as SavedContentType,
    itemId: String(item.data().itemId || ''),
    ...(typeof item.data().parentId === 'string' ? { parentId: item.data().parentId } : {}),
    createdAt: item.data().createdAt,
  }));
}

export interface SavedContentSummary extends SavedContentReference {
  title: string;
  subtitle: string;
  available: boolean;
}

/** Resolve private collection references to only the public/member-visible labels needed by Saved. */
export async function listSavedContentSummaries(uid: string, collectionId: string): Promise<SavedContentSummary[]> {
  const references = await listSavedContentReferences(uid, collectionId);
  return Promise.all(references.map(async reference => {
    const target = reference.itemType === 'post' ? doc(db, 'posts', reference.itemId)
      : reference.itemType === 'circle' ? doc(db, 'communities', reference.itemId)
      : reference.itemType === 'page' ? doc(db, 'pages', reference.itemId)
      : doc(db, 'communities', reference.parentId!, 'events', reference.itemId);
    try {
      const snapshot = await getDoc(target);
      if (!snapshot.exists()) return { ...reference, title: 'Unavailable item', subtitle: 'This content is no longer available.', available: false };
      const data = snapshot.data();
      const title = String(data.title || data.name || 'Saved ' + reference.itemType).trim().slice(0, 160);
      const subtitle = String(data.description || data.category || data.location || '').trim().slice(0, 240);
      return { ...reference, title, subtitle, available: true };
    } catch {
      return { ...reference, title: 'Saved ' + reference.itemType, subtitle: 'Details are not currently available.', available: false };
    }
  }));
}

/** Save only supported references after checking visibility and membership in the same transaction. */
export async function addContentToSavedCollection(
  uid: string,
  collectionId: string,
  itemType: SavedContentType,
  itemId: string,
  parentId?: string,
): Promise<boolean> {
  requireOwner(uid);
  validId(collectionId); validId(itemId);
  if (!['post', 'circle', 'page', 'event'].includes(itemType)
    || (itemType === 'event' ? !parentId : Boolean(parentId))) {
    throw new Error('This content type cannot be saved.');
  }
  if (parentId) validId(parentId);

  const parentRef = doc(db, 'users', uid, 'savedCollections', collectionId);
  const itemRef = doc(parentRef, 'items', itemDocumentId(itemType, itemId, parentId));
  const targetRef = itemType === 'post' ? doc(db, 'posts', itemId)
    : itemType === 'circle' ? doc(db, 'communities', itemId)
    : itemType === 'page' ? doc(db, 'pages', itemId)
    : doc(db, 'communities', parentId!, 'events', itemId);
  const membershipRef = itemType === 'event' ? doc(db, 'communities', parentId!, 'members', uid) : null;

  return runTransaction(db, async tx => {
    const [parent, item, target, membership] = await Promise.all([
      tx.get(parentRef), tx.get(itemRef), tx.get(targetRef),
      membershipRef ? tx.get(membershipRef) : Promise.resolve(null),
    ]);
    if (!parent.exists()) throw new Error('This saved collection no longer exists.');
    if (item.exists()) return false;
    const data = target.data();
    const allowed = itemType === 'post' ? target.exists() && data?.audience === 'public'
      : itemType === 'circle' ? target.exists() && data?.type === 'public'
      : itemType === 'page' ? target.exists()
      : target.exists() && data?.status === 'scheduled' && membership?.exists() && membership.get('status') === 'active';
    if (!allowed) throw new Error('This content is private, unavailable or not accessible to your account.');
    const count = Number(parent.data().itemCount || 0);
    if (count >= MAX_ITEMS) throw new Error('This collection has reached its 500-item limit.');
    tx.set(itemRef, {
      itemType, itemId, ...(parentId ? { parentId } : {}), createdAt: serverTimestamp(),
    });
    tx.update(parentRef, { itemCount: count + 1, updatedAt: serverTimestamp() });
    return true;
  });
}

export async function removeContentFromSavedCollection(
  uid: string, collectionId: string, itemType: SavedContentType, itemId: string, parentId?: string,
): Promise<boolean> {
  requireOwner(uid);
  validId(collectionId); validId(itemId);
  if (!['post', 'circle', 'page', 'event'].includes(itemType) || (itemType === 'event' ? !parentId : Boolean(parentId))) throw new Error('Invalid saved content reference.');
  if (parentId) validId(parentId);
  const parentRef = doc(db, 'users', uid, 'savedCollections', collectionId);
  const itemRef = doc(parentRef, 'items', itemDocumentId(itemType, itemId, parentId));
  return runTransaction(db, async tx => {
    const [parent, item] = await Promise.all([tx.get(parentRef), tx.get(itemRef)]);
    if (!parent.exists()) throw new Error('This saved collection no longer exists.');
    if (!item.exists()) return false;
    tx.delete(itemRef);
    tx.update(parentRef, {
      itemCount: Math.max(0, Number(parent.data().itemCount || 0) - 1),
      updatedAt: serverTimestamp(),
    });
    return true;
  });
}
