import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { searchPublicDirectory } from '../src/directorySearch.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'directory-search-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Directory search tests require the Firestore Emulator.');
  await Promise.all(['viewer', 'public-person', 'private-person', 'blocked-person'].map(id => db.doc('users/' + id).delete().catch(() => undefined)));
  await db.doc('users/viewer').set({ id: 'viewer', username: 'viewer' });
  await db.doc('users/public-person').set({ id: 'public-person', username: 'nexora_public', name: 'Public Person' });
  await db.doc('users/private-person').set({ id: 'private-person', username: 'nexora_private', name: 'Private Person' });
  await db.doc('users/blocked-person').set({ id: 'blocked-person', username: 'nexora_blocked', name: 'Blocked Person' });
  await db.doc('users/private-person/settings/preferences').set({ privacy: { isPrivate: true } });
  await db.doc('users/blocked-person/settings/preferences').set({ privacy: { blockedUserIds: ['viewer'] } });
  // A block-heavy prefix must not crowd eligible accounts out of the result cap.
  for (let index = 0; index < 8; index += 1) {
    const id = 'blocked-prefix-' + index;
    await db.doc('users/' + id).set({ id, username: 'nexora_0' + index + '_blocked' });
    await db.doc('users/' + id + '/settings/preferences').set({ privacy: { blockedUserIds: ['viewer'] } });
  }
  await db.doc('users/visible-late').set({ id: 'visible-late', username: 'nexora_zz_visible', name: 'Visible Late' });
  await db.doc('pages/nexora-business').set({ id: 'nexora-business', username: 'nexora_business', name: 'Nexora Business', category: 'Business' });
  await db.doc('communities/nexora-circle').set({ id: 'nexora-circle', name: 'Nexora Circle', type: 'public', bannedUsers: [] });
});

after(async () => {
  for (const path of ['users/viewer','users/public-person','users/private-person','users/blocked-person','users/visible-late','pages/nexora-business','communities/nexora-circle']) await db.doc(path).delete().catch(() => undefined);
  for (let index = 0; index < 8; index += 1) {
    const id = 'blocked-prefix-' + index;
    await db.recursiveDelete(db.doc('users/' + id));
  }
  await deleteApp(app);
});

describe('server-backed directory search', () => {
  it('returns public people, Pages and public Circles while excluding private and blocking accounts', async () => {
    const firstPage = await searchPublicDirectory(db, 'viewer', 'nexora');
    assert.equal(firstPage.pages[0]?.id, 'nexora-business');
    assert.equal(firstPage.circles[0]?.id, 'nexora-circle');
    assert.ok(firstPage.nextCursor, 'A block-heavy first page should provide a continuation cursor');
    const secondPage = await searchPublicDirectory(db, 'viewer', 'nexora', firstPage.nextCursor);
    assert.deepEqual(secondPage.people.map(item => item.id), ['public-person', 'visible-late']);
    assert.equal(secondPage.nextCursor, null);
  });
  it('requires a bounded query and authenticated viewer', async () => {
    await assert.rejects(searchPublicDirectory(db, '', 'nexora'), /Sign in/);
    await assert.rejects(searchPublicDirectory(db, 'viewer', 'x'), /between 2 and 40/);
  });
  it('rejects stale or malformed continuation cursors', async () => {
    await assert.rejects(searchPublicDirectory(db, 'viewer', 'nexora', 'not-a-cursor'), /cursor is invalid/);
    const first = await searchPublicDirectory(db, 'viewer', 'nexora');
    await assert.rejects(searchPublicDirectory(db, 'viewer', 'different-term', first.nextCursor), /cursor is invalid/);
  });
  it('finds public people by display-name prefix as well as username', async () => {
    const result = await searchPublicDirectory(db, 'viewer', 'Public');
    assert.deepEqual(result.people.map(item => item.id), ['public-person']);
  });

});
