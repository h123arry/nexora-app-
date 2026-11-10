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

  it('accepts voice-note metadata only while image/video message payloads remain unavailable', () => {
    assert.equal(isSupportedOutgoingMediaType('voice'), true);
    assert.equal(isSupportedOutgoingMediaType('image'), false);
    assert.equal(isSupportedOutgoingMediaType('video'), false);
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
    const initial = { bob: ['😂'] };
    const legacy = [{ emoji: '❤️', userIds: ['alice', 'bob'] }];
    assert.deepEqual(toggleMessageReaction(initial, legacy, 'alice', '❤️'), {
      bob: ['😂'], alice: [],
    });
    assert.deepEqual(aggregateMessageReactions(
      toggleMessageReaction(initial, legacy, 'alice', '❤️'),
      legacy,
    ), [
      { emoji: '❤️', userIds: ['bob'] },
      { emoji: '😂', userIds: ['bob'] },
    ]);
    assert.deepEqual(toggleMessageReaction(initial, undefined, 'alice', '🔥'), {
      bob: ['😂'], alice: ['🔥'],
    });
  });
});
