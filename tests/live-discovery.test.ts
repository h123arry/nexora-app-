import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLiveRooms, scoreLiveRoom } from '../src/liveDiscoveryPolicy.ts';

const now = Date.parse('2026-11-10T12:00:00.000Z');

test('live discovery prioritizes fresh rooms with real audience and conversation', () => {
  const rooms = [
    { id: 'quiet', startedAt: new Date(now - 5 * 60_000).toISOString(), viewerCount: 1, messageCount: 0 },
    { id: 'active', startedAt: new Date(now - 12 * 60_000).toISOString(), viewerCount: 24, peakViewerCount: 31, messageCount: 18 },
    { id: 'stale', startedAt: new Date(now - 8 * 60 * 60_000).toISOString(), viewerCount: 80, peakViewerCount: 120, messageCount: 200 },
  ];
  assert.deepEqual(rankLiveRooms(rooms, now).map(room => room.id), ['active', 'quiet', 'stale']);
});

test('gift activity is a small signal and cannot outweigh a materially stronger audience', () => {
  const audience = { id: 'audience', startedAt: now, viewerCount: 30, messageCount: 10, giftCount: 0 };
  const gifts = { id: 'gifts', startedAt: now, viewerCount: 1, messageCount: 0, giftCount: 10_000 };
  assert.ok(scoreLiveRoom(audience, now) > scoreLiveRoom(gifts, now));
});

test('invalid, future, negative and non-finite values cannot inflate discovery scores', () => {
  assert.equal(scoreLiveRoom({ id: 'invalid', startedAt: 'not-a-date', viewerCount: 999999 }, now), 0);
  assert.equal(scoreLiveRoom({ id: 'future', startedAt: now + 60 * 60_000, viewerCount: 999999 }, now), 0);
  assert.equal(scoreLiveRoom({ id: 'negative', startedAt: now, viewerCount: -100, messageCount: -20 }, now), 0);
  assert.equal(scoreLiveRoom({ id: 'nan', startedAt: now, viewerCount: Number.NaN }, now), 0);
});

test('ranking is deterministic and does not mutate the input array', () => {
  const rooms = [
    { id: 'older', startedAt: now - 60_000, viewerCount: 4 },
    { id: 'newer', startedAt: now, viewerCount: 4 },
  ];
  const original = [...rooms];
  assert.deepEqual(rankLiveRooms(rooms, now), [...rooms].reverse());
  assert.deepEqual(rooms, original);
});
