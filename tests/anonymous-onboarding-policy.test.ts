import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dismissAnonymousAccountPrompt,
  getAnonymousAccountPromptDelayMs,
  getAnonymousMemberUsername,
  readAnonymousAccountPromptState,
  shouldShowAnonymousAccountReminder,
} from '../src/services/firebase/anonymousOnboardingPolicy.ts';

const joinedAt = new Date(2026, 10, 17, 9, 0, 0).getTime();

test('anonymous account prompts escalate from ten seconds after each dismissal', () => {
  assert.equal(getAnonymousAccountPromptDelayMs(0), 10_000);
  assert.equal(getAnonymousAccountPromptDelayMs(1), 20_000);
  assert.equal(getAnonymousAccountPromptDelayMs(2), 30_000);
  assert.equal(getAnonymousAccountPromptDelayMs(3), 60_000);
  assert.equal(getAnonymousAccountPromptDelayMs(99), 1_800_000);
  const first = dismissAnonymousAccountPrompt(1_000, { dismissals: 0, nextPromptAt: null });
  assert.deepEqual(first, { dismissals: 1, nextPromptAt: 21_000 });
  const second = dismissAnonymousAccountPrompt(first.nextPromptAt!, first);
  assert.deepEqual(second, { dismissals: 2, nextPromptAt: 51_000 });
});

test('anonymous account prompt state fails closed to the initial ten-second reminder', () => {
  assert.deepEqual(readAnonymousAccountPromptState(null), { dismissals: 0, nextPromptAt: null });
  assert.deepEqual(readAnonymousAccountPromptState('{not-json'), { dismissals: 0, nextPromptAt: null });
  assert.deepEqual(readAnonymousAccountPromptState('{"dismissals":2,"nextPromptAt":123}'), { dismissals: 2, nextPromptAt: 123 });
});

test('anonymous beta handles are deterministic for the same Firebase UID', () => {
  assert.equal(getAnonymousMemberUsername('AbCdEf123456789'), 'member_abcdef1234');
  assert.equal(getAnonymousMemberUsername('AbCdEf123456789'), getAnonymousMemberUsername('AbCdEf123456789'));
});

test('account reminder waits until the first full day after joining', () => {
  const result = shouldShowAnonymousAccountReminder({
    joinedAt,
    hasVerifiedEmail: false,
    hasPhone: false,
    now: new Date(2026, 10, 18, 8, 59, 0),
  });
  assert.equal(result.show, false);
});

test('account reminder appears on Wednesday after the first full day and can be dismissed for that Wednesday', () => {
  const now = new Date(2026, 10, 18, 9, 0, 0);
  const first = shouldShowAnonymousAccountReminder({ joinedAt, hasVerifiedEmail: false, hasPhone: false, now });
  assert.equal(first.show, true);
  const dismissed = shouldShowAnonymousAccountReminder({ joinedAt, lastDismissedDate: first.today, hasVerifiedEmail: false, hasPhone: false, now });
  assert.equal(dismissed.show, false);
  const nextDay = shouldShowAnonymousAccountReminder({
    joinedAt,
    lastDismissedDate: first.today,
    hasVerifiedEmail: false,
    hasPhone: false,
    now: new Date(2026, 10, 19, 9, 0, 0),
  });
  assert.equal(nextDay.show, false);
  const nextWednesday = shouldShowAnonymousAccountReminder({
    joinedAt,
    lastDismissedDate: first.today,
    hasVerifiedEmail: false,
    hasPhone: false,
    now: new Date(2026, 10, 25, 9, 0, 0),
  });
  assert.equal(nextWednesday.show, true);
});

test('reminder continues until both email and phone credentials are linked', () => {
  const now = new Date(2026, 10, 25, 9, 0, 0);
  assert.equal(shouldShowAnonymousAccountReminder({
    joinedAt,
    hasVerifiedEmail: true,
    hasPhone: false,
    now,
  }).show, true);
  assert.equal(shouldShowAnonymousAccountReminder({
    joinedAt,
    hasVerifiedEmail: false,
    hasPhone: true,
    now,
  }).show, true);
});

test('reminder stops when both email and phone credentials are present', () => {
  const result = shouldShowAnonymousAccountReminder({
    joinedAt,
    hasVerifiedEmail: true,
    hasPhone: true,
    now: new Date(2026, 10, 25, 9, 0, 0),
  });
  assert.equal(result.show, false);
});
