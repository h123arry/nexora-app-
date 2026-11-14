import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createWorldWeaveChapter, updateWorldWeaveChapter } from '../src/worldWeaveChapters.js';

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
