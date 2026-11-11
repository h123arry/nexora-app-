# NEXORA ORIGIN
## Creative provenance, attribution, and remix lineage

**Status:** Foundation specification. This document defines the engineering contract; it does not claim that Origin is implemented, deployed, or capable of proving the truth of uploaded media.

## Product promise

NEXORA Origin helps creators and viewers understand where a piece of media came from, which NEXORA-native creative steps are known, who contributed to a derivative, and which permissions apply. It should make attribution useful and understandable without turning provenance into surveillance or an unreliable authenticity score.

## Existing systems to integrate

Origin must extend, not replace:
- The existing Create and MediaCreationEngine camera/composer flows.
- Lensverse and creator-owned Lens Studio.
- NEXORA Studio projects, exports, and local/cloud draft lifecycle.
- Existing post/media asset references and private-media access controls.
- Creator profiles, Creator Dashboard, analytics, Nex Coin ledger, Giftverse, and moderation/report workflows.

Before implementation, inspect the current source paths and reuse their established IDs, storage references, server callables, rules, and test conventions. Do not introduce a parallel media store or creator identity model.

## Trust model and user-facing states

Every media item may have one or more independent signals:
1. **NEXORA-created** — a trusted NEXORA creation path recorded the initial asset event.
2. **Creator-declared** — the creator disclosed a tool, edit, collaboration, or source.
3. **Credential-verified** — an attached C2PA Content Credential passed cryptographic and trust-list validation.
4. **Lineage-recorded** — NEXORA has a valid chain of parent/derivative events.
5. **Unknown / unavailable** — the platform has insufficient evidence.
6. **Credential-invalid / lineage-conflict** — a signature, binding, ownership, or parent relationship failed validation.

These are not a single authenticity score. A valid credential proves that signed assertions are bound to an asset and have not been tampered with under the credential's trust model; it does not prove that depicted events are true, that all edits are disclosed, or that the signer owns the underlying rights. Missing credentials must never be treated as evidence of deception.

## Proposed data model

Use the existing Firestore ownership and media conventions after source audit. The following is a logical model, not permission to create client-writable collections blindly.

### Media origin record
- assetId: existing canonical media asset identifier.
- ownerUid: server-verified account owner.
- originKind: nexora_capture | nexora_studio | external_upload | generated | imported.
- contentDigest: server-computed digest for a specific immutable rendition; never trust a client-supplied digest.
- mimeType, byteSize, createdAt, schemaVersion.
- credentialState: absent | verified | invalid | unsupported | pending.
- credentialSummary: privacy-reviewed, allow-listed assertions only; never persist arbitrary manifest text as trusted UI content.
- visibility: derived from the underlying media's existing access policy, not a new public bypass.

### Provenance event
- eventId: secure, idempotent event identifier.
- assetId, actorUid, eventType, createdAt.
- parentAssetIds: bounded references to source assets.
- contributionRole: original_creator | editor | remixer | collaborator | platform_processing.
- toolId and toolVersion when known.
- disclosureSource: trusted_tool | creator_declaration | imported_credential.
- permissionSnapshot: the source owner's applicable remix/attribution permission at the time of the action.
- integrityStatus: server-derived validation result.

Events are append-only from clients' perspective. Corrections happen through explicit superseding or dispute events, not silent history rewriting. Store only metadata required for attribution and integrity; do not copy private source media into public lineage records.

### Remix relationship
- Directed edge from a derivative asset to one or more parent assets.
- Server validates parent visibility/access, permission, ownership, cycle prevention, and bounded depth.
- A private or deleted parent must not leak its title, thumbnail, caption, creator identity, or media URL to unauthorized viewers. The UI may show a generic unavailable-source marker where appropriate.

## Trust boundaries

- The client may request a provenance event but cannot assign ownership, verify credentials, choose trusted status, or mint rewards.
- Trusted server code resolves authenticated actor identity, reads source permissions, computes content digests, validates parent edges, and writes the event atomically where possible.
- Firestore Rules deny direct client mutation of protected origin, credential, and lineage state.
- Public reads return a minimal projection only after applying the source media's visibility and block/moderation rules.
- All consequential actions are rate-limited, idempotent, auditable, and safe under retries.
- Credential parsing must be bounded by file size, manifest size, nesting depth, supported algorithms, and processing time. Reject malformed or unsupported data safely.
- Never use EXIF GPS, device identifiers, or private capture metadata in public views by default.

## C2PA interoperability

