import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const readText = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const readBinary = (path) => readFile(new URL(path, import.meta.url));
const pngDimensions = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
});

 test('the approved source PNG and generated platform icon remain separate assets', async () => {
  const [source, icon, mark, legacy] = await Promise.all([
    readBinary('../assets/logo.png'),
    readBinary('../public/icons/icon-512.png'),
    readBinary('../public/nexora-mark.png'),
    readBinary('../public/logo.png'),
  ]);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.deepEqual(pngDimensions(source), { width: 1920, height: 1920 });
  assert.deepEqual(pngDimensions(icon), { width: 512, height: 512 });
  assert.deepEqual(pngDimensions(mark), { width: 1920, height: 1920 });
  assert.equal(mark[25], 6, 'the generated in-app mark must have an RGBA channel');
  const { data: markPixels } = await sharp(mark).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparentPixels = 0;
  for (let offset = 3; offset < markPixels.length; offset += 4) {
    if (markPixels[offset] === 0) transparentPixels += 1;
  }
  assert.ok(transparentPixels > 0, 'the generated in-app mark must contain transparent background pixels');
  assert.deepEqual(legacy, icon);
});

test('shared app branding and watermark use the generated exact-art PNG', async () => {
  const [logo, brand, watermark, index] = await Promise.all([
    readText('../src/components/NexoraPremiumLogo.tsx'),
    readText('../src/components/NexoraBranding.tsx'),
    readText('../src/components/branding/NexoraWatermark.tsx'),
    readText('../index.html'),
  ]);
  assert.match(logo, /src="\/nexora-mark\.png"/);
  assert.match(brand, /NexoraPremiumLogo/);
  assert.match(watermark, /NexoraPremiumLogo/);
  assert.match(index, /href="\/icons\/icon-48\.png"/);
  assert.match(index, /src="\/nexora-mark\.png"/);
  assert.match(index, /og:image" content="\/icons\/icon-512\.png"/);
});

test('mobile asset commands regenerate Android, iOS and PWA outputs from the PNG source', async () => {
  const pkg = JSON.parse(await readText('../package.json'));
  assert.match(pkg.scripts['mobile:assets:android'], /capacitor-assets generate --android/);
  assert.match(pkg.scripts['mobile:assets:ios'], /capacitor-assets generate --ios/);
  assert.match(pkg.scripts['mobile:assets:pwa'], /capacitor-assets generate --pwa/);
  assert.match(pkg.scripts['mobile:assets'], /mobile:assets:android.*mobile:assets:ios.*mobile:assets:pwa/);
  assert.ok(pkg.devDependencies['@capacitor/assets']);
  const sync = await readText('../scripts/sync-nexora-brand-assets.mjs');
  assert.match(sync, /icon-512\.png/);
  assert.match(sync, /assets', 'logo\.png/);
  assert.match(sync, /sharp\(approvedLogo\)/);
  assert.match(sync, /isBlackMatte/);
  assert.match(sync, /nexora-mark\.png/);
  assert.match(pkg.scripts.dev, /sync-nexora-brand-assets/);
  assert.match(pkg.scripts.build, /sync-nexora-brand-assets/);
  assert.match(pkg.scripts['build:web'], /sync-nexora-brand-assets/);
  assert.match(sync, /logo\.png/);
  assert.ok(sync.includes("type: 'image/png'"));
});

test('native CI regenerates matching platform assets before compiling', async () => {
  const workflow = await readText('../.github/workflows/native-mobile-ci.yml');
  assert.match(workflow, /Generate official Android app icons and splash resources[\s\S]*?npm run mobile:assets:android/);
  assert.match(workflow, /Generate official iOS app icon and launch resources[\s\S]*?npm run mobile:assets:ios/);
  assert.match(workflow, /Generate iOS, Android and PWA assets from approved PNG[\s\S]*?npm run mobile:assets/);
});


test('shared Nexora design tokens resolve to the approved violet palette', async () => {
  const css = await readText('../src/index.css');
  assert.match(css, /--nx-violet:\s*#7138FF;/);
  assert.match(css, /--nx-violet-bright:\s*#A855F7;/);
  assert.match(css, /--nx-violet-deep:\s*#4B10F2;/);
  assert.match(css, /--nx-gradient:\s*linear-gradient\(110deg,\s*#8A3FFC 0%,\s*#7138FF 38%,\s*#4B10F2 72%,\s*#1600A3 100%\);/);
  assert.doesNotMatch(css, /--nx-violet:\s*#315BFF|--nx-violet-bright:\s*#55C9F2/);
  assert.doesNotMatch(css, /--nx-gradient:.*#E94BFF|--nx-gradient:.*#00D8F0/);
});
