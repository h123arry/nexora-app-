import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { discoverPublicWorldWeaves } from '../src/worldWeaveDiscovery.js';

type CallableRunner = { run: (request: { data: Record<string, unknown>; auth?: { uid: string; token: Record<string, unknown> } | null }) => Promise<any> };
const call = (uid: string | null, data: Record<string, unknown> = {}) =>
  (discoverPublicWorldWeaves as unknown as CallableRunner).run({
    data, auth: uid ? { uid, token: { uid } } : null,
  });

const app = getApp();
const db = getFirestore(app);
const root = db.collection('worldWeaves');
const viewer = 'weave-discovery-viewer';
const owner = 'weave-discovery-owner';
const blockedOwner = 'weave-discovery-blocked';
const privateOwner = 'weave-discovery-private';
const updatedAt = Timestamp.fromDate(new Date('2026-11-13T12:00:00.000Z'));

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave discovery tests require the Firestore Emulator.');
  for (const id of [
    ...Array.from({ length: 21 }, (_, index) => 'public-discovery-' + String(index).padStart(2, '0')),
    'private-discovery-hidden', 'blocked-discovery-hidden', 'private-owner-hidden',
  ]) await db.recursiveDelete(root.doc(id));
  for (const uid of [viewer, owner, blockedOwner, privateOwner]) {
    await db.doc('users/' + uid).set({ id: uid, username: uid, name: uid });
  }
  await db.doc('users/' + viewer + '/settings/preferences').set({
    privacy: { blockedUserIds: [blockedOwner] },
  });
  await db.doc('users/' + blockedOwner + '/settings/preferences').set({
    privacy: { blockedUserIds: [viewer] },
  });
  await db.doc('users/' + privateOwner + '/settings/preferences').set({
    privacy: { isPrivate: true },
  });
  const batch = db.batch();
  for (let index = 0; index < 21; index += 1) {
    const ref = root.doc('public-discovery-' + String(index).padStart(2, '0'));
    batch.set(ref, {
      id: ref.id, ownerId: owner, ownerName: 'Public Owner',
      title: 'Community memories ' + index,
      description: 'Shared moments from the neighborhood.',
      visibility: 'public', participantIds: [owner, viewer, 'secret-member'],
      memberCount: 3, momentCount: index, createdAt: updatedAt, updatedAt,
      inviteSecret: 'must-not-leak',
    });
  }
  batch.set(root.doc('private-discovery-hidden'), {
    id: 'private-discovery-hidden', ownerId: owner, title: 'Private family story',
    description: 'Never show this in public discovery.', visibility: 'private',
    participantIds: [owner], memberCount: 1, momentCount: 0, createdAt: updatedAt, updatedAt,
  });
  batch.set(root.doc('blocked-discovery-hidden'), {
    id: 'blocked-discovery-hidden', ownerId: blockedOwner, title: 'Blocked owner story',
    description: 'Do not show across a block.', visibility: 'public',
    participantIds: [blockedOwner], memberCount: 1, momentCount: 0, createdAt: updatedAt, updatedAt,
  });
  batch.set(root.doc('private-owner-hidden'), {
    id: 'private-owner-hidden', ownerId: privateOwner, title: 'Private account story',
    description: 'Requires an existing follow.', visibility: 'public',
    participantIds: [privateOwner], memberCount: 1, momentCount: 0, createdAt: updatedAt, updatedAt,
  });
  await batch.commit();
});

after(async () => {
  for (const id of [
    ...Array.from({ length: 21 }, (_, index) => 'public-discovery-' + String(index).padStart(2, '0')),
    'private-discovery-hidden', 'blocked-discovery-hidden', 'private-owner-hidden',
  ]) await db.recursiveDelete(root.doc(id));
  for (const uid of [viewer, owner, blockedOwner, privateOwner]) {
    await db.recursiveDelete(db.doc('users/' + uid));
  }
  await deleteApp(app);
});

describe('public WorldWeave discovery', () => {
  it('requires authentication and validates search and cursor input', async () => {
    await assert.rejects(call(null), /Sign in to discover/);
    await assert.rejects(call(viewer, { query: 'x' }), /at least 2 characters/);
    await assert.rejects(call(viewer, { cursor: 'not-a-cursor' }), /cursor is invalid/);
  });

  it('returns a strict public projection and never exposes membership or invite data', async () => {
    const result = await call(viewer, { query: 'community memories' });
    assert.equal(result.results.length, 20);
    const first = result.results[0];
    assert.equal(first.ownerId, owner);
    assert.equal(first.title.startsWith('Community memories'), true);
    assert.equal(typeof first.memberCount, 'number');
    assert.equal(first.participantIds, undefined);
    assert.equal(first.inviteSecret, undefined);
    assert.equal(first.storagePath, undefined);
    assert.ok(result.nextCursor);
  });

  it('paginates without duplicating or skipping the final public experience', async () => {
    const first = await call(viewer, { query: 'community memories' });
    const second = await call(viewer, { query: 'community memories', cursor: first.nextCursor });
    assert.equal(second.results.length, 1);
    assert.notEqual(first.results[0].id, second.results[0].id);
    assert.equal(second.nextCursor, null);
  });

  it('excludes private experiences, both-direction blocks and private owners without a follow', async () => {
    const publicPage = await call(viewer);
    const ids = publicPage.results.map((item: { id: string }) => item.id);
    assert.ok(ids.every((id: string) => id.startsWith('public-discovery-')));
    assert.equal(ids.includes('private-discovery-hidden'), false);

    await root.doc('blocked-discovery-hidden').update({ updatedAt: Timestamp.now() });
    const blocked = await call(viewer, { query: 'blocked owner story' });
    assert.equal(blocked.results.length, 0);

    await root.doc('private-owner-hidden').update({ updatedAt: Timestamp.now() });
    const privateOwnerResult = await call(viewer, { query: 'private account story' });
    assert.equal(privateOwnerResult.results.length, 0);
  });
});
