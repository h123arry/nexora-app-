import { access, copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const publicDir = join(root, 'public');
const rootIconsDir = join(root, 'icons');
const publicIconsDir = join(publicDir, 'icons');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Capacitor Assets 4 writes PNG-encoded PWA icons with a .webp suffix and
// places its generated icons directory at the project root for this layout.
// Move those outputs into Vite's public directory before the web build.
if (await exists(rootIconsDir)) {
  await mkdir(publicIconsDir, { recursive: true });
  for (const name of await readdir(rootIconsDir)) {
    const source = join(rootIconsDir, name);
    const destination = join(publicIconsDir, name);
    await rm(destination, { recursive: true, force: true });
    await rename(source, destination);
  }
  await rm(rootIconsDir, { recursive: true, force: true });
}

if (await exists(publicIconsDir)) {
  for (const name of await readdir(publicIconsDir)) {
    if (!/^icon-\d+\.webp$/.test(name)) continue;
    const source = join(publicIconsDir, name);
    const destination = join(publicIconsDir, name.replace(/\.webp$/, '.png'));
    await rm(destination, { force: true });
    await rename(source, destination);
  }
}

const generatedIcon = join(publicIconsDir, 'icon-512.png');
if (!(await exists(generatedIcon))) {
  throw new Error('Expected generated PWA asset public/icons/icon-512.png was not found.');
}

// The founder-approved source PNG has a solid black matte. Remove only
// near-black pixels connected to the image border, preserving isolated dark
// details in the mark. Generated platform icons remain separate and opaque.
const approvedLogo = join(root, 'assets', 'logo.png');
const { data: logoPixels, info: logoInfo } = await sharp(approvedLogo)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const pixelCount = logoInfo.width * logoInfo.height;
const visited = new Uint8Array(pixelCount);
const queue = new Uint32Array(pixelCount);
let queueHead = 0;
let queueTail = 0;

const isBlackMatte = (pixelIndex) => {
  const offset = pixelIndex * logoInfo.channels;
  const red = logoPixels[offset];
  const green = logoPixels[offset + 1];
  const blue = logoPixels[offset + 2];
  const brightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  return brightest <= 42 && brightest - darkest <= 24;
};

const enqueueBackground = (pixelIndex) => {
  if (visited[pixelIndex] || !isBlackMatte(pixelIndex)) return;
  visited[pixelIndex] = 1;
  queue[queueTail++] = pixelIndex;
};

for (let x = 0; x < logoInfo.width; x += 1) {
  enqueueBackground(x);
  enqueueBackground((logoInfo.height - 1) * logoInfo.width + x);
}
for (let y = 0; y < logoInfo.height; y += 1) {
  enqueueBackground(y * logoInfo.width);
  enqueueBackground(y * logoInfo.width + logoInfo.width - 1);
}

while (queueHead < queueTail) {
  const pixelIndex = queue[queueHead++];
  const offset = pixelIndex * logoInfo.channels;
  logoPixels[offset] = 0;
  logoPixels[offset + 1] = 0;
  logoPixels[offset + 2] = 0;
  logoPixels[offset + 3] = 0;
  const x = pixelIndex % logoInfo.width;
  const y = Math.floor(pixelIndex / logoInfo.width);
  if (x > 0) enqueueBackground(pixelIndex - 1);
  if (x + 1 < logoInfo.width) enqueueBackground(pixelIndex + 1);
  if (y > 0) enqueueBackground(pixelIndex - logoInfo.width);
  if (y + 1 < logoInfo.height) enqueueBackground(pixelIndex + logoInfo.width);
}

await sharp(logoPixels, { raw: logoInfo })
  .png()
  .toFile(join(publicDir, 'nexora-mark.png'));
await copyFile(generatedIcon, join(publicDir, 'logo.png'));
await rm(join(publicDir, 'nexora-mark.svg'), { force: true });
await rm(join(publicDir, 'logo.svg'), { force: true });

const manifestPath = join(publicDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.icons = (manifest.icons ?? []).map((icon) => ({
  ...icon,
  src: icon.src.replace(/^\.\.\/icons\//, '/icons/').replace(/\.webp$/, '.png'),
  type: 'image/png',
}));
for (const shortcut of manifest.shortcuts ?? []) {
  shortcut.icons = [{
    src: '/icons/icon-192.png',
    sizes: '192x192',
    type: 'image/png',
  }];
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
