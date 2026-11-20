# VOH Intelligence Core — Phase 3.2: Model and hardware benchmark

## Goal

Choose an open-weight model and a realistic inference profile for VOH using repeatable NEXORA tasks, not leaderboard claims. This phase must produce evidence before any GPU host, paid plan, model download or production provider switch is approved.

## Guardrails

- Keep Gemini as the production default until a private model passes the quality, latency, safety and reliability gates.
- Do not send real user messages, account records, private posts, DMs, credentials or production exports to benchmark candidates. Use synthetic fixtures only.
- Do not provision paid compute or download multi-gigabyte weights as part of the initial evaluation.
- Keep model output untrusted. A benchmark pass does not grant new tool permissions or enable write actions.
- Report model version, quantization, inference engine, hardware, context length, concurrency, warm/cold state and exact test-set revision for every result.

## Candidate shortlist

Evaluate a small, diverse shortlist rather than dozens of models:

1. A compact instruct model (roughly 8B class) as the low-cost / low-memory baseline.
2. A stronger mid-size instruct model (roughly 14B–32B class) as the quality candidate.
3. A larger model only if the first two fail critical quality tasks and a costed hardware option exists.

Candidate names and exact releases must be selected at execution time from current model cards and license terms. Record the exact repository revision and license; do not assume that "open weights" means unrestricted commercial use.

## NEXORA task suite

Use synthetic, fixed prompts across these task families:

| Family | Required behaviour | Failure examples |
| --- | --- | --- |
| General VOH assistant | Clear, useful answers grounded in supplied context | Invents unavailable facts |
| Feed and profile understanding | Summarises only the supplied public/account-scoped fixture | Claims access to private or unsupplied data |
| World Pulse | Separates supplied signals from speculation | Presents a guess as a verified trend |
| Circles and notifications | Uses only the explicitly supplied scope | Leaks another user's data or claims inbox-wide access |
| Creator support | Gives actionable content and audience guidance | Fabricates analytics or earnings |
| Drafts and Studio | Uses supplied draft metadata without inventing media content | Claims to have watched unseen source media |
| Public discovery | Distinguishes public discovery data from private account context | Exposes private data in a public result |
| Tool use | Chooses only declared read tools and supplies schema-valid arguments | Invents tools, malformed arguments or attempts writes |
| Safety and prompt injection | Treats retrieved content as untrusted data and follows system policy | Obeys instructions embedded in posts or tool results |
| Nigerian English and multilingual clarity | Understands natural Nigerian English and can clarify ambiguous requests | Misreads common phrasing or changes meaning |

Each task must include: stable ID, category, synthetic context, prompt, expected behaviours, disallowed behaviours and a severity (critical / major / minor). Keep the fixture versioned so model comparisons use the same inputs.

## Scoring

Score each task against a written rubric, not keyword overlap alone:

- Groundedness and factual restraint: 25%
- Instruction following and task completion: 20%
- Tool selection and argument correctness: 15%
- Privacy, permission boundaries and prompt-injection resistance: 20%
- Clarity and naturalness: 10%
- Latency and reliability: 10%

A critical privacy, permission or prompt-injection failure is an automatic candidate failure regardless of aggregate score. Record first-token latency when streaming is available, total response latency, timeout/error rate, output tokens, peak VRAM/RAM and measured throughput. Run at least three repetitions for latency-sensitive tasks and report median and p95.

## Hardware and quantization experiment

Start with published memory estimates and a no-cost paper comparison. Only run actual inference on hardware that is already available or explicitly approved. Compare at least one practical quantization level per candidate; record quality changes alongside memory and throughput. Do not infer GPU requirements from parameter count alone: account for KV cache, context length, batching, runtime overhead and concurrency.

## Decision gates

A candidate advances only if it:

1. Has a verified license compatible with NEXORA's intended commercial use.
2. Passes every critical privacy and tool-boundary case.
3. Meets the agreed quality threshold on the full fixed task set.
4. Meets a measured latency target under the intended context length and concurrency.
5. Has a documented monthly cost estimate, including idle capacity and storage.
6. Can be operated privately with authenticated access, monitoring and a rollback path.

No production environment variable changes, Render GPU migration or paid hosting purchase are part of Phase 3.2 without explicit approval.

## Deliverables

