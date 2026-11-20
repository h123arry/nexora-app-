import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAccountSecurityEventMessage } from '../src/accountSecurityNotifications.js';

test('account email changes are clear without exposing the full email address', () => {
  const message = buildAccountSecurityEventMessage('EMAIL_CHANGED', { newValue: 'harrison@example.com' });
  assert.equal(message.title, 'Account email changed');
  assert.match(message.body, /h•••@example\.com/);
  assert.doesNotMatch(message.body, /harrison@example\.com/);
});

test('password, email-link and phone-link events use distinct truthful copy', () => {
  assert.equal(buildAccountSecurityEventMessage('PASSWORD_CHANGED').title, 'Password changed');
  assert.equal(buildAccountSecurityEventMessage('EMAIL_LINKED').title, 'Email sign-in connected');
  assert.equal(buildAccountSecurityEventMessage('PHONE_LINKED').title, 'Phone number verified');
});

test('new login and unusual sign-in events describe real account events', () => {
  assert.match(buildAccountSecurityEventMessage('NEW_LOGIN', { browser: 'Chrome on Android' }).body, /Chrome on Android/);
  assert.match(buildAccountSecurityEventMessage('SUSPICIOUS_SIGNIN').body, /unsuccessful sign-in attempts/);
});
