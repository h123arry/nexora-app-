# Nexora Transformation Research

Updated: 2026-10-23

Nexora should become a trusted living social network, not a collection of decorative AI labels. The strongest product opportunity is the combination of human communities, creator economics, an explainable feed, durable realtime messaging, and a grounded assistant that can help users understand and act on their own Nexora data without becoming an opaque autonomous operator.

## Highest-priority product principles

1. **Trust is a feature.** Enforce authorization, App Check, quotas, audit logs, retention, reports, appeals, and human review on the server. Client-side checks are UX only.
2. **Meaningful value beats raw attention.** Ranking should optimize useful interactions, satisfaction, diversity, freshness, creator opportunity, and safety—not only clicks or time.
3. **VOH AI must be grounded and inspectable.** Use server-side retrieval with access-control filters, visible evidence, explicit memory controls, typed tools, confirmation for writes, and continuous evaluation.
4. **Media is a pipeline.** Uploads should become validated, moderated, captioned, adaptive renditions with poster assets, lifecycle cleanup, and CDN delivery.
5. **Accessibility and speed are release criteria.** Use WCAG 2.2 AA, Core Web Vitals field measurement, route budgets, keyboard/screen-reader testing, and transparent offline states.
6. **Growth must preserve user agency.** Make pricing, subscriptions, referrals, notification permissions, personalization, and cancellation clear and reversible.

## Recommended execution phases

### Phase 0: Foundation

Create a data and event taxonomy, threat model, authorization matrix, performance and accessibility budgets, environment separation, feature flags, kill switches, and emulator-tested security regression suites.

### Phase 1: Trusted core

Add App Check enforcement, server-side quotas and idempotency, durable reports and moderation cases, policy-versioned decisions, appeals, restricted audit events, age-safety defaults, and retention/deletion workflows.

### Phase 2: Realtime and media

Finish adaptive media processing, captions and transcripts, processing status, private delivery, presence, notification preferences, message virtualization, resilient listeners, and offline/reconnect states.

### Phase 3: Transparent discovery

Introduce eligible candidate retrieval, freshness decay, meaningful-action scoring, diversity constraints, exploration for new creators, cold-start onboarding, chronological mode, mute/hide controls, and “Why am I seeing this?” explanations.

### Phase 4: VOH AI

Move provider credentials and tool execution behind a trusted server boundary. Add conversations and message pagination, ACL-aware retrieval, clickable evidence, explicit memory, typed read-only tools, confirmation flows, moderation middleware, quotas, feedback, and evaluation gates. Do not store chain-of-thought.

### Phase 5: Sustainable growth

Instrument activation and retention around meaningful contribution. Add server-authoritative creator earnings, subscriptions and tips, verified referrals, consent records, transparent cancellation, fraud controls, and experiment guardrails.

## VOH AI product contract

VOH should clearly distinguish generated text, retrieved evidence, and completed actions. It should state when it lacks evidence, never claim that it searched the web or changed an account unless that actually occurred, and treat all retrieved user content as untrusted data rather than instructions.

Memory should be explicit user data. Separate short-term conversation context from saved preferences and derived summaries. Provide a memory viewer, remember/forget actions, per-conversation memory opt-out, export/delete behavior, and retention limits.

Tools should be typed and least-privilege. Start with read-only tools such as summarizing the user’s feed, searching the user’s saved content, and explaining a notification. Require confirmation for messaging, posting, moderation, account settings, payments, or other irreversible actions. Re-check authentication and ownership inside every server tool.

Every prompt/model/tool change should be evaluated against normal, multilingual, adversarial, privacy, grounding, memory, and permission-boundary cases. Track answer quality, evidence faithfulness, unauthorized-action rate, refusal quality, latency, cost, and user feedback.

## Metrics that matter

Track activation, D1/D7/D30 retention, meaningful interactions, saves and replies, negative feedback, creator/topic concentration, content diversity, freshness lag, report rate, appeal reversals, moderation SLA, upload processing time, media completion, caption use, message delivery, notification opt-out, VOH evidence faithfulness, tool errors, and cost per successful assistant task.

## References

[1]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines 2.2"
[2]: https://web.dev/articles/vitals "Web Vitals"
[3]: https://firebase.google.com/docs/app-check "Firebase App Check"
[4]: https://firebase.google.com/docs/firestore/security/get-started "Firestore Security Rules"
[5]: https://firebase.google.com/docs/storage/web/upload-files "Firebase Storage Web Uploads"
[6]: https://firebase.google.com/docs/firestore/solutions/presence "Firebase Firestore Presence"
[7]: https://firebase.google.com/docs/cloud-messaging "Firebase Cloud Messaging"
[8]: https://engineering.fb.com/2021/01/26/core-infra/news-feed-ranking/ "Meta News Feed Ranking"
[9]: https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you "TikTok Recommendation Principles"
[10]: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L:2022:277:FULL "Digital Services Act"
[11]: https://genai.owasp.org/llm-top-10/ "OWASP Top 10 for LLM Applications"
[12]: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence "NIST Generative AI Profile"
[13]: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/ "OpenAI Practical Guide to Building Agents"
[14]: https://www.anthropic.com/research/building-effective-agents "Anthropic Building Effective Agents"
[15]: https://ai.google.dev/gemini-api/docs/google-search "Gemini Grounding with Google Search"
[16]: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API "MDN Notifications API"
[17]: https://www.ftc.gov/news-events/news/press-releases/2024/07/ftc-icpen-gpen-announce-results-review-use-dark-patterns-affecting-subscription-services-privacy "FTC Dark Patterns Review"
