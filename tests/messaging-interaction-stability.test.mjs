import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('messaging opens one stable action menu for touch, context-menu and double-tap gestures', async () => {
  const bubble = await readFile(new URL('../src/components/MessageBubble.tsx', import.meta.url), 'utf8');
  const inbox = await readFile(new URL('../src/components/NewInboxView.tsx', import.meta.url), 'utf8');
  assert.match(bubble, /onTouchStart=\{\(\) => \{[\s\S]*?onToggleContextMenu\(message\.id\)/);
  assert.match(bubble, /onContextMenu=\{\(e\) => \{[\s\S]*?e\.preventDefault\(\);[\s\S]*?onToggleContextMenu\(message\.id\)/);
  assert.match(bubble, /onDoubleClick=\{\(\) => onToggleContextMenu\(message\.id\)\}/);
  assert.doesNotMatch(bubble, /onToggleContextMenu\(message\.id\);\s*onLongPress/);
  assert.match(inbox, /onToggleContextMenu=\{\(messageId\) => setActiveContextMessageId\(messageId\)\}/);
  assert.match(bubble, /aria-label="Quick reactions"/);
  for (const emoji of ['❤️', '😂', '😮', '😢', '🙏', '👍']) assert.ok(bubble.includes(emoji), `missing quick reaction ${emoji}`);
  assert.match(bubble, /aria-label="Message actions"/);
});

test('messaging layout removes the outer card and fills the available conversation viewport', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /\.nx-inbox-shell\s*\{[\s\S]*?border:\s*0 !important;[\s\S]*?border-radius:\s*0 !important;[\s\S]*?box-shadow:\s*none !important;/);
  assert.match(css, /\.nx-inbox-chat > div:nth-child\(2\)\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?overscroll-behavior:\s*contain;/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
