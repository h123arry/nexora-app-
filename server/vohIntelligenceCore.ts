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
  pulse?: Record<string, unknown> | null;
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
