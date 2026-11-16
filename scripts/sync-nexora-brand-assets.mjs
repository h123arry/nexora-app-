import { access, copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const assetsDir = join(root, 'assets');
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

// Capacitor Assets removes /logo.svg during PWA generation. Keep a stable,
// separate URL for the React app, favicon and social metadata.
await copyFile(join(assetsDir, 'logo.svg'), join(publicDir, 'nexora-mark.svg'));

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