Use the published C2PA specification and maintained validator/tooling rather than inventing a proprietary signature format. Validation should:
- Verify manifest structure, signature, certificate/trust status, and asset binding.
- Preserve the distinction between verified, invalid, unsupported, and absent credentials.
- Extract only allow-listed display fields and preserve original credential bytes only where retention and privacy policy allow.
- Avoid stripping valid credentials during supported media processing where practical; if a transform invalidates the original binding, create a new derivative record that references the source and clearly states that the derivative has its own validation status.
- Treat creator declarations and platform logs as useful provenance signals, not cryptographic proof.

## User experience

### Viewer
- A compact Origin entry in the media details menu.
- A readable timeline: created, edited, remixed, collaborated, exported.
- Clear labels for verified credentials versus creator-declared or platform-recorded events.
- A parent/derivative graph with bounded depth and privacy-safe unavailable nodes.
- No alarmist warning for ordinary uploads without credentials.

### Creator
- Attribution preview before publishing.
- Source credit and collaborator selection.
- Per-asset remix permission controls, with clear defaults and change history.
- Ability to correct a declaration, report misuse, request attribution correction, and appeal a disputed lineage edge.
- Exportable provenance summary for their own content.

## Reward and reputation boundaries

Origin may provide verified events to existing creator analytics and creator-economy services. It must not directly issue Nex Coins, create paid status, or alter trust/reputation. Any future originality reward programme requires separate anti-fraud rules, eligibility, budget controls, auditability, and approval. A content hash or first-upload timestamp alone is not sufficient proof of authorship or rights ownership.

## Delivery sequence

### O1 — Audit and provenance foundation
- Map current media asset IDs, upload/transcode paths, creator IDs, Studio export paths, Lensverse paths, Firestore rules, server callables, and deletion lifecycle.
- Define a versioned schema that reuses existing canonical identifiers.
- Add server-side digest and event policy helpers with deterministic tests.
- Add append-only server write path and owner-scoped reads.
- Add rules and emulator tests proving clients cannot forge or mutate provenance.

### O2 — Creative DNA and remix lineage
- Add explicit remix/edit entry points to supported Create and Studio flows.
- Resolve parent asset IDs server-side and validate permissions before derivative publication.
- Persist multi-parent lineage and prevent cycles, cross-account leaks, and unbounded graph traversal.
- Add a privacy-safe lineage viewer.

### O3 — Attribution and creator controls
- Add contributor roles and attribution previews.
- Add opt-in/explicit remix permissions, correction requests, dispute handling, and moderation hooks.
- Ensure blocks, private accounts, deleted sources, and removed posts are respected.

### O4 — Credential interoperability
- Add bounded C2PA manifest extraction and cryptographic validation.
- Display verified, invalid, absent, unsupported, and pending states accurately.
- Test transformed assets, metadata stripping, malformed manifests, unsupported codecs, and invalid signatures.

### O5 — Creator insights and fair recognition
- Expose measured lineage events in creator analytics with sample sizes and metric definitions.
- Detect suspicious self-remix loops, copied chains, and reward farming.
- Keep all financial rewards outside Origin until separately approved and audited.

### O6 — Cross-feature integration
- Integrate supported Create, Lensverse, Studio, posts, Giftverse media, and Discovery surfaces.
- Preserve existing camera, filters, upload, watermark, media worker, and creator flows.
- Do not show Origin controls where the underlying media path cannot provide reliable evidence.

### O7 — Security and release readiness
- Complete unit, rules, emulator, cross-account, retry, deletion, performance, accessibility, and mobile tests.
- Run full repository CI.
- Record staging/device acceptance separately from automated test success.
- No production readiness claim until required provider configuration and live acceptance checks pass.

## Required test matrix

- Forged owner, actor, parent asset, credential state, and content digest.
- Unauthorized access to private, blocked, removed, or deleted source media.
- Duplicate event retries and concurrent derivative creation.
- Self-parenting, cycles, excessive parents, excessive depth, and malformed references.
- Creator permission changes between preview and publish.
- C2PA absent, malformed, unsupported, invalid signature, untrusted signer, valid signature, and asset-binding mismatch.
- Re-encoding, resizing, transcoding, watermarking, and metadata stripping.
- Account deletion/export and source deletion with dependent derivatives.
- Public lineage projection must not expose private captions, URLs, GPS, device IDs, or hidden creator identity.
- Mobile low-memory and offline failure paths.

## Completion criteria

Origin is not complete until each shipped stage has real UI integration, trusted server behavior, restrictive rules, durable persistence, cross-account tests, retry/deletion handling, accessible mobile UI, passing CI, and explicit external/staging gates. Documentation or a UI badge alone does not count as implementation.
