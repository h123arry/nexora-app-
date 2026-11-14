import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createWorldWeaveChapter, updateWorldWeaveChapter, archiveWorldWeaveChapter, reorderWorldWeaveChapters } from '../src/worldWeaveChapters.js';

type CallableRunner = { run: (request: { data: Record<string, unknown>; auth: { uid: string; token: Record<string, unknown> } }) => Promise<unknown> };
const call = (fn: unknown, uid: string, data: Record<string, unknown>) =>
  (fn as CallableRunner).run({ data, auth: { uid, token: { uid } } });

const app = getApp();
const db = getFirestore(app);
const weave = db.doc('worldWeaves/chapters-test-weave');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave chapter tests require the Firestore Emulator.');
  await db.recursiveDelete(weave);
  await weave.set({
    id: weave.id, ownerId: 'alice', ownerName: 'Alice', title: 'Chapter test',
    description: '', visibility: 'private', participantIds: ['alice', 'bob'],
    memberCount: 2, momentCount: 0, createdAt: new Date(), updatedAt: new Date(),
  });
});

after(async () => {
  await db.recursiveDelete(weave);
  await deleteApp(app);
});

describe('trusted WorldWeave chapters', () => {
  it('creates ordered chapters with bounded metadata', async () => {
    const first = await call(createWorldWeaveChapter, 'alice', {
      weaveId: weave.id, title: 'Before', description: 'The beginning of the story.',
    }) as { chapterId: string; position: number; title: string };
    assert.equal(first.title, 'Before');
    assert.equal(first.position, 0);
    const second = await call(createWorldWeaveChapter, 'alice', {
      weaveId: weave.id, title: 'During', description: '',
    }) as { chapterId: string; position: number };
    assert.equal(second.position, 1);
    assert.equal((await weave.collection('chapters').get()).size, 2);
  });

  it('allows only the owner to create or rename chapters', async () => {
    const chapters = await weave.collection('chapters').orderBy('position').get();
    const chapterId = chapters.docs[0].id;
    await assert.rejects(call(createWorldWeaveChapter, 'bob', { weaveId: weave.id, title: 'Not allowed', description: '' }), /Only the WorldWeave owner/);
    await assert.rejects(call(updateWorldWeaveChapter, 'bob', { weaveId: weave.id, chapterId, title: 'Changed', description: '' }), /Only the WorldWeave owner/);
    await call(updateWorldWeaveChapter, 'alice', { weaveId: weave.id, chapterId, title: 'The beginning', description: 'Updated context.' });
    assert.equal((await weave.collection('chapters').doc(chapterId).get()).get('title'), 'The beginning');
  });

  it('rejects invalid chapter titles and caps each experience at 30 chapters', async () => {
    await assert.rejects(call(createWorldWeaveChapter, 'alice', { weaveId: weave.id, title: ' ', description: '' }), /2 to 60 characters/);
    await assert.rejects(call(createWorldWeaveChapter, 'alice', { weaveId: weave.id, title: 'x'.repeat(61), description: '' }), /2 to 60 characters/);
    const batch = db.batch();
    for (let position = 2; position < 30; position += 1) {
      const ref = weave.collection('chapters').doc('seed-' + position);
      batch.set(ref, { id: ref.id, weaveId: weave.id, title: 'Chapter ' + position, description: '', position, createdBy: 'alice', createdAt: new Date(), updatedAt: new Date() });
    }
    await batch.commit();
    assert.equal((await weave.collection('chapters').get()).size, 30);
    await assert.rejects(call(createWorldWeaveChapter, 'alice', { weaveId: weave.id, title: 'Thirty one', description: '' }), /up to 30 chapters/);
  });
});


describe('WorldWeave chapter lifecycle', () => {
  const lifecycleWeave = db.doc('worldWeaves/chapter-lifecycle-test');
  let firstId = '';
  let secondId = '';

  before(async () => {
    await db.recursiveDelete(lifecycleWeave);
    await lifecycleWeave.set({
      id: lifecycleWeave.id, ownerId: 'alice', ownerName: 'Alice',
      title: 'Lifecycle test', description: '', visibility: 'private',
      participantIds: ['alice'], memberCount: 1, momentCount: 0,
    });
    const first = await call(createWorldWeaveChapter, 'alice', {
      weaveId: lifecycleWeave.id, title: 'First', description: '',
    }) as { chapterId: string };
    const second = await call(createWorldWeaveChapter, 'alice', {
      weaveId: lifecycleWeave.id, title: 'Second', description: '',
    }) as { chapterId: string };
    firstId = first.chapterId;
    secondId = second.chapterId;
    await lifecycleWeave.collection('moments').doc('historical-moment').set({
      weaveId: lifecycleWeave.id, authorId: 'alice', chapterId: firstId, text: 'A memory remains attached.',
    });
  });

  after(async () => {
    await db.recursiveDelete(lifecycleWeave);
  });

  it('reorders the complete chapter set and rejects stale or partial lists', async () => {
    await assert.rejects(
      call(reorderWorldWeaveChapters, 'bob', { weaveId: lifecycleWeave.id, chapterIds: [secondId, firstId] }),
      /Only the WorldWeave owner/,
    );
    await assert.rejects(
      call(reorderWorldWeaveChapters, 'alice', { weaveId: lifecycleWeave.id, chapterIds: [firstId] }),
      /Refresh the chapter list/,
    );
    await assert.rejects(
      call(reorderWorldWeaveChapters, 'alice', { weaveId: lifecycleWeave.id, chapterIds: [firstId, firstId] }),
      /unique, valid ordered list/,
    );
    await call(reorderWorldWeaveChapters, 'alice', { weaveId: lifecycleWeave.id, chapterIds: [secondId, firstId] });
    assert.equal((await lifecycleWeave.collection('chapters').doc(secondId).get()).get('position'), 0);
    assert.equal((await lifecycleWeave.collection('chapters').doc(firstId).get()).get('position'), 1);
  });

  it('archives without deleting the chapter or orphaning historical moments', async () => {
    await assert.rejects(
      call(archiveWorldWeaveChapter, 'bob', { weaveId: lifecycleWeave.id, chapterId: firstId }),
      /Only the WorldWeave owner/,
    );
    const result = await call(archiveWorldWeaveChapter, 'alice', { weaveId: lifecycleWeave.id, chapterId: firstId }) as { archived: boolean; changed: boolean };
    assert.equal(result.archived, true);
    assert.equal(result.changed, true);
    const repeated = await call(archiveWorldWeaveChapter, 'alice', { weaveId: lifecycleWeave.id, chapterId: firstId }) as { changed: boolean };
    assert.equal(repeated.changed, false);
    assert.equal((await lifecycleWeave.collection('chapters').doc(firstId).get()).get('archived'), true);
    assert.equal((await lifecycleWeave.collection('moments').doc('historical-moment').get()).get('chapterId'), firstId);
    const events = await lifecycleWeave.collection('activity').where('action', '==', 'chapter_archived').get();
    assert.equal(events.size, 1);
  });
});
