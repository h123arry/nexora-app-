import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPostShareCardCopy } from '../src/services/shareCardService.js';

describe('NEXORA share-card copy', () => {
  it('normalizes author handles and safely bounds long content', () => {
    const result = buildPostShareCardCopy({
      name: '  Creator\n Name ',
      username: '@nexora_creator',
      content: 'A useful post '.repeat(40),
    });
    assert.equal(result.author, 'Creator Name');
    assert.equal(result.handle, '@nexora_creator');
    assert.equal(result.excerpt.length, 240);
  });

  it('provides honest fallback copy for incomplete posts', () => {
    assert.deepEqual(buildPostShareCardCopy({}), {
      author: 'A NEXORA creator',
      handle: '',
      excerpt: 'Discover conversations, creators and communities on NEXORA.',
    });
  });

  it('strips control characters from untrusted post text', () => {
    const result = buildPostShareCardCopy({ name: 'A\u0000B', content: 'Hello\n\tworld' });
    assert.equal(result.author, 'AB');
    assert.equal(result.excerpt, 'Hello world');
  });
});
