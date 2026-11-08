import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runVohContextTool, VOH_CONTEXT_TOOL_DECLARATIONS } from '../server/vohTools';

const context = {
  currentUser: { username: 'harrison' },
  posts: [{ id: 'p1', content: 'Visible post' }],
  circles: [{ name: 'Builders' }],
  notifications: [{ content: 'New follower' }],
};

describe('VOH read-only context tools', () => {
  it('declares only the four intended read-only tools', () => {
    assert.deepEqual(VOH_CONTEXT_TOOL_DECLARATIONS.map(tool => tool.name), [
      'get_my_profile_summary', 'get_visible_feed', 'get_my_communities', 'get_recent_notifications',
    ]);
  });
  it('returns only the requested authorized context slice', () => {
    assert.deepEqual(runVohContextTool('get_my_profile_summary', context), { ok: true, data: context.currentUser });
    assert.deepEqual(runVohContextTool('get_visible_feed', context), { ok: true, data: context.posts });
    assert.deepEqual(runVohContextTool('get_my_communities', context), { ok: true, data: context.circles });
    assert.deepEqual(runVohContextTool('get_recent_notifications', context), { ok: true, data: context.notifications });
  });
  it('rejects unknown tool names', () => {
    assert.deepEqual(runVohContextTool('delete_account', context), { ok: false, error: 'This VOH tool is not available.' });
  });
});
