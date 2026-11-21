import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('comments sheet occupies exactly the bottom half, scrolls independently and locks the feed', async () => {
  const feed = await readFile(new URL('../src/components/FeedView.tsx', import.meta.url), 'utf8');
  assert.match(feed, /comments-container fixed bottom-0 inset-x-0 h-\[50dvh\] min-h-\[50dvh\] max-h-\[50dvh\]/);
  assert.match(feed, /overflow-y-auto overscroll-contain touch-pan-y/);
  assert.match(feed, /comments-container[^\n]*bg-\\[#090714\\]/);
  assert.doesNotMatch(feed, /comments-container[^\n]*rounded-t|p-3 rounded-2xl bg-slate-950\\/40 border border-white\\/5/);
  assert.doesNotMatch(feed, /text-xs bg-white\\/2 p-2 rounded-xl border border-white\\/3/);
  assert.match(feed, /feed\.style\.overflowY = 'hidden'/);
  assert.match(feed, /document\.body\.style\.overflow = 'hidden'/);
});

test('comment actions use persisted comment, reply and reaction flows', async () => {
  const [feed, app, push] = await Promise.all([
    readFile(new URL('../src/components/FeedView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../functions/src/pushDelivery.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(feed, /await onAddComment\(postId, content\)/);
  assert.match(feed, /nexora-add-reply/);
  assert.match(feed, /handleSparkComment\(post\.id, c\.id\)/);
  assert.match(app, /addPostCommentReply\(postId, commentId, replyContent, replyId\)/);
  assert.match(push, /if \(type === 'comment'\)/);
  assert.match(push, /if \(type === 'comment_reply'\)/);
  assert.match(push, /users\/\{userId\}\/notifications\/\{notificationId\}/);
});
