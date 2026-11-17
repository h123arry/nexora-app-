import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HttpsError } from 'firebase-functions/v2/https';
import { validateFoundingMemberInput } from '../src/foundingMembers.js';

describe('founding member account input policy', () => {
  it('normalizes email and username before provisioning', () => {
    assert.deepEqual(validateFoundingMemberInput({
      email: '  MEMBER@Example.com ',
      fullName: '  Founding Member ',
      username: '  Founding.Member ',
    }), {
      email: 'member@example.com',
      fullName: 'Founding Member',
      username: 'founding.member',
    });
  });

  it('rejects malformed email, short names, and invalid usernames', () => {
    for (const input of [
      { email: 'not-an-email', fullName: 'Member Name', username: 'member_1' },
      { email: 'member@example.com', fullName: 'A', username: 'member_1' },
      { email: 'member@example.com', fullName: 'Member Name', username: 'bad handle' },
    ]) {
      assert.throws(() => validateFoundingMemberInput(input), error =>
        error instanceof HttpsError && error.code === 'invalid-argument');
    }
  });

  it('blocks reserved and impersonation-style usernames', () => {
    for (const username of ['admin', 'nexora', 'official_harrison', 'support_team', 'moderator']) {
      assert.throws(() => validateFoundingMemberInput({
        email: 'member@example.com', fullName: 'Member Name', username,
      }), error => error instanceof HttpsError && error.code === 'invalid-argument');
    }
  });

  it('rejects incomplete or oversized input', () => {
    assert.throws(() => validateFoundingMemberInput(null), HttpsError);
    assert.throws(() => validateFoundingMemberInput({
      email: 'a'.repeat(250) + '@example.com', fullName: 'Member Name', username: 'member_1',
    }), HttpsError);
  });
});
