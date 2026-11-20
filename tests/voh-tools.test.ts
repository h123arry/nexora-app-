import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runVohContextTool, VOH_CONTEXT_TOOL_DECLARATIONS } from '../server/vohTools';

const context = {
  currentUser: { username: 'harrison' },
  posts: [{ id: 'p1', content: 'Visible post' }],
  circles: [{ name: 'Builders' }],
  notifications: [{ content: 'New follower' }],
  drafts: [{ id: 'd1', caption: 'Draft idea', type: 'text' }],
  studio: { clipCount: 2 },
  pulse: { postCount: 12, creatorCount: 4 },
};

describe('VOH read-only context tools', () => {
  it('declares only the seven intended read-only tools', () => {
    assert.deepEqual(VOH_CONTEXT_TOOL_DECLARATIONS.map(tool => tool.name), [
      'get_my_profile_summary', 'get_visible_feed', 'get_my_communities', 'get_recent_notifications', 'get_my_drafts', 'get_my_studio_project', 'get_world_pulse_snapshot',
    ]);
  });
  it('returns only the requested authorized context slice', () => {
    assert.deepEqual(runVohContextTool('get_my_profile_summary', context), { ok: true, data: context.currentUser });
    assert.deepEqual(runVohContextTool('get_visible_feed', context), { ok: true, data: context.posts });
    assert.deepEqual(runVohContextTool('get_my_communities', context), { ok: true, data: context.circles });
    assert.deepEqual(runVohContextTool('get_recent_notifications', context), { ok: true, data: context.notifications });
    assert.deepEqual(runVohContextTool('get_my_drafts', context), { ok: true, data: context.drafts });
    assert.deepEqual(runVohContextTool('get_my_studio_project', context), { ok: true, data: context.studio });
    assert.deepEqual(runVohContextTool('get_world_pulse_snapshot', context), { ok: true, data: context.pulse });
  });
  it('rejects unknown tool names', () => {
    assert.deepEqual(runVohContextTool('delete_account', context), { ok: false, error: 'This VOH tool is not available.' });
  });
});
