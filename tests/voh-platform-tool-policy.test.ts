import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveVohFeatureScopes, selectVohToolsForScopes } from '../server/vohToolScopes';
import { VOH_CONTEXT_TOOL_DECLARATIONS } from '../server/vohTools';

describe('VOH feature-scoped tool access', () => {
  it('supports legacy single-scope clients', () => {
    assert.deepEqual([...resolveVohFeatureScopes(undefined, 'feed')], ['feed']);
    assert.deepEqual([...resolveVohFeatureScopes(undefined, 'profile')], ['profile']);
  });
  it('accepts multiple explicit scopes and ignores unknown values', () => {
    assert.deepEqual([...resolveVohFeatureScopes(['feed', 'world_pulse', 'inbox', 'admin'], 'none')], ['feed', 'world_pulse']);
  });
  it('fails closed when scope is missing or invalid', () => {
    assert.equal(resolveVohFeatureScopes(undefined, 'unknown').size, 0);
    assert.equal(resolveVohFeatureScopes('feed', 'none').size, 0);
  });
  it('exposes only tools backed by an explicitly selected feature', () => {
    const feed = selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['feed']));
    assert.deepEqual(feed.map(tool => tool.name), ['get_visible_feed']);
    const combined = selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['profile', 'world_pulse', 'circles']));
    assert.deepEqual(combined.map(tool => tool.name), ['get_my_profile_summary', 'get_my_communities', 'get_world_pulse_snapshot']);
  });
  it('never exposes community, notification, inbox or write tools without an explicit integration', () => {
    const names = selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['feed', 'profile', 'world_pulse', 'circles'])).map(tool => tool.name);
    assert.equal(names.some(name => /inbox|message|send|publish|delete|community|notification/i.test(name)), false);
  });
});
