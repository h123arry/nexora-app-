# NEXORA Phase 6 beta feedback workflow

## Purpose

Capture reproducible product issues without implying that unavailable Firebase services, analytics, payments, location aggregation, or other owner-controlled backends are live.

## Tester report template

Each report should include:

- **Title:** `[area] short description`
- **Build/commit:** exact app build or Git commit
- **Area:** onboarding, feed, profile, discovery, publishing, comments/reactions, messaging, privacy/safety, or unavailable service
- **Account:** disposable tester identifier only; never include passwords, tokens, or private message contents
- **Device/browser:** model or browser version and OS
- **Viewport:** 360px, 390px, 412px, or physical-device dimensions
- **Network:** online, offline, or slow/limited connection
- **Steps:** numbered steps from a clean starting state
- **Expected:** the user-visible behavior that should happen
- **Actual:** the exact visible result and error text
- **Evidence:** screenshot or short screen recording with personal data redacted
- **Frequency:** once, intermittent, or every time

## Triage labels

- `needs-reproduction`: report is missing steps or a clean reproduction
- `reproduced`: another tester followed the same steps successfully
- `blocked-owner-config`: requires staging Firebase configuration, authorization, provider settings, or deployment
- `security-sensitive`: may expose private data, permissions, deletion, reporting, or account access
- `ux-polish`: understandable product behavior that can be improved without backend changes
- `fixed-awaiting-regression`: code change exists but the affected journey needs a regression pass

## Safety rules

Use Report and Block for content or account-safety incidents. Do not use fake success states, sample pins, fabricated search results, simulated balances, or placeholder analytics as evidence that a service works. If a feature says it is unavailable, record that state and mark the report `blocked-owner-config` when activation requires owner access.

## Release gate

A beta invitation should wait until the owner has supplied staging configuration and authorization, the two-account acceptance flow passes, the privacy and deletion flows are verified, and every `blocked-owner-config` item has an explicit owner and activation plan. Browser viewport checks must be reported as browser checks; they must not be described as physical Android-device testing.
