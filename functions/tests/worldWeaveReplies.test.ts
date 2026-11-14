import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { addWorldWeaveMomentReply, deleteWorldWeaveMomentReply } from '../src/worldWeaveReplies.js';

type CallableRunner = { run: (request: { data: Record<string, unknown>; auth: { uid: string; token: Record<string, unknown> } }) => Promise<unknown> };
const call = (fn: unknown, uid: string, data: Record<string, unknown>) =>
  (fn as CallableRunner).run({ data, auth: { uid, token: { uid } } });

const app = getApp();
const db = getFirestore(app);
const weave = db.doc('worldWeaves/replies-test-weave');
const moment = weave.collection('moments').doc('moment-1');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave reply tests require the Firestore Emulator.');
  await db.recursiveDelete(weave);
  await weave.set({
    id: weave.id, ownerId: 'alice', ownerName: 'Alice', title: 'Reply test',
    description: '', visibility: 'private', participantIds: ['alice', 'bob'],
    memberCount: 2, momentCount: 1, createdAt: new Date(), updatedAt: new Date(),
  });
  await moment.set({ id: moment.id, weaveId: weave.id, authorId: 'alice', text: 'A moment worth discussing.', mediaType: 'text' });
  await db.doc('publicProfiles/alice').set({ name: 'Alice', username: 'alice' });
  await db.doc('publicProfiles/bob').set({ name: 'Bob', username: 'bob' });
});

after(async () => {
  await db.recursiveDelete(weave);
  await db.doc('publicProfiles/alice').delete().catch(() => undefined);
  await db.doc('publicProfiles/bob').delete().catch(() => undefined);
  await deleteApp(app);
});

describe('trusted WorldWeave moment replies', () => {
  it('creates attributed replies and maintains the aggregate count', async () => {
    const result = await call(addWorldWeaveMomentReply, 'bob', {
      weaveId: weave.id, momentId: moment.id, text: 'I remember this too.',
    }) as { replyId: string; replyCount: number };
    assert.equal(result.replyCount, 1);
    const reply = await moment.collection('replies').doc(result.replyId).get();
    assert.equal(reply.get('authorId'), 'bob');
    assert.equal(reply.get('authorName'), 'Bob');
    assert.equal(reply.get('authorUsername'), 'bob');
    assert.equal(reply.get('text'), 'I remember this too.');
    assert.equal((await moment.get()).get('replyCount'), 1);
  });

  it('allows a reply author or owner to delete a reply and decrements safely', async () => {
    const replies = await moment.collection('replies').get();
    const replyId = replies.docs[0].id;
    await assert.rejects(
      call(deleteWorldWeaveMomentReply, 'bob', { weaveId: weave.id, momentId: moment.id, replyId: 'missing-reply' }),
      /no longer available/,
    );
    await call(deleteWorldWeaveMomentReply, 'alice', { weaveId: weave.id, momentId: moment.id, replyId });
    assert.equal((await moment.get()).get('replyCount'), 0);
    assert.equal((await moment.collection('replies').doc(replyId).get()).exists, false);
  });

  it('rejects non-members and invalid reply content', async () => {
    await assert.rejects(
      call(addWorldWeaveMomentReply, 'charlie', { weaveId: weave.id, momentId: moment.id, text: 'Not a member' }),
      /Join this WorldWeave/,
    );
    await assert.rejects(
      call(addWorldWeaveMomentReply, 'bob', { weaveId: weave.id, momentId: moment.id, text: '   ' }),
      /1 to 1,000 characters/,
    );
    await assert.rejects(
      call(addWorldWeaveMomentReply, 'bob', { weaveId: weave.id, momentId: moment.id, text: 'x'.repeat(1001) }),
      /1 to 1,000 characters/,
    );
  });

  it('enforces the per-moment reply ceiling', async () => {
    await moment.update({ replyCount: 500 });
    await assert.rejects(
      call(addWorldWeaveMomentReply, 'bob', { weaveId: weave.id, momentId: moment.id, text: 'The limit is reached.' }),
      /reply limit/,
    );
  });
});
