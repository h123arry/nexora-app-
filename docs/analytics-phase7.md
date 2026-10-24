# Nexora Phase 7: Analytics Foundation

## Implementation map

| Layer | Current implementation |
|---|---|
| Event origin | `FeedView` emits best-effort observations for feed mode changes, search starts, sparks, saves, and comments. The shared client helper is `src/services/analyticsService.ts`. |
| Validation and processing | `functions/src/analytics.ts` exposes `ingestClientAnalytics`, validates an allowlisted schema, rejects sensitive properties, derives the actor from Firebase Auth, and writes server-owned raw records. |
| Durable data | Raw observations live in `analyticsEvents`; daily derived records live in `analyticsDaily`. They are separate from posts, chats, profiles, and notifications. |
| Aggregation | `aggregateAnalyticsDaily` is a bounded hourly scheduled Function. It reads at most 5,000 events across the last 31 days and marks saturated windows as partial. |
| Platform UI | The protected Analytics tab in `AdminDashboardView` calls `getPlatformAnalytics` and displays only returned aggregate values. Missing data is shown as `—` or unavailable. |
| Creator UI | Existing creator analytics remains truthful where it already says “Not tracked”; no creator-facing metric is promoted to a verified aggregate in this phase. |
| Authorization | Raw events are server-write-only. Daily aggregates require an `admin`, `founder`, `analytics_admin`, or `analyticsAdmin` claim. Creator aggregate writes are no longer client-authorized. |

## Trust levels

1. **Client observation:** Feed and search interactions are observations reported by a signed-in browser. They are opt-in, schema-validated, deduplicated by stable event ID, and labeled as observations. They do not prove a backend outcome.
2. **Validated application event:** The ingestion callable confirms authentication, event type, bounded properties, and server receipt. It does not convert a click into a confirmed like, share, purchase, or delivery.
3. **Trusted backend event:** This phase does not invent backend confirmation for actions that are not yet wired to authoritative event emitters. Existing Firestore and Functions outcomes remain the source of truth for posts, messages, moderation, and payments.
4. **Derived aggregate:** Daily actor-days, event totals, and per-type counts are computed by the scheduled Function from accepted observation records. Saturated windows are marked partial.

## Metric definitions

- **Observed actor-days:** distinct authenticated actor and UTC-day pairs in accepted client observations. This is not DAU or unique reach.
- **Observed events:** accepted, schema-validated client observations after event-ID deduplication.
- **Qualified impressions:** only `content_impression` events emitted by future explicit visibility instrumentation. Current feed instrumentation does not claim an impression merely because a post was rendered.
- **Meaningful interactions:** explicit interaction observations such as a spark or comment action. They are not authoritative counters and are not used to overwrite post metrics.
- **Engagement rate:** meaningful interactions divided by qualified impressions, expressed as a percentage. It is unavailable when the denominator is zero.

## Privacy and retention decisions

Analytics is opt-in through the `nexora_analytics_observations_enabled` client preference. The client never sends passwords, codes, tokens, private message text, transcripts, voice contents, attachments, precise location, or raw search query text. Event properties are limited to 12 small values and sensitive key names are rejected again on the backend.

Raw observations carry a 90-day retention class. Account deletion now removes the deleted actor’s raw observations through the trusted account lifecycle worker. The repository does not yet include an automated age-based retention job; production deployment must add and verify that scheduled deletion before treating the 90-day retention class as enforcement.

## Honest limitations

The current aggregate source is intentionally narrow. It does not provide authoritative registrations, revenue, follower totals, message delivery, notification delivery, unique reach, geographic breakdowns, or video completion. The dashboard does not show those metrics. It also does not yet include a full creator analytics aggregate, search-success denominator, or historical backfill because those event sources did not exist before this phase.

The scheduled aggregation is hourly, bounded, and not real-time. A window with 5,000 or more matching raw events is marked partial and should be treated as a lower bound until a production shard or incremental aggregation strategy is deployed.
