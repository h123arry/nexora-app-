import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aggregateMessageReactions, isSupportedOutgoingMediaType, normalizeMessageReactionUsers, omitUndefinedFields, serializeOutgoingMessage, toggleMessageReaction } from '../src/utils/messageSerialization';

describe('Firestore message serialization', () => {
  it('omits undefined optional fields but preserves actual message data and the original object', () => {
    const localMessage = {
      id: 'message-1',
      content: 'Hello',
      status: 'sent',
      voiceAudioUrl: undefined,
      videoUrl: undefined,
    };
    assert.deepEqual(omitUndefinedFields(localMessage), {
      id: 'message-1', content: 'Hello', status: 'sent',
    });
    assert.equal('voiceAudioUrl' in localMessage, true);
    assert.equal(omitUndefinedFields({ ...localMessage, voiceAudioUrl: 'private-audio-path' }).voiceAudioUrl, 'private-audio-path');
  });

  it('persists sent while retaining transient sending state in the local message', () => {
    const localMessage = {
      id: 'message-2',
      content: 'Hello',
      status: 'sending',
      voiceAudioUrl: undefined,
      customMediaType: 'voice',
    };

    assert.deepEqual(serializeOutgoingMessage(localMessage), {
      id: 'message-2', content: 'Hello', status: 'sent', customMediaType: 'voice',
    });
    assert.equal(localMessage.status, 'sending');
  });

  it('accepts all supported direct-message media types and rejects unknown types', () => {
    for (const type of ['voice', 'image', 'video', 'audio', 'document', 'sticker']) assert.equal(isSupportedOutgoingMediaType(type), true);
    assert.equal(isSupportedOutgoingMediaType('executable'), false);
  });

  it('persists exact reply targets and safe sticker payloads', () => {
    assert.deepEqual(serializeOutgoingMessage({
      id: 'message-sticker', chatId: 'chat-1', senderId: 'alice', content: '[STICKER]',
      timestamp: '2026-11-21T00:00:00.000Z', status: 'sending',
      replyToQuote: 'That is brilliant', replyToMessageId: 'message-original',
      customMediaType: 'sticker', customMediaData: { emoji: '💜', label: 'Nexora love' },
      isOfflineUnsent: false,
    } as any), {
      id: 'message-sticker', chatId: 'chat-1', senderId: 'alice', content: '[STICKER]',
      timestamp: '2026-11-21T00:00:00.000Z', status: 'sent',
      replyToQuote: 'That is brilliant', replyToMessageId: 'message-original',
      customMediaType: 'sticker', customMediaData: { emoji: '💜', label: 'Nexora love' },
    });
  });

  it('persists the private voice media path so the recipient can resolve playback', () => {
    const path = 'chats/chat-1/media/alice/voice-1';
    assert.deepEqual(serializeOutgoingMessage({
      id: 'voice-1', chatId: 'chat-1', senderId: 'alice', content: '[VOICE]', timestamp: '2026-11-20T00:00:00.000Z',
      status: 'sending', customMediaType: 'voice', mediaType: 'audio', mediaStoragePath: path,
      voiceAudioUrl: path, voiceDuration: '8s', mediaContentType: 'audio/webm',
    }), {
      id: 'voice-1', chatId: 'chat-1', senderId: 'alice', content: '[VOICE]', timestamp: '2026-11-20T00:00:00.000Z',
      status: 'sent', customMediaType: 'voice', mediaType: 'audio', mediaStoragePath: path,
      voiceAudioUrl: path, voiceDuration: '8s', mediaContentType: 'audio/webm',
    });
  });

  it('whitelists persisted message fields so local retry flags never reach Firestore', () => {
    assert.deepEqual(serializeOutgoingMessage({
      id: 'message-3', chatId: 'chat-1', senderId: 'alice', content: '[IMAGE]', timestamp: '2026-11-20T00:00:00.000Z',
      status: 'failed', mediaStoragePath: 'chats/chat-1/media/alice/image-1', mediaType: 'image',
      mediaContentType: 'image/jpeg', fileName: 'photo.jpg', fileSize: '1200', isOfflineUnsent: true,
      reactions: [], videoUrl: 'local-preview',
    } as any), {
      id: 'message-3', chatId: 'chat-1', senderId: 'alice', content: '[IMAGE]', timestamp: '2026-11-20T00:00:00.000Z',
      status: 'sent', mediaStoragePath: 'chats/chat-1/media/alice/image-1', mediaType: 'image',
      mediaContentType: 'image/jpeg', fileName: 'photo.jpg', fileSize: '1200',
    });
  });
});


