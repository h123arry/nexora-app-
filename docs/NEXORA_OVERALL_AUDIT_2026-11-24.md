# NEXORA Overall Product and Engineering Audit
**Audit date:** 2026-11-24  
**Audited baseline:** `main` at `8ff863dd7773b8c0c56f3051c38437f24cd357b3`  
**Repository:** `h123arry/nexora-app-`  
**Scope:** Existing application only. This audit does not authorize new product features, destructive migrations, production writes, rules changes, or deployments.

## Executive summary

The repository has a substantial existing implementation and a meaningful automated quality baseline. The latest main-branch application CI, native/container CI, and CodeQL runs succeeded. However, passing CI is not equivalent to production readiness. The repository itself documents a mixture of Firebase-backed paths, client-local experiences, prototypes, and disabled integrations. The current production Functions deployment and scheduled R2 restoration workflows both have verified operational blockers.

The most urgent cross-cutting risk is release coordination: the open pull-request backlog is large, includes overlapping/older fixes, and includes at least one pull request targeting a feature branch rather than `main`.

## Verified baseline

- GitHub-reported repository size: 28,669 KB (about 28.7 MB of repository data; not the installed application size).
- Default branch: `main`.
- Recursive Git tree: 1,298 tracked paths.
- Open pull requests at audit time: 73.
- Latest main commit: `8ff863dd7773b8c0c56f3051c38437f24cd357b3`.
- Latest main Nexora CI: passed.
- Latest main native and container CI: passed, including Android debug build/tests, iOS simulator build, and Cloud Run container build.
- Latest main CodeQL: passed.
- Latest production Functions workflow: failed at Functions deployment. The workflow successfully released Firestore rules, skipped unchanged indexes, then failed because the deploy identity could not enable the required Cloud Build API. Therefore, this run is not a completed Functions deployment.
- Latest scheduled R2 restoration workflow: failed its preflight because `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` were absent. It did not attempt restoration.
- `tsconfig.json` does not enable TypeScript `strict`, `noImplicitAny`, or `noUnusedLocals` / `noUnusedParameters`. This is an audit target, not an instruction to enable all flags blindly.
- `TODO.md` still has unchecked product-quality items across mobile feed behavior, Create, navigation, trust/privacy, design-system consistency, and release hygiene.
- `README.md` explicitly distinguishes implemented Firebase paths from client-local, prototype, disabled, and unverified paths. Feature presence in UI must not be treated as proof of a production integration.

## Ten audit workstreams

### 1. Architecture and codebase health
**Initial observations**
- The repository contains 1,298 tracked paths across web, server, Firebase Functions, native Android/iOS, media worker, tests, docs, and generated assets.
- Root TypeScript currently has no strict-mode compiler enforcement.
- The app has a broad feature surface; shared service boundaries, duplicated policies, dead code, import cycles, and large component concentration require systematic analysis.
**Next work:** map runtime boundaries and dependency graph; inspect oversized components/services; identify duplicated implementations, dead exports, unsafe casts, and configuration drift. Do not rewrite the architecture.

### 2. Existing functionality and interaction integrity
**Initial observations**
- The product TODO records outstanding work in Create flow completeness, navigation consistency, reachability of existing destinations, reporting entry points, privacy/session controls, and supported publishing controls.
- The README identifies at least one alternate repost/share-sheet interaction as UI-local.
**Next work:** inventory all routes and user-visible controls; trace each action to its persistence/API path; verify success, failure, loading, empty, and permission states. Classify each as production-backed, local-only, disabled, or unverified.

### 3. Firebase, backend, and data integrity
**Initial observations**
- Firebase Auth, Firestore, Storage, and Functions are used through separate client and server boundaries; the client initializes Functions in both `us-central1` and `europe-west1`.
- The auth context deliberately preserves a valid Firebase session when profile hydration fails by using a non-persisted in-memory fallback. This behavior needs end-to-end validation against profile provisioning, retry, and live snapshot reconciliation.
- The latest production workflow deployed Firestore rules successfully but failed before Functions deployment.
**Next work:** trace critical writes from UI to trusted server code and back; verify idempotency, transaction boundaries, retry behavior, indexes, quotas, and production callable availability.

