import assert from 'node:assert/strict';
import { test, after } from 'node:test';

(globalThis as typeof globalThis & { __NEXORA_FIREBASE_EMULATORS__?: boolean }).__NEXORA_FIREBASE_EMULATORS__ = true;

const { auth } = await import('../src/lib/firebase.ts');
const { AuthService } = await import('../src/services/firebase/authService.ts');
const { isPhoneAuthAvailable } = await import('../src/utils/authMethodAvailability.ts');
const { getAuthSessionIdentityKey, shouldHydrateAuthSession } = await import('../src/services/firebase/authSessionPolicy.ts');
const { persistProfileWithBestEffortProjection } = await import('../src/services/firebase/profileProvisioningPolicy.ts');
const {
  browserLocalPersistence,
  browserSessionPersistence,
  deleteUser,
  signInAnonymously,
  signOut,
} = await import('firebase/auth');
const { ProfileService } = await import('../src/services/firebase/profileService.ts');

const email = `nexora-auth-${Date.now()}@example.test`;
const password = 'Nexora-Test-Password-42!';

async function cleanUp() {
  if (auth.currentUser) {
    await deleteUser(auth.currentUser).catch(() => undefined);
  }
  await signOut(auth).catch(() => undefined);
}




test('private profile persistence succeeds even when public projection synchronization is deferred', async () => {
  const completed = [];
  let projectionError;
  await persistProfileWithBestEffortProjection(
    async () => { completed.push('private'); },
    async () => { completed.push('public'); throw Object.assign(new Error('denied'), { code: 'permission-denied' }); },
    (error) => { projectionError = error; },
  );
  assert.deepEqual(completed, ['private', 'public']);
  assert.equal(projectionError.code, 'permission-denied');
});

test('private profile persistence failure is never swallowed by projection fallback', async () => {
  const privateError = Object.assign(new Error('private denied'), { code: 'permission-denied' });
  let projectionAttempted = false;
  await assert.rejects(
    () => persistProfileWithBestEffortProjection(
      async () => { throw privateError; },
      async () => { projectionAttempted = true; },
      () => {},
    ),
    (error) => error === privateError,
  );
  assert.equal(projectionAttempted, false);
});

test('session hydration identity ignores token refreshes but detects account and beta-claim changes', () => {
  const user = { uid: 'member-1', isAnonymous: false };
  const first = getAuthSessionIdentityKey(user, false);
  assert.equal(getAuthSessionIdentityKey(user, false), first);
  assert.equal(shouldHydrateAuthSession(first, first), false);
  assert.equal(shouldHydrateAuthSession(first, getAuthSessionIdentityKey(user, true)), true);
  assert.equal(shouldHydrateAuthSession(first, getAuthSessionIdentityKey({ uid: 'member-2', isAnonymous: false }, false)), true);
  assert.equal(shouldHydrateAuthSession(first, getAuthSessionIdentityKey({ uid: 'member-1', isAnonymous: true }, false)), true);
  assert.equal(shouldHydrateAuthSession(null, first), true);
  assert.equal(shouldHydrateAuthSession(first, null), false);
});

test('phone sign-in is available only when explicitly enabled for staging or production', () => {
  assert.equal(isPhoneAuthAvailable({ VITE_NEXORA_ENV: 'production', VITE_NEXORA_PHONE_AUTH_ENABLED: 'true' }), true);
  assert.equal(isPhoneAuthAvailable({ VITE_NEXORA_ENV: 'staging', VITE_NEXORA_PHONE_AUTH_ENABLED: 'true' }), true);
  assert.equal(isPhoneAuthAvailable({ VITE_NEXORA_ENV: 'production', VITE_NEXORA_PHONE_AUTH_ENABLED: 'false' }), false);
  assert.equal(isPhoneAuthAvailable({ VITE_NEXORA_ENV: 'local', VITE_NEXORA_PHONE_AUTH_ENABLED: 'true' }), false);
  assert.equal(isPhoneAuthAvailable({ VITE_NEXORA_ENV: 'emulator', VITE_NEXORA_PHONE_AUTH_ENABLED: 'true' }), false);
  assert.equal(isPhoneAuthAvailable({ VITE_NEXORA_ENV: 'production' }), false);
});

