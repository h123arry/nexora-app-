# VOH Intelligence Core — Phase 3: Self-hosted model runtime

## Phase 3.1 delivered in this change

VOH now has a private self-hosted provider adapter in addition to its existing Gemini adapter.

- The adapter speaks the OpenAI-compatible chat-completions protocol used by private inference servers such as vLLM and llama.cpp.
- It translates the provider-neutral VOH request, NEXORA read-only tool declarations, assistant tool calls and tool results.
- Requests carry a server-side bearer secret, a bounded timeout and a bounded output-token budget.
- HTTP errors and transport failures return generic, redacted errors. Response bodies and credentials are not logged.
- Provider selection is explicit. `VOH_AI_PROVIDER=self_hosted` never falls back to Gemini if the private runtime is missing or unavailable.
- Gemini remains the existing default until the self-hosted endpoint is deliberately configured.

## Runtime configuration

Set these only in the backend secret/environment manager. Do not commit real values or expose the key to the browser.

| Variable | Purpose |
| --- | --- |
| `VOH_AI_PROVIDER` | Set to `self_hosted` to select the private runtime |
| `VOH_SELF_HOSTED_BASE_URL` | Private inference base URL, normally ending in `/v1` |
| `VOH_SELF_HOSTED_API_KEY` | Backend-only bearer credential accepted by the inference server |
| `VOH_SELF_HOSTED_MODEL` | Model identifier served by the private runtime |
| `VOH_SELF_HOSTED_TIMEOUT_MS` | Optional request timeout, clamped to 5–120 seconds |
| `VOH_SELF_HOSTED_MAX_TOKENS` | Optional output budget, clamped to 128–8192 tokens |

Example configuration shape (use your own private values):

```env
VOH_AI_PROVIDER=self_hosted
VOH_SELF_HOSTED_BASE_URL=https://your-private-inference-host/v1
VOH_SELF_HOSTED_API_KEY=replace-with-a-secret
VOH_SELF_HOSTED_MODEL=your-served-model-id
VOH_SELF_HOSTED_TIMEOUT_MS=45000
VOH_SELF_HOSTED_MAX_TOKENS=1536
```

The inference endpoint must be private or protected by network restrictions and a strong credential. Use HTTPS unless the endpoint is reachable only over a trusted private network.

## What is not claimed yet

This adapter does not itself provide GPU capacity, download or train model weights, or make a model run on the current Render web service. The current NEXORA Render service is a small web application service, not a dedicated GPU inference host. No GPU provider, model weights, or paid compute have been selected or provisioned by this change.

## Remaining Phase 3 work

1. **3.2 — Model and hardware selection:** benchmark open-weight models against VOH's real NEXORA tasks; choose quantization, GPU memory and hosting only after cost and latency are known.
2. **3.3 — Private inference deployment:** deploy the selected model behind a private, authenticated inference endpoint; add readiness, liveness, warm-up and model-version reporting.
3. **3.4 — Production conversation runtime:** add token streaming, cancellation, request queueing, concurrency limits and graceful overload handling.
4. **3.5 — Tool reliability and safety:** validate model tool arguments against schemas, enforce per-tool authorization, add prompt-injection and refusal evaluations, and keep write actions disabled until explicit confirmation and audit controls exist.
5. **3.6 — Quality and migration:** run a repeatable NEXORA task benchmark, compare latency/cost/quality, then migrate specialised VOH features deliberately. Keep Gemini as an explicit optional provider, not a silent fallback.

A self-hosted model gives NEXORA control over weights, inference and data flow. It does not automatically outperform frontier hosted models; quality will depend on the selected model, hardware, quantization, retrieval, tools and evaluation loop.