### 4. Security and privacy
**Initial observations**
- Firestore and Storage rules are present and have dedicated emulator suites; CodeQL passed on the latest main commit.
- The open PR backlog includes overlapping privacy hardening work (#559 and #564); #564 is marked dirty/non-mergeable at the time of inspection.
- Public profile projection, identity claims, media access, account deletion, and chat-media authorization are high-impact boundaries.
**Next work:** review rules against every client query/write and callable; trace sensitive fields through public projections, logs, exports, notifications, and deletion; verify account isolation with two-user emulator tests. No permission broadening without evidence.

### 5. Performance and resource efficiency
**Initial observations**
- Vite config separates Firebase SDK modules, Motion, and icons into cacheable chunks.
- Existing security report records a previous 1.5 MB raw main entry warning, although it also records a reduction after lazy-loading FeedView. Current build output must be measured again.
- The scheduled R2 recovery process currently cannot start because its credentials are missing.
**Next work:** measure current production chunk sizes, route-level loading, media bytes, image retries, video preloading, Firestore listener counts, query fan-out, and low-bandwidth behavior on mobile-sized viewports.

### 6. UI/UX and design consistency
**Initial observations**
- `TODO.md` still records incomplete shared-token adoption, component state consistency, focus/touch-target/reduced-motion work, and route/metadata synchronization.
- Existing screenshots in the repository are not sufficient to certify all authenticated routes or device sizes.
**Next work:** inspect every major route at narrow Android, tablet, and desktop breakpoints; verify typography, spacing, safe areas, focus, contrast, loading/empty/error states, and the approved NEXORA brand system.

### 7. Social-network data integrity
**Initial observations**
- The current open PRs include fixes for video-view retry storms (#574), video-view/retention Functions deployment (#573), notification category preferences (#572), cold-start creator discovery (#571), account-deletion comment cleanup (#565), and profile-media/search behavior (#580).
- PR #580 currently targets `fix/auth-email-google-phone-only`, not `main`.
- PR #573 is currently dirty/non-mergeable; its stated production callable allowlist issue is not yet released.
**Next work:** verify feed ordering and exclusions, view counting, likes, comments/replies, follows, reposts, search, notifications, messaging, and creator analytics across two independent accounts and across reload/device boundaries.

### 8. Reliability and recovery
**Initial observations**
- Auth hydration has explicit sequence guards, in-flight de-duplication, persistence fallback, and an in-memory profile fallback.
- The product TODO and README identify incomplete/variable integrations; the R2 recovery workflow has a verified credential preflight failure.
- The production Functions workflow can partially complete (rules) before failing at a later deployment stage.
**Next work:** test cold start, token refresh, network loss, quota exhaustion, stale cache, retries, duplicate submissions, background/foreground transitions, and partial release recovery. Add bounded retries and truthful user-facing states only where missing.

### 9. Testing and quality assurance
**Initial observations**
- The repository has extensive unit and emulator scripts, plus root CI, CodeQL, native/mobile CI, and container build workflows.
- Latest main app CI, native/container CI, and CodeQL passed.
- A passing main baseline does not prove all current open PRs pass or that live Firebase/Cloudflare services behave correctly.
**Next work:** map each critical user journey to unit, rules, emulator, integration, and device coverage; remove brittle source-text-only assertions where behavior tests are feasible; verify PR checks and coverage gaps before merges.

### 10. Production operations and release readiness
**Initial observations**
- Production and staging workflows exist with separate target validation.
- The production Functions deploy is blocked by Cloud Build API enablement permission.
- The R2 restore workflow is blocked by missing credentials.
- The open PR queue contains 73 items and includes stale/overlapping work, dirty merge states, and dependency updates that need compatibility review.
**Next work:** reconcile the PR backlog against current main; identify superseded work and dependency risks; verify deployment secrets/permissions, rollback strategy, monitoring, alerting, and exact release provenance. Never report a deployment as complete when only part of a workflow succeeded.

## Immediate priority order

1. Resolve production Functions deployment permission with the project owner; do not weaken IAM.
2. Restore the R2 workflow's required secrets through the repository owner; never place secret values in source or logs.
3. Reconcile the 73 open PRs, beginning with base-branch correctness and overlapping changes.
4. Validate current profile provisioning/retry behavior against the reported Firestore quota/profile-sync issue.
5. Complete the ten workstreams with reproducible evidence and focused fixes.

## Audit limitations

This is an initial repository and workflow audit based on GitHub source, metadata, pull-request diffs, and Actions logs. It is not a claim that every route, production database record, connected service, or real device has been exercised. No production data was read or changed. The ten workstreams remain open until their detailed inspection and verification are complete.


## Additional source-level inspection

### Maintainability concentration
The following existing files are unusually large and should receive focused responsibility-boundary review before any broad refactor:

| File | Lines | Approx. source bytes |
|---|---:|---:|
| `src/components/ProfileView.tsx` | 4,210 | 246,799 |
| `src/App.tsx` | 3,749 | 182,086 |
| `src/components/FeedView.tsx` | 3,503 | 174,762 |
| `server.ts` | 1,914 | 106,918 |
| `src/components/NexoraVideoPlayer.tsx` | 1,767 | 78,015 |
| `src/components/NexoraStudio.tsx` | 1,526 | 138,534 |
| `functions/src/index.ts` | 1,203 | 79,788 |

These figures identify review candidates, not proof that splitting a file is automatically beneficial. The follow-up must map state ownership, side effects, data contracts, and test seams first, then refactor only where it reduces coupling without changing behavior.

### Navigation consistency
- The app defines a central `navigateTo` path that tracks scroll position, navigation history, viewed profiles, and the URL's `tab` parameter.
- Some existing navigation entry points call `setActiveTab` directly instead. Examples visible in the current source include the Creator Studio action in `Sidebar.tsx` and the feed's Messages/VOH AI callbacks in `App.tsx`.
- This creates a concrete consistency risk: those transitions do not necessarily pass through the same history, URL, and scroll-restoration behavior as destinations using `navigateTo`.
- Follow-up: inventory every route transition and route all equivalent top-level navigation through one tested navigation contract. Preserve intentional overlay/subtab transitions.

### Audit coverage inventory
- The current tree contains 110 React component TSX files under `src/components`.
- It contains 114 root `tests/*` test/spec files and 71 `functions/tests/*` test/spec files.
- Test count is not a coverage percentage. The next QA pass must map tests to critical user journeys and distinguish behavior/integration tests from source-text assertions.

### Pull-request base-branch anomaly
- PR #580 targets `fix/auth-email-google-phone-only` instead of `main`.
- Its changes are limited to three files and appear to be media retry and directory-search rendering changes. Do not retarget or merge it until comparing the feature branch against current `main` and verifying that no required authentication changes would be lost or duplicated.
- PR #573 is dirty/non-mergeable and its production deployment change is still outstanding. PR #564 is also dirty/non-mergeable. Other current PRs need a similar base, overlap, check, and supersession review before the backlog is reduced.


## Branch divergence check (main versus selected active fix branches)

A direct Git commit comparison against current `main` shows that several high-priority fixes have diverged rather than simply being one or two commits behind. These branches must be reconciled carefully; GitHub's PR-level file patch can understate the complete commit ancestry when a PR targets another feature branch.

| PR | Branch | Ahead of main | Behind main | Compare status |
|---|---|---:|---:|---|
| #580 | `fix/media-reliability-discovery-v2` | 32 | 1 | diverged |
| #564 | `fix/security-privacy-social-reliability-v3` | 5 | 9 | diverged |
| #565 | `fix/account-deletion-comment-erasure` | 7 | 9 | diverged |
| #573 | `deploy-video-watch-functions` | 1 | 4 | diverged |
| #574 | `throttle-video-view-retries` | 3 | 4 | diverged |
| #572 | `respect-notification-category-preferences` | 4 | 4 | diverged |
| #571 | `improve-new-creator-discovery` | 6 | 5 | diverged |

**Critical interpretation for PR #580:** the PR's immediate patch against its selected base shows only three changed files, but that base is `fix/auth-email-google-phone-only`. Comparing its head directly with current `main` reveals 32 commits ahead, one behind, and 19 changed files. Retargeting it to main as-is could reintroduce or duplicate a large authentication change set. Preserve the branch and reconstruct only the intended media/search changes on a clean branch from current main after verifying the exact patch.

The divergence counts are a coordination warning, not proof that every commit is unique or should be merged. Some changes may already be represented in main through squash merges. Each branch needs patch-level comparison, duplicate/supersession checks, current-main rebase/cherry-pick, and fresh CI before merge.

## Current audit report validation

- Draft audit PR: #581, based on current main.
- The report branch is isolated; no application source, Firebase rules, production data, secrets, or deployment settings were modified.
- CodeQL and Nexora CI for the documentation PR were still running at the latest check. Do not merge or claim validation complete until both checks finish successfully.
