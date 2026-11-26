import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('comments sheet is portaled above animated feed cards and keeps its composer above the mobile keyboard', async () => {
  const feed = await readFile(new URL('../src/components/FeedView.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(feed, /nx-comments-sheet comments-container fixed inset-x-0 h-\[68dvh\] min-h-\[240px\] max-h-\[100dvh\]/);
  assert.match(feed, /createPortal\([\s\S]*document\.body/);
  assert.match(feed, /window\.visualViewport/);
  assert.match(feed, /viewport\?\.addEventListener\('resize', updateViewport\)/);
  assert.match(feed, /commentsViewport\.bottom/);
  assert.match(feed, /commentsViewport\.height/);
  assert.match(feed, /nx-comments-composer sticky bottom-0 z-10/);
  assert.match(feed, /ref=\{commentInputRef\}/);
  assert.match(feed, /enterKeyHint="send"/);
  assert.match(feed, /commentInputRef\.current\?\.focus/);
  assert.match(css, /\.nx-comments-sheet \.nx-comments-composer/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(feed, /overflow-y-auto overscroll-y-contain overscroll-contain touch-pan-y/);
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
  assert.match(feed, /api\/social\/comment-reply-spark-state/);
  const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(server, /app\.use\('\/api\/social\/comment-reply-spark-state', requireFirebaseUser, socialSparkHttpLimiter\)/);
  assert.match(server, /setPublicPostCommentReplyLike\(serverDb, uid, postId, commentId, replyId, liked\)/);
  assert.match(feed, /aria-label=\{replySparkStates/);
});

test('comment actions use persisted comment, reply and reaction flows', async () => {
  const [feed, app, push] = await Promise.all([
    readFile(new URL('../src/components/FeedView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../functions/src/pushDelivery.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(feed, /await onAddComment\(postId, content\)/);
  assert.match(feed, /await onAddReply\(postId, commentId, content, replyId\)/);
  assert.match(feed, /setReplyInputs\(previous => \(\{ \.\.\.previous, \[commentId\]: '' \}\)\)/);
  assert.match(feed, /submittingReplies\[commentId\]/);
  assert.match(feed, /handleSparkComment\(post\.id, c\.id\)/);
  assert.match(app, /addPostCommentReply\(postId, commentId, content, replyId\)/);
  assert.match(app, /const handleAddReply = async/);
  assert.match(app, /if \(isOffline \|\| !navigator\.onLine\)/);
  assert.match(push, /if \(type === 'comment'\)/);
  assert.match(push, /if \(type === 'comment_reply'\)/);
  assert.match(push, /users\/\{userId\}\/notifications\/\{notificationId\}/);
});


test('failed comment submissions remain visible, preserve the draft, and clear feedback while editing', async () => {
  const feed = await readFile(new URL('../src/components/FeedView.tsx', import.meta.url), 'utf8');
  assert.match(feed, /if \(saved === false\)[\s\S]*?Your draft is still here/);
  assert.match(feed, /role="status" aria-live="polite"/);
  assert.match(feed, /setCommentInputs\(prev => \(\{ \.\.\.prev, \[post\.id\]: e\.target\.value \}\)\)/);
  assert.match(feed, /delete next\[post\.id\]/);
});