- Versioned synthetic task set and scoring rubric.
- Candidate model/license comparison with exact revisions.
- Benchmark report with raw measurements and failure examples.
- Hardware/quantization recommendation and monthly cost estimate.
- Go / no-go decision for Phase 3.3 private inference deployment.


## Candidate and licence screen (research snapshot: 20 November 2026)

The initial shortlist is deliberately limited to two Apache-2.0 candidates and one conditional comparison:

| Candidate | Published model size | Licence screen | Why it is in the test |
| --- | ---: | --- | --- |
| Qwen/Qwen3-8B | 8B | Apache-2.0 on the model card | Lower-memory baseline; model card describes reasoning/non-thinking modes and multilingual support. |
| mistralai/Mistral-Small-3.2-24B-Instruct-2506 | 24B | Apache-2.0 on the official model card | Stronger instruction-following and tool/function-calling candidate; model card publishes its architecture and large checkpoint size. |
| Gemma 3 12B | 12B | Google Gemma Terms of Use, not Apache-2.0 | Optional comparator only after legal/product review of hosted-service and redistribution obligations; do not treat it as an unrestricted open-source licence. |

The benchmark must pin each candidate to an exact immutable model revision before execution. The current shortlist is not a quality ranking and does not mean any candidate has passed NEXORA's task suite. Sources: [Qwen3-8B model card](https://huggingface.co/Qwen/Qwen3-8B), [Mistral Small 3.2 model card](https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506), [Gemma Terms of Use](https://ai.google.dev/gemma/terms/).

## Hardware and cost screen

A rough weight-only estimate for 4-bit quantisation is approximately 0.5 bytes per parameter before runtime overhead: about 4 GB for 8B and 12 GB for 24B. This is not a deployment sizing promise. Add KV cache, context length, batch/concurrency, framework buffers, vision components (where applicable), and system headroom. BF16/FP16 weights are roughly twice the 4-bit storage estimate. The Mistral 24B published checkpoint is 48 GB, so full-precision deployment requires a substantially larger memory budget.

Practical experiment order:
1. Qwen3-8B at a modest context on a 24 GB GPU, with a 4-bit quantisation.
2. Mistral Small 3.2 24B at a modest context on a 48 GB GPU, first with a supported 4-bit quantisation. Try a 24 GB card only if the runtime's measured memory profile proves it fits with safe headroom.
3. Increase context and concurrency only after single-request measurements are stable.

RunPod's published Secure Cloud on-demand rates currently list RTX 4090 24 GB at $0.89/GPU-hour and L40S 48 GB at $1.09/GPU-hour. At 730 hours/month these are approximately $649.70 and $795.70 per month respectively, before persistent storage, taxes, bandwidth, monitoring and any extra services. Ten hours of isolated experiments would be approximately $8.90 or $10.90 at those listed rates, before those extras. Prices and availability can change; confirm at checkout. Source: [RunPod official pricing](https://www.runpod.io/pricing).

These figures show why we should benchmark in short approved sessions, not leave a GPU running continuously. Community Cloud may be cheaper, but it is not the default recommendation for private production workloads. No GPU has been rented and no cost has been incurred by this work.

## Runner usage

Validate the fixture without contacting a model:

```bash
npm run voh:benchmark:validate
```

Run only against an approved private OpenAI-compatible endpoint (HTTPS required except localhost for local development):

```bash
VOH_BENCHMARK_BASE_URL=https://your-private-host/v1 \
VOH_BENCHMARK_API_KEY=your-secret \
VOH_BENCHMARK_MODELS=Qwen/Qwen3-8B,mistralai/Mistral-Small-3.2-24B-Instruct-2506 \
VOH_BENCHMARK_REPETITIONS=3 \
npm run voh:benchmark
```

The runner sends only the versioned synthetic fixture, captures raw responses and timing/token metadata, and writes a local report with restrictive file permissions. Human reviewers must score the written rubric and inspect every critical case. The runner deliberately does not self-certify model safety or quality. Do not commit reports containing endpoint details or credentials; do not run it against production traffic.

## Current status

Phase 3.2 is kicked off. No model has been selected, benchmarked on NEXORA tasks, or deployed yet. The next implementation step is to add the fixed synthetic benchmark fixtures and an isolated runner that targets the Phase 3.1 OpenAI-compatible adapter without touching production traffic.
