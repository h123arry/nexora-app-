import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Android system Back is routed through the app navigation policy', async () => {
  const activity = await read('../android/app/src/main/java/com/voiceofharrison/nexora/MainActivity.java');
  const app = await read('../src/App.tsx');

  assert.match(activity, /getOnBackPressedDispatcher\(\)\.addCallback/);
  assert.match(activity, /nexora:android-back/);
  assert.match(activity, /event\.defaultPrevented/);
  assert.match(activity, /if \(!"true"\.equals\(handled\)\)/);
  assert.match(activity, /moveTaskToBack\(true\)/);
  assert.match(app, /window\.addEventListener\('nexora:android-back', onNativeBack\)/);
  assert.match(app, /window\.removeEventListener\('nexora:android-back', onNativeBack\)/);
  assert.match(app, /if \(isCreatePostModalOpen\) return/);
  assert.match(app, /if \(!hasBackHistoryEntryRef\.current\)/);
});

test('Back dismisses focused text entry before overlays and nested routes', async () => {
  const app = await read('../src/App.tsx');
  const keyboard = app.indexOf('focusedElement.blur();');
  const navMenu = app.indexOf('if (isNavMenuOpen)');
  const localOverlay = app.indexOf("new CustomEvent('nexora-escape'");
  const nestedProfile = app.indexOf('if (viewedUser !== null)');

  assert.notEqual(keyboard, -1);
  assert.ok(keyboard < navMenu, 'keyboard must be dismissed before menus');
  assert.ok(navMenu < localOverlay, 'global navigation menu is handled before local overlays');
  assert.ok(localOverlay < nestedProfile, 'local overlays are handled before nested routes');

  for (const state of [
    'showPublicAccountSetup',
    'showEmailAuth',
    'showAuthChoice',
    'isNexoraStudioOpen',
    'isCreatePostModalOpen',
    'isCreateMenuOpen',
    'isSystemHubOpen',
    'isUniversalSearchOpen',
    'showPWAInstallPrompt',
    'showOnboarding',
  ]) {
    assert.match(app, new RegExp(`if \\(${state}\\)`), `Back should account for ${state}`);
  }
});

test('Create and Studio nested surfaces consume Back before their parent screens', async () => {
  const create = await read('../src/components/MediaCreationEngine.tsx');
  const studio = await read('../src/components/NexoraStudio.tsx');

  assert.match(create, /window\.addEventListener\('nexora:android-back', handleAndroidBack\)/);
  assert.match(create, /window\.addEventListener\('nexora-escape', handleAndroidBack\)/);
  assert.match(create, /event\.preventDefault\(\)/);
  assert.match(studio, /window\.addEventListener\('nexora-escape', handleEscape\)/);
  assert.match(studio, /event\.target === event\.currentTarget/);
});

test('temporary navigation menu and report dialog support outside dismissal', async () => {
  const menu = await read('../src/components/SlideDownMenu.tsx');
  const report = await read('../src/components/ReportModal.tsx');

  assert.match(menu, /window\.addEventListener\('nexora-escape'/);
  assert.match(menu, /onClick=\{onClose\}/);
  assert.match(report, /event\.target === event\.currentTarget/);
  assert.match(report, /aria-modal="true"/);
  assert.match(report, /aria-labelledby="report-modal-title"/);
  assert.match(report, /id="report-modal-title"/);
});
