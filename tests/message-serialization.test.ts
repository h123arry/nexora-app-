import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
