import test from 'node:test';
import assert from 'node:assert/strict';
import { runVohIntelligence, VohToolRegistry, VohEmptyModelResponseError, createGeminiVohProvider, createSelfHostedVohProvider, resolveVohContextScope } from '../server/vohIntelligenceCore';

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


test('self-hosted provider maps the neutral request to a private OpenAI-compatible runtime', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const provider = createSelfHostedVohProvider({
    baseUrl: 'https://voh.internal/v1',
    apiKey: 'test-secret',
    timeoutMs: 12_000,
    maxTokens: 900,
  }, async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            id: 'call_profile_1',
            type: 'function',
            function: { name: 'read_profile', arguments: '{"detail":"summary"}' },
          }],
        },
        finish_reason: 'tool_calls',
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });

  const response = await provider.generate({
    model: 'voh-private-model',
    contents: [{ role: 'user', parts: [{ text: 'Summarize my profile.' }] }],
    systemInstruction: 'Follow the NEXORA safety rules.',
    temperature: 0.25,
    tools: [{
      functionDeclarations: [{
        name: 'read_profile',
        description: 'Read the signed-in profile.',
        parameters: { type: 'OBJECT', properties: { limit: { type: 'NUMBER' } } },
      }],
    }],
  });

  assert.equal(provider.id, 'self_hosted');
  assert.equal(capturedUrl, 'https://voh.internal/v1/chat/completions');
  assert.equal(new Headers(capturedInit?.headers).get('authorization'), 'Bearer test-secret');
  const body = JSON.parse(String(capturedInit?.body));
  assert.equal(body.model, 'voh-private-model');
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[0].content, 'Follow the NEXORA safety rules.');
  assert.equal(body.messages[1].content, 'Summarize my profile.');
  assert.equal(body.tools[0].function.parameters.type, 'object');
  assert.equal(body.tools[0].function.parameters.properties.limit.type, 'number');
  assert.deepEqual(response.functionCalls, [{ name: 'read_profile', args: { detail: 'summary' } }]);
  assert.equal((response.candidates?.[0]?.content as any).tool_calls[0].id, 'call_profile_1');
});

test('self-hosted provider preserves tool-call/result pairing across orchestration rounds', async () => {
  const requests: Array<Record<string, any>> = [];
  let call = 0;
  const provider = createSelfHostedVohProvider({ baseUrl: 'http://127.0.0.1:8000/v1', apiKey: 'local-test' }, async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)));
    call += 1;
    const payload = call === 1
      ? { choices: [{ message: { tool_calls: [{ id: 'call_abc', type: 'function', function: { name: 'read_profile', arguments: '{}' } }] }, finish_reason: 'tool_calls' }] }
      : { choices: [{ message: { content: 'Your profile is ready.' }, finish_reason: 'stop' }] };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const registry = new VohToolRegistry();
  registry.register({
    name: 'read_profile', description: 'Read profile', declaration: { name: 'read_profile' },
    access: 'read', execute: ctx => ({ ok: true, data: ctx.currentUser }),
  });

  const result = await runVohIntelligence({
    provider, model: 'private-model', contents: [{ role: 'user', parts: [{ text: 'Read my profile.' }] }],
    systemInstruction: 'Stay safe.', context, tools: registry,
  });
  assert.equal(result.text, 'Your profile is ready.');
  assert.equal(result.provider, 'self_hosted');
  assert.equal(requests.length, 2);
  assert.equal(requests[1].messages.some((message: any) => message.role === 'assistant' && message.tool_calls?.[0]?.id === 'call_abc'), true);
  assert.equal(requests[1].messages.some((message: any) => message.role === 'tool' && message.tool_call_id === 'call_abc' && message.name === 'read_profile'), true);
});

test('self-hosted provider fails closed on invalid configuration and HTTP errors', async () => {
  assert.throws(() => createSelfHostedVohProvider({ baseUrl: 'file:///etc/passwd', apiKey: 'secret' }), /URL is invalid/);
  assert.throws(() => createSelfHostedVohProvider({ baseUrl: 'https://voh.internal/v1', apiKey: '' }), /authentication is not configured/);
  const provider = createSelfHostedVohProvider({ baseUrl: 'https://voh.internal/v1', apiKey: 'do-not-leak' }, async () => new Response('do-not-leak', { status: 401 }));
  await assert.rejects(provider.generate({ model: 'private-model', contents: [], systemInstruction: '', temperature: 0.5 }), error => {
    assert.match(String(error), /HTTP 401/);
    assert.equal(String(error).includes('do-not-leak'), false);
    return true;
  });
});
