import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('guest exploration never impersonates a person or uses stock-person avatars', async () => {
  const app = await read('../src/App.tsx');
  assert.match(app, /name: 'Explore NEXORA'/);
  assert.match(app, /avatar: '\/nexora-mark\.png'/);
  assert.doesNotMatch(app, /Nexora Visitor|Guest visitor browsing Nexora network|photo-1535713875002-d1d0cf377fde/);
  assert.match(app, /requireAuth\(\(\) => \{ void handleViewProfile\(userIdOrUsername\); \}/);
  assert.match(app, /!isLoggedIn \|\| requiresPublicAccountSetup/);
  assert.match(app, /getSafeAvatar\(post\.avatar, post\.name \|\| post\.username\)/);
  assert.match(app, /getSafeAvatar\(c\.avatar, c\.name \|\| c\.username\)/);
  assert.match(app, /getSafeAvatar\(u\.avatar, u\.name \|\| u\.username\)/);
  assert.match(app, /!isLoggedIn \|\| !firebaseUser \|\| currentUser\.id !== firebaseUser\.uid/);
  assert.match(app, /!pendingAuthAction \|\| !firebaseUser \|\| currentUser\.id !== firebaseUser\.uid/);
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
});

test('media uploads wait for Firebase auth hydration and retain UID ownership checks', async () => {
  const storage = await read('../src/services/firebase/storageService.ts');
  assert.match(storage, /await auth\.authStateReady\(\)/);
  assert.match(storage, /user\.uid !== userId/);
});

test('profile edits persist the private profile and update its public projection', async () => {
  const profile = await read('../src/services/firebase/profileService.ts');
  assert.match(profile, /await updateDoc\(docRef, \{ \.\.\.updates, updatedAt: serverTimestamp\(\) \}\)/);
  assert.match(profile, /doc\(db, 'publicProfiles', uid\)/);
});