test('maps Firebase configuration and credential failures without exposing provider details', () => {
  assert.match(AuthService.mapFirebaseError({ code: 'auth/operation-not-allowed' }), /sign-in method is not enabled/);
  assert.match(AuthService.mapFirebaseError({ code: 'auth/unauthorized-domain' }), /not authorized/);
  assert.match(AuthService.mapFirebaseError({ code: 'auth/invalid-phone-number' }), /Invalid phone number/);
  assert.match(AuthService.mapFirebaseError({ code: 'auth/captcha-check-failed' }), /Phone verification could not be completed/);
  assert.doesNotMatch(AuthService.mapFirebaseError({ code: 'auth/email-already-in-use' }), /already exists/i);
  assert.equal(
    AuthService.mapFirebaseError({ code: 'auth/internal-error', message: 'secret provider stack' }),
    'Firebase could not complete this request (auth/internal-error). Please contact Nexora support with this error code.'
  );
  assert.doesNotMatch(
    AuthService.mapFirebaseError({ code: 'auth/internal-error', message: 'secret provider stack' }),
    /secret provider stack/
  );
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

test('email signup upgrades an anonymous account without changing its Firebase UID or losing its profile', async () => {
  await signOut(auth);
  const anonymous = await signInAnonymously(auth);
  const originalUid = anonymous.user.uid;
  await ProfileService.getOrCreateProfile(anonymous.user);

  const upgradeEmail = `nexora-upgrade-${Date.now()}@example.test`;
  const upgraded = await AuthService.registerWithEmail(
    upgradeEmail,
    password,
    'Upgraded NEXORA Member',
    'upgraded_member',
  );

  assert.equal(upgraded.firebaseUser.uid, originalUid);
  assert.equal(upgraded.user.id, originalUid);
  assert.equal(upgraded.user.name, 'Upgraded NEXORA Member');
  const persisted = await ProfileService.getOrCreateProfile(upgraded.firebaseUser);
  assert.equal(persisted.email, upgradeEmail);
  assert.equal(persisted.name, 'Upgraded NEXORA Member');
  await cleanUp();
});

test('rejects duplicate registration and invalid credentials without creating a second account', async () => {
  await signOut(auth);
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


test('refuses to link a second email/password provider to the same Firebase account', async () => {
  await AuthService.loginWithEmail(email, password);
  await assert.rejects(
    () => AuthService.linkEmailAccount(email, password),
    /email and password sign-in method is already connected/i,
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


test('profile identity, media and creator details survive a fresh authenticated session', async () => {
  await cleanUp();
  const profileEmail = `nexora-profile-roundtrip-${Date.now()}@example.test`;
  const updatedUsername = `profile_member_${Date.now().toString().slice(-8)}`;
  try {
    const created = await AuthService.registerWithEmail(profileEmail, password, 'Profile Before Edit', `before_${Date.now().toString().slice(-8)}`);
    const uid = created.firebaseUser.uid;
    const profilePatch = {
      name: 'Profile After Edit',
      username: updatedUsername,
      avatar: 'https://media.example.test/profile-avatar.webp',
      coverImage: 'https://media.example.test/profile-cover.jpg',
      bio: 'This profile must remain the same after signing in again.',
      website: 'https://example.test',
      pronouns: 'they/them',
      profileCategory: 'Digital Creator',
      creatorType: 'Video Creator',
      socialTwitter: 'https://x.com/nexora_member',
      socialInstagram: 'https://instagram.com/nexora_member',
      profileFrameId: 'frame-aurora',
      profileBadgeId: 'badge-regalia',
      pinnedMusicSong: 'Original Song',
      pinnedMusicArtist: 'NEXORA Creator',
      pinnedMusicUrl: 'https://example.test/music',
      pinnedPosts: ['post-roundtrip'],
      lastDisplayNameChangeTime: new Date().toISOString(),
      lastUsernameChangeTime: new Date().toISOString(),
    };
    await ProfileService.updateProfile(uid, profilePatch);

    const savedPrivate = await ProfileService.getProfile(uid);
    const savedPublic = await ProfileService.getPublicProfile(uid);
    assert.equal(savedPrivate?.coverImage, profilePatch.coverImage);
    assert.equal(savedPublic?.coverImage, profilePatch.coverImage);
    assert.equal(savedPublic?.bio, profilePatch.bio);

    await signOut(auth);
    const restored = await AuthService.loginWithEmail(profileEmail, password);
    assert.equal(restored.firebaseUser.uid, uid);

    const restoredPrivate = await ProfileService.getProfile(uid);
    const restoredPublic = await ProfileService.getPublicProfile(uid);
    for (const [field, value] of Object.entries(profilePatch)) {
      assert.deepEqual((restoredPrivate as any)?.[field], value, `private profile field ${field} must survive sign-in`);
      if (!['lastDisplayNameChangeTime', 'lastUsernameChangeTime'].includes(field)) {
        assert.deepEqual((restoredPublic as any)?.[field], value, `public profile field ${field} must stay synchronized`);
      }
    }
  } finally {
    await cleanUp();
  }
});

after(async () => {
  await cleanUp();
});
