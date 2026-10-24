import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { omitUndefinedFields } from '../src/utils/messageSerialization';

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
});
