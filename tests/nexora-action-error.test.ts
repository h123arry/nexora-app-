import assert from 'node:assert/strict';
import test from 'node:test';
import { getNexoraActionErrorMessage } from '../src/utils/nexoraActionError';

test('maps callable internal failures to the action-specific fallback', () => {
  assert.equal(
    getNexoraActionErrorMessage({ code: 'functions/internal', message: 'INTERNAL' }, 'Your comment could not be sent. Retry.'),
    'Your comment could not be sent. Retry.',
  );
  assert.equal(
    getNexoraActionErrorMessage(new Error('Internal(0)'), 'Your quote could not be posted. Retry.'),
    'Your quote could not be posted. Retry.',
  );
});

test('gives actionable guidance for authentication, permissions and network failures', () => {
  assert.match(getNexoraActionErrorMessage({ code: 'functions/unauthenticated' }, 'Try again.'), /Sign in again/);
  assert.match(getNexoraActionErrorMessage({ code: 'functions/permission-denied' }, 'Try again.'), /permission/);
  assert.match(getNexoraActionErrorMessage({ code: 'functions/unavailable' }, 'Try again.'), /connection/);
  assert.match(getNexoraActionErrorMessage({ code: 'functions/resource-exhausted' }, 'Try again.'), /Wait a moment/);
});

test('preserves specific server validation messages and uses fallback for unknown errors', () => {
  assert.equal(getNexoraActionErrorMessage(new Error('Comments are disabled for this post.'), 'Try again.'), 'Comments are disabled for this post.');
  assert.equal(getNexoraActionErrorMessage({}, 'Your action failed. Retry.'), 'Your action failed. Retry.');
});
