import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('guest exploration never impersonates a person or uses stock-person avatars', async () => {
  const app = await read('../src/App.tsx');
  assert.match(app, /name: 'Explore NEXORA'/);
  assert.doesNotMatch(app, /guest_visitor_id|name: 'Nexora Visitor'|username: 'visitor'/i);
  assert.match(app, /avatar: '\/nexora-mark\.png'/);
  assert.doesNotMatch(app, /Nexora Visitor|Guest visitor browsing Nexora network|photo-1535713875002-d1d0cf377fde/);
  assert.match(app, /requireAuth\(\(\) => \{\s*void \(async \(\) => \{/);
  assert.match(app, /navigateTo\('profile', null\)/);
  assert.match(app, /!isLoggedIn \|\| requiresPublicAccountSetup/);
  assert.match(app, /getSafeAvatar\(post\.avatar, post\.name \|\| post\.username\)/);
  assert.match(app, /getSafeAvatar\(c\.avatar, c\.name \|\| c\.username\)/);
  assert.match(app, /getSafeAvatar\(u\.avatar, u\.name \|\| u\.username\)/);
  assert.match(app, /!isLoggedIn \|\| !firebaseUser \|\| currentUser\.id !== firebaseUser\.uid/);
  assert.match(app, /!pendingAuthAction \|\| !firebaseUser \|\| currentUser\.id !== firebaseUser\.uid/);
  const feed = await read('../src/components/FeedView.tsx');
  assert.doesNotMatch(feed, /guest_visitor_id|username === 'visitor'/);
  assert.match(feed, /public_explore_session/);
  assert.match(app, /authenticatedUserId=\{firebaseUser\?\.uid \|\| ''\}/);
  assert.match(app, /navigateTo\('profile', null\)/);
  assert.match(app, /\[A-Za-z0-9_-\]\{21,\}/);

});

test('transient notification banners stay disabled while the saved inbox and device push remain available', async () => {
  const [banner, activity, push] = await Promise.all([
    read('../src/components/NotificationPopBanner.tsx'),
    read('../src/components/ActivityView.tsx'),
    read('../src/services/firebase/pushNotificationService.ts'),
  ]);
  assert.match(banner, /return null/);
  assert.match(activity, /collection\(db, 'users', uid, 'notifications'\)/);
  assert.match(push, /registration\.showNotification\(payload\.title, options\)/);
  const app = await read('../src/App.tsx');
  assert.doesNotMatch(app, /playNexoraSound\('interface\.confirmation'\)/);
});

test('media uploads wait for Firebase auth hydration and retain UID ownership checks', async () => {
  const storage = await read('../src/services/firebase/storageService.ts');
  assert.match(storage, /await auth\.authStateReady\(\)/);
  assert.match(storage, /user\.uid !== userId/);
});

test('photo and video publishing use the Firebase UID, not a potentially stale profile snapshot', async () => {
  const [app, composer] = await Promise.all([
    read('../src/App.tsx'),
    read('../src/components/MediaCreationEngine.tsx'),
  ]);
  assert.match(app, /authenticatedUserId=\{firebaseUser\?\.uid \|\| ''\}/);
  assert.match(app, /const publisher = firebaseProfile && firebaseUser && firebaseProfile\.id === firebaseUser\.uid/);
  assert.match(app, /userId: publisher\.id/);
  assert.match(composer, /const uploadOwnerId = authenticatedUserId \|\| currentUser\.id/);
  assert.equal((composer.match(/userId: uploadOwnerId/g) || []).length, 4);
  assert.doesNotMatch(composer, /userId: currentUser\.id/);
});

test('public profile onboarding creates a real username/password credential on the same Firebase UID', async () => {
  const [setup, auth] = await Promise.all([
    read('../src/components/PublicAccountSetup.tsx'),
    read('../src/services/firebase/authService.ts'),
  ]);
  assert.match(setup, /AuthService\.completeUsernameRegistration/);
  assert.match(auth, /linkWithCredential\(current, EmailAuthProvider\.credential\(email, input\.password\)\)/);
  assert.match(auth, /ProfileService\.reserveUsername\(current\.uid, username\)/);
});

test('Google signup does not assign a stock-person avatar when Google has no photo', async () => {
  const auth = await read('../src/services/firebase/authService.ts');
  assert.match(auth, /avatar: fbUser\.photoURL \|\| ''/);
  assert.doesNotMatch(auth, /photo-1535713875002-d1d0cf377fde/);
});

test('missing public profile links finish at the new member own profile after signup', async () => {
  const [app, profile, setup] = await Promise.all([
    read('../src/App.tsx'),
    read('../src/services/firebase/profileService.ts'),
    read('../src/components/PublicAccountSetup.tsx'),
  ]);
  assert.match(profile, /getPublicProfileByUsername\(username: string\)/);
  assert.match(profile, /doc\(db, 'usernames', clean\)/);
  assert.match(app, /getPublicProfileByUsername\(cleanIdOrUser\)/);
  assert.match(app, /navigateTo\('profile', null\)/);
  assert.doesNotMatch(app, /void handleViewProfile\(userIdOrUsername\)/);
  assert.match(setup, /AuthService\.completeUsernameRegistration/);
});

test('public profile signup offers both username/password and email/password paths', async () => {
  const [app, setup, authView, authService, profileService] = await Promise.all([
    read('../src/App.tsx'),
    read('../src/components/PublicAccountSetup.tsx'),
    read('../src/components/AuthView.tsx'),
    read('../src/services/firebase/authService.ts'),
    read('../src/services/firebase/profileService.ts'),
  ]);
  assert.match(setup, /onSwitchToEmailSignup/);
  assert.match(app, /<AuthView[\s\S]*initialMode="signup"/);
  assert.match(authView, /handleEmailSignupSubmit/);
  assert.match(authService, /createUserWithEmailAndPassword\(auth, cleanEmail, password\)/);
  assert.match(authService, /if \(existingUser\?\.isAnonymous\)/);
  assert.match(authService, /linkWithCredential\(\s*existingUser,\s*EmailAuthProvider\.credential\(cleanEmail, password\)/);
  assert.match(authService, /ProfileService\.updateProfile\(fbUser\.uid, \{\s*name: fullName\.trim\(\)/);
  assert.match(profileService, /email: firebaseUser\.email/);

  assert.match(authService, /sendEmailVerification\(fbUser\)/);
});

test('profile edits persist the private profile and update its public projection', async () => {
  const profile = await read('../src/services/firebase/profileService.ts');
  assert.match(profile, /await runTransaction\(db, async transaction =>/);
  assert.match(profile, /transaction.update\(privateProfileRef, \{ \.\.\.updates, updatedAt: serverTimestamp\(\) \}\)/);
  assert.match(profile, /transaction.set\(publicProfileRef/);
  assert.match(profile, /doc\(db, 'publicProfiles', uid\)/);
});

test('public profile links resolve through canonical username claims, not private user documents', async () => {
  const profile = await read('../src/services/firebase/profileService.ts');
  const app = await read('../src/App.tsx');
  assert.match(profile, /getPublicProfileByUsername\(username: string\)/);
  assert.match(profile, /doc\(db, 'usernames', clean\)/);
  assert.match(profile, /return this\.getPublicProfile\(uid\)/);
  assert.match(app, /ProfileService\.getPublicProfileByUsername\(cleanIdOrUser\)/);
});

test('normalizes feed posts into a unique id set before rendering', async () => {
  const app = await read('../src/App.tsx');
  assert.match(app, /const uniquePosts = new Map<string, Post>\(\)/);
  assert.match(app, /if \(post\?\.id && !uniquePosts\.has\(post\.id\)\) uniquePosts\.set\(post\.id, post\)/);
  assert.match(app, /return \[\.\.\.uniquePosts\.values\(\)\]/);
});

test('profile relationship lists use live Firestore edges and respect participant privacy', async () => {
  const profile = await read('../src/components/ProfileView.tsx');
  assert.match(profile, /subscribeToFollows\(currentUser\.id/);
  assert.match(profile, /const allFollows = profileFollows/);
  assert.match(profile, /const allRegisteredUsers = relationshipUsers/);
  assert.doesNotMatch(profile, /localStorage\.getItem\('nexora_db_follows'/);
  assert.doesNotMatch(profile, /localStorage\.getItem\('nexora_users_db'/);
  assert.match(profile, /Relationship lists are private for this account/);
});
