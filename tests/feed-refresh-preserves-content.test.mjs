import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('an empty feed refresh never clears previously loaded posts', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /setPosts\(previousPosts => page\.posts\.length > 0[\s\S]*?mergeRealtimePosts\(previousPosts, page\.posts\)[\s\S]*?: previousPosts\)/);
  assert.doesNotMatch(app, /setPosts\(previousPosts => page\.posts\.length > 0 \? mergeRealtimePosts\(previousPosts, page\.posts\) : \[\]\)/);
});
