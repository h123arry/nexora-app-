# Nexora operations, recovery, privacy, and incident response

## Backups and restoration

Firestore data, Storage objects, Auth users, rules, indexes, Functions source, and deployment configuration are separate recovery surfaces. The repository does not create or verify production exports. Before launch, the owner must configure scheduled Firestore exports to an access-controlled, retention-managed bucket; define Storage object/version retention; confirm Auth export/recovery options; and keep rules, indexes, Functions configuration, and release artifacts in source control or an approved artifact registry.

A restore drill must use an isolated project and non-production data. Verify that the restored named database, Storage objects, Auth identities, rules, indexes, and Functions environment can support a read-only smoke test before declaring recovery successful. Never restore customer data into the development project. Record RPO/RTO targets, backup freshness, operator access, encryption/retention policy, and the last successful restore test.

Account deletion is a trusted, leased, retryable workflow. It removes owned documents, relationship edges, selected user subcollections, shared-chat messages/media, user-owned Storage prefixes, public/private profile records, and Auth identity. Backup retention, legal records, and third-party systems may retain data for a limited period as disclosed by the application policy. Deletion is not a substitute for backup retention or a production restore plan.

## Privacy and data lifecycle

Firebase Auth is the identity authority. Private profile fields remain owner-scoped. Public profile projections intentionally exclude email, phone, roles, moderation flags, balances, and private preferences. Private chat media is not public and is streamed through an authenticated API only. Client-generated analytics are bounded and policy-filtered; raw analytics and aggregates remain server-controlled. Optional VOH memory is account-scoped and consent-bound.

The repository does not implement a complete private-audience graph, follower-only publication model, durable search deletion index, media transcoding/moderation pipeline, or provider-backed email/push delivery. These are product and compliance blockers for any claim of full social-platform production readiness. Retention schedules, legal holds, export requests, and jurisdiction-specific privacy policy must be approved outside this codebase.

## Incident response

For a suspected privacy or authorization incident, first preserve the release commit, request IDs, sanitized logs, rule/index version, Functions revision, and relevant timestamps. Do not copy tokens, message bodies, credentials, or private media into tickets. Disable the affected route/provider or roll back to the last reviewed compatible release only if that reduces exposure; never deploy broad allow rules.

For Auth compromise, revoke affected sessions/credentials through the trusted Firebase administrative process, review provider and App Check logs, and rotate server secrets through the secret manager. For Firestore/Storage exposure, deploy the last reviewed restrictive ruleset, verify index/query behavior, inspect access logs, and preserve a backup before any repair. For Functions/API abuse, apply the existing provider or gateway controls, inspect error/rate-limit signals, and avoid deleting evidence.

The incident owner should classify impact, affected identities/data, start/end time, containment, eradication, recovery, user/regulatory notification requirement, and follow-up actions. Recovery is complete only after denied-path smoke tests, health/readiness checks, rule/index verification, and a documented approval. Alert destinations and escalation contacts are external configuration requirements and are not fabricated by this repository.
