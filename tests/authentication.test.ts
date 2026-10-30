import assert from 'node:assert/strict';
import { test, after } from 'node:test';

(globalThis as typeof globalThis & { __NEXORA_FIREBASE_EMULATORS__?: boolean }).__NEXORA_FIREBASE_EMULATORS__ = true;

const { auth } = await import('../src/lib/firebase.ts');
const { AuthService } = await import('../src/services/firebase/authService.ts');
const {
  browserLocalPersistence,
  browserSessionPersistence,
  deleteUser,
  signOut,
} = await import('firebase/auth');

const email = `nexora-auth-${Date.now()}@example.test`;
const password = 'Nexora-Test-Password-42!';

async function cleanUp() {
  if (auth.currentUser) {
    await deleteUser(auth.currentUser).catch(() => undefined);
  }
  await signOut(auth).catch(() => undefined);
}

test('maps Firebase configuration and credential failures without exposing provider details', () => {
  assert.match(AuthService.mapFirebaseError({ code: 'auth/operation-not-allowed' }), /sign-in method is not enabled/);
  assert.match(AuthService.mapFirebaseError({ code: 'auth/unauthorized-domain' }), /not authorized/);
  assert.match(AuthService.mapFirebaseError({ code: 'auth/invalid-phone-number' }), /Invalid phone number/);
  assert.match(AuthService.mapFirebaseError({ code: 'auth/captcha-check-failed' }), /Phone verification could not be completed/);
  assert.doesNotMatch(AuthService.mapFirebaseError({ code: 'auth/email-already-in-use' }), /already exists/i);
  assert.equal(AuthService.mapFirebaseError({ code: 'auth/internal-error', message: 'secret provider stack' }), 'An authentication error occurred. Please try again or contact the account owner.');
});

test('maps the remember-device choice to local or tab-session persistence', () => {
  assert.equal(AuthService.getLoginPersistence(true), browserLocalPersistence);
  assert.equal(AuthService.getLoginPersistence(false), browserSessionPersistence);
});

test('registers, restores, and signs in an email account through Firebase Auth', async () => {
  await cleanUp();
  const registered = await AuthService.registerWithEmail(email, password, 'Emulator User', 'emulator_user');
  assert.equal(registered.firebaseUser.email, email);
  assert.equal(registered.user.id, registered.firebaseUser.uid);
  assert.equal(registered.user.name, 'Emulator User');

  await signOut(auth);
  const loggedIn = await AuthService.loginWithEmail(email, password);
  assert.equal(loggedIn.firebaseUser.uid, registered.firebaseUser.uid);
  assert.equal(loggedIn.user.id, registered.firebaseUser.uid);
});

test('rejects duplicate registration and invalid credentials without creating a second account', async () => {
  await assert.rejects(
    () => AuthService.registerWithEmail(email, password, 'Duplicate User', 'duplicate_user'),
    (error: { code?: string; message?: string }) => error.code === 'auth/email-already-in-use' && /unable to create an account/i.test(error.message || '')
  );

  await signOut(auth);
  await assert.rejects(
    () => AuthService.loginWithEmail(email, 'wrong-password'),
    (error: { code?: string; message?: string }) =>
      ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(error.code || '')
      && /incorrect/.test(error.message || '')
  );
});

test('password reset returns an enumeration-safe acknowledgement for unknown accounts', async () => {
  await signOut(auth);
  assert.equal(await AuthService.sendPasswordReset('missing-account@example.test'), true);
});

test('account deletion reauthentication rejects an incorrect current password before queuing', async () => {
  await AuthService.loginWithEmail(email, password);
  await assert.rejects(
    () => AuthService.reauthenticateForAccountDeletion('incorrect-password'),
    (error: { code?: string; message?: string }) =>
      ['auth/invalid-credential', 'auth/wrong-password'].includes(error.code || '')
      || /email or password/i.test(error.message || '')
  );
});

test('password changes require the current Firebase credential and persist through a new sign-in', async () => {
  const updatedPassword = 'Nexora-Updated-Test-Password-43!';
  await AuthService.loginWithEmail(email, password);
  await assert.rejects(() => AuthService.updateAccountPassword('incorrect-password', updatedPassword));
  await AuthService.updateAccountPassword(password, updatedPassword);
  await signOut(auth);
  const restored = await AuthService.loginWithEmail(email, updatedPassword);
  assert.equal(restored.firebaseUser.email, email);
});

after(async () => {
  await cleanUp();
});
