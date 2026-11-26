import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Android app declares a verified relationship with the canonical NEXORA website', async () => {
  const manifest = await readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
  const strings = await readFile(new URL('../android/app/src/main/res/values/strings.xml', import.meta.url), 'utf8');
  assert.ok(manifest.includes('android:name="asset_statements"'));
  assert.ok(strings.includes('delegate_permission/common.handle_all_urls'));
  const encodedStatement = strings.match(/<string name="asset_statements"[^>]*>([\\s\\S]*?)<\\/string>/)?.[1];
  assert.ok(encodedStatement);
  const assetStatements = JSON.parse(encodedStatement.replace(/&quot;/g, '"'));
  assert.equal(assetStatements[0]?.target?.site, 'https://nexoraapp.com.ng');
});

test('download page links the web manifest and reads the installed Android version field', async () => {
  const page = await readFile(new URL('../public/download/index.html', import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
  assert.ok(page.includes('<link rel="manifest" href="/manifest.json">'));
  assert.ok(page.includes('match?.version&&parseVersion(match.version)'));
  assert.ok(!page.includes('match?.versionName'));
  assert.deepEqual(manifest.related_applications, [{
    platform: 'play',
    id: 'com.voiceofharrison.nexora',
  }]);
});
