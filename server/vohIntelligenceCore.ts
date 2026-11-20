export interface VohModelRequest {
  model: string;
  contents: unknown[];
  systemInstruction: string;
  temperature: number;
  tools?: unknown[];
}

export interface VohModelResponse {
  text?: string;
  functionCalls?: Array<{ name?: string; args?: Record<string, unknown> }>;
  candidates?: Array<{ content?: unknown; finishReason?: string }>;
}

export interface VohModelProvider {
  readonly id: string;
  generate(request: VohModelRequest): Promise<VohModelResponse>;
}

export interface VohToolContext {
  currentUser: Record<string, unknown> | null;
  posts: Record<string, unknown>[];
  circles: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
}

export interface VohToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface VohTool {
  name: string;
  description: string;
  declaration: unknown;
  access: 'read' | 'write';
  execute(context: VohToolContext, args: Record<string, unknown>): VohToolResult | Promise<VohToolResult>;
}

export class VohToolRegistry {
  private readonly tools = new Map<string, VohTool>();

  register(tool: VohTool): void {
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(tool.name)) throw new Error('Invalid VOH tool name.');
    if (this.tools.has(tool.name)) throw new Error(`VOH tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  declarations(): unknown[] {
    return [...this.tools.values()].filter(tool => tool.access === 'read').map(tool => tool.declaration);
  }

  async execute(name: string, context: VohToolContext, args: Record<string, unknown> = {}): Promise<VohToolResult> {
    const tool = this.tools.get(name);
    if (!tool) return { ok: false, error: 'This VOH tool is not available.' };
    // Phase 1 intentionally allows read-only context tools only. Write tools
    // require a later, explicit user-confirmation and audit implementation.
    if (tool.access !== 'read') return { ok: false, error: 'This action needs a separate user confirmation and is not available yet.' };
    try {
      return await tool.execute(context, args);
    } catch {
      return { ok: false, error: 'VOH could not read that information right now.' };
    }
  }
}

export interface VohIntelligenceInput {
  provider: VohModelProvider;
  model: string;
  contents: unknown[];
  systemInstruction: string;
  context: VohToolContext;
  tools: VohToolRegistry;
  temperature?: number;
  maxToolRounds?: number;
}

export interface VohIntelligenceResult {
  text: string;
  provider: string;
  model: string;
  toolCalls: number;
}

export async function runVohIntelligence(input: VohIntelligenceInput): Promise<VohIntelligenceResult> {
  const maxToolRounds = Math.max(0, Math.min(3, input.maxToolRounds ?? 3));
  const contents = [...input.contents];
  const config = {
    systemInstruction: input.systemInstruction,
    temperature: input.temperature ?? 0.55,
    tools: input.tools.declarations().length
      ? [{ functionDeclarations: input.tools.declarations() }]
      : undefined,
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  };

  let response = await input.provider.generate({ model: input.model, contents, ...config });
  let toolCalls = 0;
  for (let round = 0; round < maxToolRounds; round += 1) {
    const calls = response.functionCalls || [];
    if (!calls.length) break;
    if (response.candidates?.[0]?.content) contents.push(response.candidates[0].content);
    const results = await Promise.all(calls.map(async call => ({
      functionResponse: {
        name: call.name || 'unknown',
        response: { result: await input.tools.execute(call.name || '', input.context, call.args || {}) },
      },
    })));
    toolCalls += calls.length;
    contents.push({ role: 'user', parts: results });
    response = await input.provider.generate({ model: input.model, contents, ...config });
  }

  const text = typeof response.text === 'string' ? response.text.trim() : '';
  if (!text) {
    const finishReason = response.candidates?.[0]?.finishReason || 'unknown';
    throw new VohEmptyModelResponseError(finishReason);
  }
  return { text, provider: input.provider.id, model: input.model, toolCalls };
}

export class VohEmptyModelResponseError extends Error {
  constructor(readonly finishReason: string) {
    super('VOH model returned no usable text.');
    this.name = 'VohEmptyModelResponseError';
  }
}

/** Adapter boundary: the intelligence core does not depend on a vendor SDK. */
export function createGeminiVohProvider(client: {
  models: { generateContent(input: Record<string, unknown>): Promise<VohModelResponse> };
}): VohModelProvider {
  return {
    id: 'gemini',
    generate: request => client.models.generateContent({
      model: request.model,
      contents: request.contents,
      config: {
        systemInstruction: request.systemInstruction,
        temperature: request.temperature,
        tools: request.tools,
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      },
    }),
  };
}

export type VohContextScope = 'feed' | 'profile' | 'none';

/** Unknown or omitted scope fails closed to no account context. */
export function resolveVohContextScope(value: unknown): VohContextScope {
  return value === 'feed' || value === 'profile' ? value : 'none';
}


export interface SelfHostedVohProviderConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxTokens?: number;
}

type OpenAiMessage = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeOpenAiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeOpenAiSchema);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    key === 'type' && typeof item === 'string' ? item.toLowerCase() : normalizeOpenAiSchema(item),
  ]));
}

function openAiTools(value: unknown[] | undefined): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(value)) return undefined;
  const declarations = value.flatMap(item => isRecord(item) && Array.isArray(item.functionDeclarations) ? item.functionDeclarations : []);
  const tools = declarations.flatMap(declaration => {
    if (!isRecord(declaration) || typeof declaration.name !== 'string') return [];
    return [{
      type: 'function',
      function: {
        name: declaration.name,
        description: typeof declaration.description === 'string' ? declaration.description : '',
        parameters: normalizeOpenAiSchema(declaration.parameters || { type: 'object', properties: {} }),
      },
    }];
  });
  return tools.length ? tools : undefined;
}

function openAiMessages(contents: unknown[], systemInstruction: string): OpenAiMessage[] {
  const messages: OpenAiMessage[] = [{ role: 'system', content: systemInstruction }];
  const pendingToolIds = new Map<string, string[]>();
  for (const item of contents) {
    if (!isRecord(item)) continue;
    const role = item.role === 'model' ? 'assistant' : item.role === 'assistant' ? 'assistant' : 'user';
    if (role === 'assistant' && Array.isArray(item.tool_calls)) {
      const calls = item.tool_calls.filter(isRecord);
      for (const call of calls) {
        const fn = isRecord(call.function) ? call.function : {};
        if (typeof fn.name !== 'string' || typeof call.id !== 'string') continue;
        const queue = pendingToolIds.get(fn.name) || [];
        queue.push(call.id);
        pendingToolIds.set(fn.name, queue);
      }
      messages.push({ role: 'assistant', tool_calls: calls });
      continue;
    }
    const parts = Array.isArray(item.parts) ? item.parts : [];
    const functionResponses = parts.flatMap(part => isRecord(part) && isRecord(part.functionResponse) ? [part.functionResponse] : []);
    if (functionResponses.length) {
      for (const response of functionResponses) {
        const name = typeof response.name === 'string' ? response.name : 'unknown';
        const queue = pendingToolIds.get(name) || [];
        const toolCallId = queue.shift();
        if (queue.length) pendingToolIds.set(name, queue);
        else pendingToolIds.delete(name);
        const payload = JSON.stringify(response.response ?? {});
        if (toolCallId) messages.push({ role: 'tool', tool_call_id: toolCallId, name, content: payload });
        else messages.push({ role: 'user', content: 'Tool result (' + name + '): ' + payload });
      }
      continue;
    }
    const textParts = parts.flatMap(part => isRecord(part) && typeof part.text === 'string' ? [part.text] : []);
    const content = typeof item.content === 'string' ? item.content : textParts.join('\n');
    if (content.trim()) messages.push({ role, content });
  }
  return messages;
}

/**
 * Adapter for a privately hosted OpenAI-compatible inference server (for
 * example vLLM or llama.cpp). No third-party model provider is contacted.
 */
export function createSelfHostedVohProvider(
  config: SelfHostedVohProviderConfig,
  fetchImpl: typeof fetch = fetch,
): VohModelProvider {
  let endpoint: string;
  try {
    const base = new URL(config.baseUrl);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
      throw new Error('invalid');
    }
    const path = base.pathname.replace(/\/+$/, '');
    base.pathname = path.endsWith('/chat/completions')
      ? path
      : path.endsWith('/v1') ? path + '/chat/completions' : path + '/v1/chat/completions';
    endpoint = base.toString();
  } catch {
    throw new Error('VOH self-hosted inference URL is invalid.');
  }
  if (typeof config.apiKey !== 'string' || !config.apiKey.trim()) {
    throw new Error('VOH self-hosted inference authentication is not configured.');
  }
  const apiKey = config.apiKey.trim();
  const timeoutMs = Number.isFinite(config.timeoutMs) ? Math.max(5_000, Math.min(120_000, Math.floor(config.timeoutMs!))) : 45_000;
  const maxTokens = Number.isFinite(config.maxTokens) ? Math.max(128, Math.min(8_192, Math.floor(config.maxTokens!))) : 1_536;

  return {
    id: 'self_hosted',
    async generate(request) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: request.model,
            messages: openAiMessages(request.contents, request.systemInstruction),
            temperature: request.temperature,
            max_tokens: maxTokens,
            ...(openAiTools(request.tools) ? { tools: openAiTools(request.tools), tool_choice: 'auto' } : {}),
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw new Error('VOH self-hosted inference service is unavailable or timed out.');
      }
      if (!response.ok) {
        const error = new Error('VOH self-hosted inference returned HTTP ' + response.status + '.') as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      let payload: Record<string, unknown>;
      try {
        const rawPayload = await response.text();
        if (rawPayload.length > 2_000_000) throw new Error('response too large');
        payload = JSON.parse(rawPayload) as Record<string, unknown>;
      } catch {
        throw new Error('VOH self-hosted inference returned an invalid response.');
      }
      const choices = Array.isArray(payload.choices) ? payload.choices : [];
      const choice = isRecord(choices[0]) ? choices[0] : {};
      const message = isRecord(choice.message) ? choice.message : {};
      const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      const calls = rawCalls.flatMap(call => {
        if (!isRecord(call) || !isRecord(call.function) || typeof call.function.name !== 'string') return [];
        let args: Record<string, unknown> = {};
        try {
          const parsed = JSON.parse(typeof call.function.arguments === 'string' ? call.function.arguments : '{}');
          if (isRecord(parsed)) args = parsed;
        } catch { /* Invalid tool arguments fail closed to an empty object. */ }
        return [{ id: typeof call.id === 'string' ? call.id : 'call_' + call.function.name, type: 'function', function: call.function, name: call.function.name, args }];
      });
      const textContent = typeof message.content === 'string'
        ? message.content
        : Array.isArray(message.content)
          ? message.content.flatMap(part => isRecord(part) && typeof part.text === 'string' ? [part.text] : []).join('\n')
          : '';
      const functionCalls = calls.map(call => ({ name: call.name, args: call.args }));
      const assistantContent = calls.length
        ? { role: 'assistant', tool_calls: calls.map(call => ({ id: call.id, type: call.type, function: call.function })) }
        : undefined;
      return {
        text: textContent,
        functionCalls,
        candidates: [{ content: assistantContent, finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : 'unknown' }],
      };
    },
  };
}
