import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('comments sheet occupies at 60 percent of the viewport, scrolls independently and locks the feed', async () => {
  const feed = await readFile(new URL('../src/components/FeedView.tsx', import.meta.url), 'utf8');
  assert.match(feed, /comments-container fixed bottom-0 inset-x-0 h-\[60dvh\] min-h-\[60dvh\] max-h-\[60dvh\]/);
  assert.match(feed, /overflow-y-auto overscroll-y-contain overscroll-contain touch-pan-y/);
  assert.ok(feed.includes('className="comments-container fixed bottom-0 inset-x-0 h-[60dvh] min-h-[60dvh] max-h-[60dvh] bg-[#090714]/[0.98]'));
  assert.ok(!feed.includes('comments-container fixed bottom-0 inset-x-0 h-[60dvh] min-h-[60dvh] max-h-[60dvh] rounded-t-'));
  assert.ok(!feed.includes('p-3 rounded-2xl bg-slate-950/40 border border-white/5'));
  assert.ok(!feed.includes('text-xs bg-white/2 p-2 rounded-xl border border-white/3'));
  assert.match(feed, /feed\.style\.overflowY = 'hidden'/);
  assert.match(feed, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(feed, /expandedCommentReplyIds/);
  assert.match(feed, /c\.replies\.slice\(0, expandedCommentReplyIds\[c\.id\] \? c\.replies\.length : 1\)/);
  assert.match(feed, /aria-expanded=\{!!expandedCommentReplyIds\[c\.id\]\}/);
  assert.match(feed, /View \$\{c\.replies\.length - 1\} more/);
  assert.match(feed, /Hide replies/);
  assert.match(feed, /ChevronDown/);
  assert.match(feed, /ChevronUp/);
  assert.match(feed, /handleSparkReply/);
  assert.match(feed, /setPublicPostCommentReplyLikeState/);
  assert.match(feed, /aria-label=\{replySparkStates/);
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
