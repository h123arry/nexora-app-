import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createGroupChat } from '../src/groupChats.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'group-chat-tests');
const db = getFirestore(app);
const owner = db.collection('users').doc('group-owner');
const members = ['group-member-a', 'group-member-b', 'group-member-c'];

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Group chat tests require the Firestore Emulator.');
  await db.recursiveDelete(owner);
  await Promise.all(members.map(id => db.recursiveDelete(db.collection('users').doc(id))));
  await owner.set({ id: 'group-owner', name: 'Group Owner', username: 'group_owner', avatar: '' });
  for (const id of members) {
    await db.collection('users').doc(id).set({ id, name: id, username: id });
    await db.collection('users').doc(id).collection('settings').doc('preferences').set({
      privacy: { allowDms: true }, messaging: { blockedUserIds: [] },
    });
  }
});

after(async () => {
  const chats = await db.collection('chats').where('ownerId', '==', 'group-owner').get();
  for (const chat of chats.docs) {
    await db.recursiveDelete(chat.ref);
    await Promise.all(members.map(id => db.collection('users').doc(id).collection('notifications').doc('group_' + chat.id).delete()));
  }
  await db.recursiveDelete(owner);
  await Promise.all(members.map(id => db.recursiveDelete(db.collection('users').doc(id))));
  await deleteApp(app);
});

describe('trusted group conversations', () => {
  it('creates a server-owned group with validated members and invitation notifications', async () => {
    const result = await createGroupChat(db, 'group-owner', 'NEXORA Builders', 'A real group space.', members.slice(0, 2));
    const chat = await db.collection('chats').doc(result.chatId).get();
    assert.equal(result.participantCount, 3);
    assert.equal(chat.get('isGroup'), true);
    assert.equal(chat.get('ownerId'), 'group-owner');
    assert.deepEqual(chat.get('participants'), ['group-owner', ...members.slice(0, 2)]);
    const notification = await db.collection('users').doc(members[0]).collection('notifications').doc('group_' + result.chatId).get();
    assert.equal(notification.get('targetId'), result.chatId);
    assert.equal(notification.get('isRead'), false);
  });

  it('rejects duplicate members and invalid group sizes', async () => {
    await assert.rejects(createGroupChat(db, 'group-owner', 'Builders', '', [members[0], members[0]]), /valid, unique/);
    await assert.rejects(createGroupChat(db, 'group-owner', 'A', '', members.slice(0, 2)), /needs a name/);
    await assert.rejects(createGroupChat(db, 'group-owner', 'Builders', '', [members[0]]), /needs a name/);
  });

  it('respects blocks and recipient message privacy before adding members', async () => {
    await db.collection('users').doc(members[0]).collection('settings').doc('preferences').set({
      privacy: { allowDms: false }, messaging: { blockedUserIds: [] },
    });
    await assert.rejects(createGroupChat(db, 'group-owner', 'Private group', '', members.slice(0, 2)), /does not accept/);
    await db.collection('users').doc(members[0]).collection('settings').doc('preferences').set({
      privacy: { allowDms: true }, messaging: { blockedUserIds: ['group-owner'] },
    });
    await assert.rejects(createGroupChat(db, 'group-owner', 'Private group', '', members.slice(0, 2)), /privacy restriction/);
  });
});
