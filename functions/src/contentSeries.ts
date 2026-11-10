import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const ID = /^[A-Za-z0-9_-]{1,150}$/;
function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

export async function createContentSeries(db: Firestore, ownerId: string, input: { title?: unknown; description?: unknown; category?: unknown }) {
  if (!ID.test(ownerId)) throw new Error('A valid creator account is required.');
  const title = clean(input.title, 80);
  const description = clean(input.description, 500);
  const category = clean(input.category, 40);
  if (title.length < 3 || description.length < 10 || category.length < 2) throw new Error('Series details are invalid.');
  const owned = await db.collection('contentSeries').where('ownerId', '==', ownerId).limit(30).get();
  if (owned.size >= 30) throw new Error('You have reached the 30-series limit.');
  const id = randomUUID();
  await db.collection('contentSeries').doc(id).create({
    id, ownerId, title, description, category, episodeCount: 0,
    status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  return { seriesId: id };
}

export async function appendPostToSeries(db: Firestore, ownerId: string, seriesId: string, postId: string) {
  if (!ID.test(ownerId) || !ID.test(seriesId) || !ID.test(postId)) throw new Error('Valid series and post identifiers are required.');
  const seriesRef = db.collection('contentSeries').doc(seriesId);
  const postRef = db.collection('posts').doc(postId);
  const episodeRef = seriesRef.collection('episodes').doc(postId);
  return db.runTransaction(async tx => {
    const [series, post, existing] = await Promise.all([tx.get(seriesRef), tx.get(postRef), tx.get(episodeRef)]);
    if (!series.exists || series.get('ownerId') !== ownerId || series.get('status') !== 'active') {
      throw new Error('This content series is unavailable.');
    }
    if (!post.exists || post.get('userId') !== ownerId || post.get('audience') !== 'public') {
      throw new Error('Only your own public posts can be added to a series.');
    }
    if (existing.exists) return { added: false, episodeNumber: existing.get('episodeNumber') as number };
    const episodeNumber = Number(series.get('episodeCount') || 0) + 1;
    if (!Number.isSafeInteger(episodeNumber) || episodeNumber < 1) throw new Error('Series episode numbering is invalid.');
    tx.create(episodeRef, {
      postId, ownerId, episodeNumber, postContentSnapshot: String(post.get('content') || '').slice(0, 500),
      addedAt: FieldValue.serverTimestamp(),
    });
    tx.update(seriesRef, { episodeCount: episodeNumber, updatedAt: FieldValue.serverTimestamp() });
    return { added: true, episodeNumber };
  });
}

export async function listMyContentSeries(db: Firestore, ownerId: string) {
  if (!ID.test(ownerId)) throw new Error('A valid creator account is required.');
  const snapshot = await db.collection('contentSeries').where('ownerId', '==', ownerId).limit(30).get();
  return { series: snapshot.docs.map(doc => ({
    id: doc.id, title: doc.get('title'), description: doc.get('description'),
    category: doc.get('category'), episodeCount: doc.get('episodeCount') || 0,
    updatedAt: doc.get('updatedAt')?.toDate?.()?.toISOString?.() || null,
  })).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')) };
}

export async function listContentSeriesEpisodes(db: Firestore, ownerId: string, seriesId: string) {
  if (!ID.test(ownerId) || !ID.test(seriesId)) throw new Error('Valid series details are required.');
  const series = await db.collection('contentSeries').doc(seriesId).get();
  if (!series.exists || series.get('ownerId') !== ownerId) throw new Error('This content series is unavailable.');
  const episodes = await series.ref.collection('episodes').orderBy('episodeNumber', 'asc').limit(200).get();
  return { episodes: episodes.docs.map(doc => ({
    postId: doc.get('postId'), episodeNumber: doc.get('episodeNumber'),
    content: doc.get('postContentSnapshot') || '',
    addedAt: doc.get('addedAt')?.toDate?.()?.toISOString?.() || null,
  })) };
}
