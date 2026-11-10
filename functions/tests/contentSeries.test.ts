import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { appendPostToSeries, createContentSeries, listContentSeriesEpisodes } from '../src/contentSeries.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-series' }, 'content-series-tests');
const db = getFirestore(app);
const seriesIds: string[] = [];
const postIds = ['series-post-one', 'series-post-two', 'series-post-private'];

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Content-series tests require the Firestore Emulator.');
  await Promise.all([
    db.doc('posts/series-post-one').set({ id: 'series-post-one', userId: 'creator-series', audience: 'public', content: 'The first part of my series' }),
    db.doc('posts/series-post-two').set({ id: 'series-post-two', userId: 'creator-series', audience: 'public', content: 'The second part of my series' }),
    db.doc('posts/series-post-private').set({ id: 'series-post-private', userId: 'creator-series', audience: 'followers', content: 'Private post' }),
  ]);
});
after(async () => {
  for (const id of seriesIds) {
    const ref = db.collection('contentSeries').doc(id);
    const episodes = await ref.collection('episodes').get();
    await Promise.all(episodes.docs.map(doc => doc.ref.delete()));
    await ref.delete();
  }
  await Promise.all(postIds.map(id => db.doc(`posts/${id}`).delete()));
  await deleteApp(app);
});

describe('numbered creator content series', () => {
  it('creates an owned series and appends public posts in stable episode order', async () => {
    const created = await createContentSeries(db, 'creator-series', {
      title: 'Build Notes', description: 'A practical journey through a project build.', category: 'Technology',
    });
    seriesIds.push(created.seriesId);
    assert.deepEqual(await appendPostToSeries(db, 'creator-series', created.seriesId, 'series-post-two'), { added: true, episodeNumber: 1 });
    assert.deepEqual(await appendPostToSeries(db, 'creator-series', created.seriesId, 'series-post-one'), { added: true, episodeNumber: 2 });
    assert.deepEqual(await appendPostToSeries(db, 'creator-series', created.seriesId, 'series-post-two'), { added: false, episodeNumber: 1 });
    const result = await listContentSeriesEpisodes(db, 'creator-series', created.seriesId);
    assert.deepEqual(result.episodes.map(item => item.episodeNumber), [1, 2]);
    assert.equal(result.episodes[0].postId, 'series-post-two');
  });

  it('rejects private posts and series owned by another creator', async () => {
    const created = await createContentSeries(db, 'creator-series', {
      title: 'Private test series', description: 'A second series for permission checks.', category: 'Testing',
    });
    seriesIds.push(created.seriesId);
    await assert.rejects(appendPostToSeries(db, 'creator-series', created.seriesId, 'series-post-private'), /own public posts/);
    await assert.rejects(appendPostToSeries(db, 'someone-else', created.seriesId, 'series-post-one'), /unavailable/);
  });
});
