import test from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_CHAT_MESSAGE_MAX, LIVE_CHAT_WINDOW_MAX_MESSAGES, validateLiveChatMessage, validateLiveSessionId, validateLiveSessionTitle, validateLiveConnectionId, nextLiveChatRateState, validateLiveSessionSettings, validateLiveGuestDecision } from '../src/liveSessionsPolicy.ts';

test('live room titles and IDs are normalized and bounded', () => {
  assert.equal(validateLiveSessionTitle('  Creator Q&A  '), 'Creator Q&A');
  assert.equal(validateLiveSessionId('room_123'), 'room_123');
  assert.throws(() => validateLiveSessionTitle('Hi'));
  assert.throws(() => validateLiveSessionTitle('x'.repeat(81)));
  assert.throws(() => validateLiveSessionId('../private'));
});

test('live chat messages are trimmed and limited to 500 characters', () => {
  assert.equal(validateLiveChatMessage('  Hello live room  '), 'Hello live room');
  assert.equal(validateLiveChatMessage('x'.repeat(LIVE_CHAT_MESSAGE_MAX)).length, 500);
  assert.throws(() => validateLiveChatMessage('  '));
  assert.throws(() => validateLiveChatMessage('x'.repeat(501)));
});

test('live chat rate limiter permits five messages per ten-second window and resets safely', () => {
  let state = null;
  for (let i = 0; i < LIVE_CHAT_WINDOW_MAX_MESSAGES; i++) state = nextLiveChatRateState(state, 1000 + i);
  assert.throws(() => nextLiveChatRateState(state, 1005));
  assert.deepEqual(nextLiveChatRateState(state, 11_001), { windowStartedAtMs: 11_001, messageCount: 1 });
});

test('live connection references are bounded opaque identifiers', () => {
  assert.equal(validateLiveConnectionId('live_conn_123'), 'live_conn_123');
  assert.throws(() => validateLiveConnectionId('../viewer'));
  assert.throws(() => validateLiveConnectionId('short'));
});


test('live host settings accept only explicit chat and gift toggles', () => {
  assert.deepEqual(validateLiveSessionSettings({ chatEnabled: false }), { chatEnabled: false });
  assert.deepEqual(validateLiveSessionSettings({ chatEnabled: true, giftsEnabled: false }), { chatEnabled: true, giftsEnabled: false });
  assert.throws(() => validateLiveSessionSettings({}));
  assert.throws(() => validateLiveSessionSettings({ chatEnabled: 'false' }));
  assert.throws(() => validateLiveSessionSettings({ chatEnabled: false, hostId: 'attacker' }));
});


test('live guest access decisions accept only approve or deny', () => {
  assert.equal(validateLiveGuestDecision('approved'), 'approved');
  assert.equal(validateLiveGuestDecision('denied'), 'denied');
  assert.throws(() => validateLiveGuestDecision('pending'));
  assert.throws(() => validateLiveGuestDecision(true));
});
