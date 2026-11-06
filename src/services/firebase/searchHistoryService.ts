import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './config';

const MAX_RECENT_SEARCHES = 10;
const MAX_SEARCH_LENGTH = 100;

function requireOwner(userId: string): void {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Search history is available only to the signed-in account owner.');
  }
}

function normalizeTerm(value: string): string {
  const term = value.normalize('NFKC').trim().replace(/\\s+/g, ' ');
  if (term.length < 2 || term.length > MAX_SEARCH_LENGTH) {
    throw new Error('Search terms must contain between 2 and 100 characters.');
  }
  return term;
}

function searchDocumentId(term: string): string {
  return encodeURIComponent(term.toLocaleLowerCase());
}

/** Load the ten most recently used search terms for this account. */
export async function listRecentSearches(userId: string): Promise<string[]> {
  requireOwner(userId);
  const history = query(
    collection(db, 'users', userId, 'searchHistory'),
    orderBy('updatedAt', 'desc'),
    limit(MAX_RECENT_SEARCHES),
  );
  const snapshot = await getDocs(history);
  return snapshot.docs
    .map(item => item.data().term)
    .filter((term): term is string => typeof term === 'string' && term.length >= 2 && term.length <= MAX_SEARCH_LENGTH);
}

/** Store a normalized, deduplicated search term on the user's account. */
export async function saveRecentSearch(userId: string, value: string): Promise<void> {
  requireOwner(userId);
  const term = normalizeTerm(value);
  const historyRef = collection(db, 'users', userId, 'searchHistory');
  await setDoc(doc(historyRef, searchDocumentId(term)), {
    term,
    updatedAt: serverTimestamp(),
  });
  const newest = await getDocs(query(historyRef, orderBy('updatedAt', 'desc'), limit(MAX_RECENT_SEARCHES + 1)));
  if (newest.docs.length > MAX_RECENT_SEARCHES) {
    const batch = writeBatch(db);
    newest.docs.slice(MAX_RECENT_SEARCHES).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
}

/** Remove one account-level recent search. */
export async function deleteRecentSearch(userId: string, value: string): Promise<void> {
  requireOwner(userId);
  const term = normalizeTerm(value);
  await deleteDoc(doc(db, 'users', userId, 'searchHistory', searchDocumentId(term)));
}

/** Clear the bounded recent-search history for the signed-in account. */
export async function clearRecentSearches(userId: string): Promise<void> {
  requireOwner(userId);
  const snapshot = await getDocs(query(
    collection(db, 'users', userId, 'searchHistory'),
    limit(MAX_RECENT_SEARCHES),
  ));
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach(item => batch.delete(item.ref));
  await batch.commit();
}
