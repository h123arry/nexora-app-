import { access, copyFile, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const assetsDir = join(root, 'assets');
const publicDir = join(root, 'public');
const rootIconsDir = join(root, 'icons');
const publicIconsDir = join(publicDir, 'icons');

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

// Capacitor Assets v4 writes PNG-encoded PWA icons with a .webp suffix and
// places the icons directory at the project root for this project layout.
// Move them into Vite's public directory and give them the correct extension.
if (await exists(rootIconsDir)) {
  await mkdir(publicIconsDir, { recursive: true });
  for (const name of await readdir(rootIconsDir)) {
    await rm(join(publicIconsDir, name), { recursive: true, force: true });
    await rename(join(rootIconsDir, name), join(publicIconsDir, name));
  }
  await rm(rootIconsDir, { recursive: true, force: true });
}

if (await exists(publicIconsDir)) {
  for (const name of await readdir(publicIconsDir)) {
    if (!/^icon-\\d+\\.webp$/.test(name)) continue;
    const from = join(publicIconsDir, name);
    const to = join(publicIconsDir, name.replace(/\\.webp$/, '.png'));
    await rm(to, { force: true });
    await rename(from, to);
  }
}

// Keep a stable public URL for the web app, since Capacitor Assets treats
// /logo.svg as a generated output and removes it during PWA generation.
await copyFile(join(assetsDir, 'logo.svg'), join(publicDir, 'nexora-mark.svg'));

const manifestPath = join(publicDir, 'manifest.json');
const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(manifestPath, 'utf8'));
manifest.icons = (manifest.icons ?? []).map((icon) => ({
  ...icon,
  src: icon.src.replace(/^\\.\\.\\/icons\\//, '/icons/').replace(/\\.webp$/, '.png'),
  type: 'image/png',
}));
for (const shortcut of manifest.shortcuts ?? []) {
  shortcut.icons = [{
    src: '/icons/icon-192.png',
    sizes: '192x192',
    type: 'image/png',
  }];
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\\n');
