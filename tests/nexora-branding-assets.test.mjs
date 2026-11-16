import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('canonical web and native NEXORA logo sources stay identical', async () => {
  const [web, native] = await Promise.all([
    read('../public/logo.svg'),
    read('../assets/logo.svg'),
  ]);
  assert.equal(web, native);
  assert.match(web, /aria-label="NEXORA"/);
  assert.match(web, /linearGradient/);
  assert.match(web, /#F044E8/);
  assert.match(web, /#8B20FF/);
  assert.match(web, /#174BFF/);
  assert.match(web, /#00E5F2/);
});

test('shared app branding and watermark use the canonical public mark', async () => {
  const [logo, brand, watermark] = await Promise.all([
    read('../src/components/NexoraPremiumLogo.tsx'),
    read('../src/components/NexoraBranding.tsx'),
    read('../src/components/branding/NexoraWatermark.tsx'),
  ]);
  assert.match(logo, /src="\/logo\.svg"/);
  assert.match(brand, /NexoraPremiumLogo/);
  assert.match(watermark, /NexoraPremiumLogo/);
});

test('mobile asset commands regenerate Android, iOS and PWA outputs from the source SVG', async () => {
  const pkg = JSON.parse(await read('../package.json'));
  assert.match(pkg.scripts['mobile:assets:android'], /capacitor-assets generate --android/);
  assert.match(pkg.scripts['mobile:assets:ios'], /capacitor-assets generate --ios/);
  assert.match(pkg.scripts['mobile:assets:pwa'], /capacitor-assets generate --pwa/);
  assert.match(pkg.scripts['mobile:assets'], /mobile:assets:android.*mobile:assets:ios.*mobile:assets:pwa/);
  assert.ok(pkg.devDependencies['@capacitor/assets']);
});

test('native CI regenerates the matching platform assets before compiling', async () => {
  const workflow = await read('../.github/workflows/native-mobile-ci.yml');
  assert.match(workflow, /Generate official Android app icons and splash resources[\s\S]*?npm run mobile:assets:android/);
  assert.match(workflow, /Generate official iOS app icon and launch resources[\s\S]*?npm run mobile:assets:ios/);
  assert.match(workflow, /Generate iOS, Android and PWA assets from approved SVG[\s\S]*?npm run mobile:assets/);
});
