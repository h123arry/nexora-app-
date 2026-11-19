import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getRenderableAvatarUrl } from '../src/utils/avatarUrl';

test('renders only HTTPS or validated NEXORA media avatar URLs', () => {
  assert.equal(getRenderableAvatarUrl('/api/media/avatar_123'), '/api/media/avatar_123');
  assert.equal(getRenderableAvatarUrl('https://images.example.com/avatar.png'), 'https://images.example.com/avatar.png');
});

test('rejects generated, stock-person, and executable avatar URLs', () => {
  assert.equal(getRenderableAvatarUrl(''), null);
  assert.equal(getRenderableAvatarUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'), null);
  assert.equal(getRenderableAvatarUrl('data:image/svg+xml,<svg></svg>'), null);
  assert.equal(getRenderableAvatarUrl('javascript:alert(1)'), null);
  assert.equal(getRenderableAvatarUrl('http://images.example.com/avatar.png'), null);
  assert.equal(getRenderableAvatarUrl('//images.example.com/avatar.png'), null);
  assert.equal(getRenderableAvatarUrl('/api/media/not-valid/extra'), null);
});
