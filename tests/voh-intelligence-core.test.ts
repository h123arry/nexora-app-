import test from 'node:test';
import assert from 'node:assert/strict';
import { runVohIntelligence, VohToolRegistry, VohEmptyModelResponseError, createGeminiVohProvider, resolveVohContextScope } from '../server/vohIntelligenceCore';

const context = { currentUser: { name: 'Test' }, posts: [], circles: [], notifications: [] };

test('VOH tool registry exposes only registered read tools and blocks writes', async () => {
  const registry = new VohToolRegistry();
  registry.register({ name: 'read_profile', description: 'Read profile', declaration: { name: 'read_profile' }, access: 'read', execute: ctx => ({ ok: true, data: ctx.currentUser }) });
  registry.register({ name: 'update_profile', description: 'Update profile', declaration: { name: 'update_profile' }, access: 'write', execute: () => ({ ok: true }) });
  assert.equal((await registry.execute('read_profile', context)).ok, true);
  assert.equal((await registry.execute('update_profile', context)).ok, false);
  assert.equal((await registry.execute('unknown_tool', context)).ok, false);
  assert.deepEqual(registry.declarations(), [{ name: 'read_profile' }]);
});

test('VOH intelligence runs provider calls and bounded read-only tool rounds', async () => {
  const registry = new VohToolRegistry();
  registry.register({ name: 'read_profile', description: 'Read profile', declaration: { name: 'read_profile' }, access: 'read', execute: ctx => ({ ok: true, data: ctx.currentUser }) });
  let calls = 0;
  const result = await runVohIntelligence({
    provider: { id: 'test-provider', generate: async () => {
      calls += 1;
      return calls === 1
        ? { functionCalls: [{ name: 'read_profile' }] , candidates: [{ content: { role: 'model', parts: [] } }] }
        : { text: 'Hello from VOH.' };
    } },
    model: 'test-model', contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
    systemInstruction: 'Be helpful.', context, tools: registry,
  });
  assert.equal(result.text, 'Hello from VOH.');
  assert.equal(result.provider, 'test-provider');
  assert.equal(result.toolCalls, 1);
  assert.equal(calls, 2);
});

test('VOH intelligence rejects empty model responses instead of fabricating replies', async () => {
  await assert.rejects(() => runVohIntelligence({
    provider: { id: 'test', generate: async () => ({ text: '  ', candidates: [{ finishReason: 'STOP' }] }) },
    model: 'test', contents: [], systemInstruction: '', context,
    tools: new VohToolRegistry(),
  }), error => error instanceof VohEmptyModelResponseError && error.finishReason === 'STOP');
});

test('Gemini adapter translates the provider-neutral request contract', async () => {
  let received: Record<string, unknown> | undefined;
  const provider = createGeminiVohProvider({ models: { generateContent: async input => { received = input; return { text: 'ok' }; } } });
  const response = await provider.generate({ model: 'gemini-test', contents: [], systemInstruction: 'rules', temperature: 0.2 });
  assert.equal(response.text, 'ok');
  assert.equal(received?.model, 'gemini-test');
  assert.equal((received?.config as { systemInstruction: string }).systemInstruction, 'rules');
});

test('VOH context scope defaults to none and accepts only explicit feed/profile scopes', () => {
  assert.equal(resolveVohContextScope(undefined), 'none');
  assert.equal(resolveVohContextScope('inbox'), 'none');
  assert.equal(resolveVohContextScope('everything'), 'none');
  assert.equal(resolveVohContextScope('feed'), 'feed');
  assert.equal(resolveVohContextScope('profile'), 'profile');
});
