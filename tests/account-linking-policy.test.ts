import assert from 'node:assert/strict';
import test from 'node:test';
import { GoogleAuthProvider } from 'firebase/auth';
import { canUpgradeAnonymousBetaSession, hasLinkedProvider, isRecentAuthentication } from '../src/services/firebase/accountLinkingPolicy.ts';

const GOOGLE_PROVIDER_ID = GoogleAuthProvider.PROVIDER_ID;

test('sensitive provider linking requires a recent, valid authentication timestamp', () => {
  assert.equal(isRecentAuthentication(900, 1000), true);
  assert.equal(isRecentAuthentication(699, 1000), false);
  assert.equal(isRecentAuthentication(1001, 1000), false);
  assert.equal(isRecentAuthentication(undefined, 1000), false);
  assert.equal(isRecentAuthentication(Number.NaN, 1000), false);
});

test('provider linking does not duplicate an already-linked identity provider', () => {
  assert.equal(hasLinkedProvider(['password', GOOGLE_PROVIDER_ID], GOOGLE_PROVIDER_ID), true);
  assert.equal(hasLinkedProvider(['password'], GOOGLE_PROVIDER_ID), false);
});

test('provider linking recognizes existing email, phone, and Google credentials', () => {
  assert.equal(hasLinkedProvider(['password', GOOGLE_PROVIDER_ID], 'password'), true);
  assert.equal(hasLinkedProvider(['phone'], 'phone'), true);
  assert.equal(hasLinkedProvider(['password'], 'phone'), false);
  assert.equal(hasLinkedProvider(['phone'], GOOGLE_PROVIDER_ID), false);
});

test('approved anonymous beta members can upgrade credentials on their existing active UID', () => {
  assert.equal(canUpgradeAnonymousBetaSession(true, true, true), true);
  assert.equal(canUpgradeAnonymousBetaSession(true, false, true), false);
  assert.equal(canUpgradeAnonymousBetaSession(true, true, false), false);
  assert.equal(canUpgradeAnonymousBetaSession(false, true, true), false);
});
