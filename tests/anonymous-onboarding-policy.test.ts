import assert from 'node:assert/strict';
import test from 'node:test';
import { getAnonymousMemberUsername, shouldShowAnonymousAccountReminder } from '../src/services/firebase/anonymousOnboardingPolicy.ts';

const joinedAt = new Date(2026, 10, 17, 9, 0, 0).getTime();

test('anonymous beta handles are deterministic for the same Firebase UID', () => {
  assert.equal(getAnonymousMemberUsername('AbCdEf123456789'), 'member_abcdef1234');
  assert.equal(getAnonymousMemberUsername('AbCdEf123456789'), getAnonymousMemberUsername('AbCdEf123456789'));
});

test('account reminder waits until the first full day after joining', () => {
  const result = shouldShowAnonymousAccountReminder({
    joinedAt,
    hasVerifiedEmail: false,
    hasPhone: false,
    now: new Date(2026, 10, 17, 23, 59, 0),
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
  const now = new Date(2026, 10, 20, 9, 0, 0);
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
    now: new Date(2026, 10, 20, 9, 0, 0),
  });
  assert.equal(result.show, false);
});
