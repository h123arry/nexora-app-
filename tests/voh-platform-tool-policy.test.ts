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
    const combined = selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['profile', 'world_pulse']));
    assert.deepEqual(combined.map(tool => tool.name), ['get_my_profile_summary', 'get_world_pulse_snapshot']);
  });
  it('exposes Circle and notification tools only when their own scopes are selected', () => {
    assert.deepEqual(selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['circles'])).map(tool => tool.name), ['get_my_communities']);
    assert.deepEqual(selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['notifications'])).map(tool => tool.name), ['get_recent_notifications']);
  });
  it('exposes draft and Studio tools only under their explicit scopes', () => {
    assert.deepEqual(selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['drafts'])).map(tool => tool.name), ['get_my_drafts']);
    assert.deepEqual(selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['studio'])).map(tool => tool.name), ['get_my_studio_project']);
  });
  it('never exposes inbox or write tools without an explicit integration', () => {
    const names = selectVohToolsForScopes(VOH_CONTEXT_TOOL_DECLARATIONS, new Set(['feed', 'profile', 'world_pulse'])).map(tool => tool.name);
    assert.equal(names.some(name => /inbox|message|send|publish|delete|community|notification/i.test(name)), false);
  });
});
