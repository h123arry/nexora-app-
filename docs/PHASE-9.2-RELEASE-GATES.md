# NEXORA 9.2 Release Acceptance Gates

This checklist is an engineering release contract. A checkbox is complete only when its evidence is attached to the release record. Source code, emulator success, a provider dashboard, or a green frontend build alone is not production acceptance.

## 1. Live video transport

- [ ] Select and provision the production SFU provider (recommended: LiveKit Cloud or self-hosted LiveKit).
- [ ] Create separate development/staging and production projects.
- [ ] Store API key and secret in Firebase Functions Secret Manager; never in Vite variables or client bundles.
- [ ] Add a server callable that issues short-lived participant tokens after checking Firebase identity, live-session state, host/viewer role, account restrictions, room membership, and token TTL.
- [ ] Connect the existing LiveView room lifecycle to camera/microphone capture, SFU publish/subscribe, mute/camera controls, reconnection and participant departure.
- [ ] Reject client-selected room names, roles, grants, or identity claims; derive them from the trusted live-session record.
- [ ] Verify host-only publish permissions, viewer subscribe-only permissions, host termination and revoked/expired tokens.
- [ ] Verify one-host/multiple-viewer streaming, two-host/co-host streaming, reconnect, network handoff, app background/foreground and permission denial.
- [ ] Verify transport metrics, provider usage limits, recording policy, retention and replay delivery before advertising replays.
- [ ] Run a staged concurrency/load test and record latency, packet loss, reconnect rate and provider cost.

Current status: persistent room, viewer and chat infrastructure is implemented in PR #127. Camera capture, SFU transport, recording and replay are not configured.

## 2. Production Firebase deployment verification

- [ ] Confirm the intended production Firebase project and default Firestore database.
- [ ] Confirm Auth providers and authorized domains in the Firebase Console.
- [ ] Verify production Functions secrets and runtime configuration without exposing secret values.
- [ ] Deploy Functions, Firestore rules, composite indexes, TTL policies and Storage rules to staging first.
- [ ] Run two-account auth, live-room, chat, gifting, wallet and payout acceptance tests against staging.
- [ ] Verify health/readiness endpoints, logs, error reporting, request IDs and alert routing.
- [ ] Capture deployment versions, command outputs and rollback instructions.
- [ ] Promote to production only after owner approval and successful staging evidence.

Current status: repository deployment configuration and automated validators exist. No production deployment is claimed by this document.

## 3. Real-device acceptance

Test at minimum one current Android device and one additional Android device with different hardware/network characteristics. Add iOS before claiming cross-platform parity.

- [ ] Signup/login, email verification, profile setup and session persistence.
- [ ] Feed scroll, image/video decode, autoplay/pause, memory pressure and app resume.
- [ ] Camera/microphone permission grants and denials; rotate, background and foreground during live.
- [ ] Wi-Fi to mobile-data handoff, weak/unstable network, reconnect and interrupted uploads.
- [ ] Live host and viewer simultaneously on separate physical devices.
- [ ] Chat ordering, duplicate prevention, viewer count reconciliation and gift overlay delivery.
- [ ] Wallet, gift send, insufficient balance, repeated request/idempotency and payout status.
- [ ] Accessibility font scaling, touch target sizes, keyboard navigation and reduced motion.
- [ ] Battery/thermal observations after a sustained 30-minute feed and live session.
- [ ] Record device model, OS version, build SHA, network conditions, results and defects.

Current status: physical-device sessions have not been performed by the repository automation.

## 4. Creator monetization and GIFTVERSE

- [ ] Verify the server-owned NEX wallet and balanced immutable ledger with two real staging accounts.
- [ ] Verify gift catalogue pricing is server-authoritative and cannot be overridden by the client.
- [ ] Verify gift debit, escrow credit, creator earnings, gallery record and live event commit atomically.
- [ ] Verify idempotent retries, insufficient balance, restricted accounts, risk review and reversed/failed outcomes.
- [ ] Verify creator earnings are denominated in NEX and never represented as NGN cash income.
- [ ] Verify Paystack test-mode credentials and webhook delivery in staging.
- [ ] Verify beneficiary resolution, account-name matching, compliance review, OTP approval, webhook signatures and scheduled reconciliation.
- [ ] Verify all six live payout gates: finance approval, provider business verification, settlement funding, compliance approval, webhook verification and successful live test transfer.
- [ ] Perform a controlled live test transfer and reconcile the bank/provider record before enabling production cash withdrawals.
- [ ] Keep product checkout/subscriptions disabled until their separate payment adapter, entitlements, refunds and webhook lifecycle are verified.

Current status: NEX gift delivery and Paystack NGN payout code/policy exist. Production credentials, approvals and live settlement evidence are not visible from the repository; paid checkout remains disabled.

## 5. Discovery and feed quality

- [ ] Run the unit suite for freshness, bounded engagement, search relevance, diversity and negative feedback.
- [ ] Verify Following mode never admits unrelated creators.
- [ ] Verify muted, blocked, hidden and not-interested controls remain hard eligibility filters.
- [ ] Verify recommendation feedback is account-scoped, bounded and resettable.
- [ ] Measure creator diversity, duplicate exposure, freshness, meaningful engagement and hide/not-interested rates on a consented staging cohort.
- [ ] Add offline/empty-feed regression coverage and ensure every fallback respects user exclusions.
- [ ] Review ranking changes against a fixed evaluation set before rollout.

Current status: ranking and quality tests exist; this release adds bounded watch-time feedback and regression coverage. Production cohort measurements remain outstanding.

## Release decision

The 9.2 rating is earned only after all mandatory gates above have verifiable evidence. Do not substitute a code-completion score for live transport, production deployment, physical-device acceptance or actual settlement verification.