describe('message reaction persistence model', () => {
  it('aggregates recipient-owned emoji lists into the existing bubble reaction shape', () => {
    assert.deepEqual(aggregateMessageReactions({
      alice: ['❤️', '😂'],
      bob: ['❤️'],
    }, undefined), [
      { emoji: '❤️', userIds: ['alice', 'bob'] },
      { emoji: '😂', userIds: ['alice'] },
    ]);
  });

  it('migrates legacy aggregate reactions into per-user reaction records', () => {
    assert.deepEqual(normalizeMessageReactionUsers({ bob: [] }, [
      { emoji: '❤️', userIds: ['alice', 'bob'] },
      { emoji: '😂', userIds: ['alice'] },
    ]), { alice: ['❤️', '😂'], bob: [] });
  });

  it('toggles only the acting user and preserves every other member reaction', () => {
    const initial = { charlie: ['😂'] };
    const legacy = [{ emoji: '❤️', userIds: ['alice', 'bob'] }];
    assert.deepEqual(toggleMessageReaction(initial, legacy, 'alice', '❤️'), {
      charlie: ['😂'], alice: [],
    });
    assert.deepEqual(aggregateMessageReactions(
      toggleMessageReaction(initial, legacy, 'alice', '❤️'),
      legacy,
    ), [
      { emoji: '❤️', userIds: ['bob'] },
      { emoji: '😂', userIds: ['charlie'] },
    ]);
    assert.deepEqual(toggleMessageReaction(initial, undefined, 'alice', '🔥'), {
      charlie: ['😂'], alice: ['🔥'],
    });
  });
});


describe('NEXORA message interaction experience', () => {
  it('keeps long-press actions open idempotently and exposes the supported reaction picker', async () => {
    const [bubble, inbox, rules] = await Promise.all([
      readFile(new URL('../src/components/MessageBubble.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../src/components/NewInboxView.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    ]);
    assert.match(bubble, /longPressTriggeredRef/);
    assert.match(bubble, /onTouchStart=/);
    assert.match(bubble, /onTouchEnd=/);
    assert.match(bubble, /onDoubleClick=\{\(event\) => \{ event\.preventDefault\(\); setShowReactionPicker\(true\); \}\}/);
    assert.match(bubble, /Choose a message reaction/);
    assert.match(bubble, /nexora-message-escape/);
    assert.match(inbox, /onToggleContextMenu=\{\(messageId\) => setActiveContextMessageId\(messageId\)\}/);
    assert.match(inbox, /onLongPress=\{\(messageId\) => setActiveContextMessageId\(messageId\)\}/);
    assert.doesNotMatch(inbox, /onLongPress=\{\(\) => \{\}\}/);
    const options = bubble.match(/const MESSAGE_REACTION_OPTIONS = \[(.*?)\] as const/s)?.[1] || '';
    const emojis = [...options.matchAll(/'([^']+)'/g)].map(match => match[1]);
    assert.ok(emojis.length >= 30);
    for (const emoji of emojis) assert.ok(rules.includes(emoji), `Firestore rules must allow ${emoji}`);
  });

  it('opens active chats edge-to-edge and unwinds the conversation before route navigation', async () => {
    const [inbox, css] = await Promise.all([
      readFile(new URL('../src/components/NewInboxView.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
    ]);
    assert.match(inbox, /data-chat-open=\{activeChatId \? 'true' : 'false'\}/);
    assert.match(inbox, /flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between/);
    assert.match(inbox, /aria-label=\{pinnedChats\.includes\(activeChat\.id\) \? 'Unpin conversation' : 'Pin conversation'\}/);
    assert.match(inbox, /window\.addEventListener\('nexora-escape', handleInboxEscape\)/);
    assert.match(inbox, /if \(activeChatId\) \{ setActiveChatId\(null\); event\.preventDefault\(\); \}/);
    assert.match(css, /\.nx-inbox-shell \{[\s\S]*?border: 0;[\s\S]*?border-radius: 0;/);
    assert.match(css, /\.nx-inbox-shell\[data-chat-open="true"\] \{[\s\S]*?position: fixed;[\s\S]*?height: 100dvh;/);
    assert.match(css, /body:has\(\.nx-inbox-shell\[data-chat-open="true"\]\) #nexora-unified-bottom-nav/);
  });
});
