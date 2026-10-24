# Nexora Security and Product Integrity Review

**Review scope:** account/profile authorization, public-feed audience enforcement, media upload and voice-message delivery, inbox request behavior, VOH request handling, login affordances, and wallet claims. Work was performed against the connected repository. No production data was read or changed, and no Firebase deployment was performed.

## Key findings and fixes

### Authentication, account profile, and reputation

- Firestore profile creation now rejects client-supplied reputation, reputation breakdown, follower/following/Sparks counts, and contributions unless they start at zero. The public profile cannot claim verification without a verified Firebase Auth token. Regression tests also ensure unverified accounts may create an unverified profile but cannot forge a verification badge.
- The login form now states that this form accepts email and password; it no longer advertises username/phone as identifiers for a handler that only called Firebase email/password sign-in.

### Post audience privacy

- Previously, shared posts were globally readable regardless of their `audience` field, while the composer implied that “Close Friends,” “My Community Circle,” and “Only Me” were private. Those options were not backed by access-control rules.
- Shared post reads are now limited to records whose audience is explicitly `public`. Post creation and updates must remain public, and post-list queries now include an audience filter plus the required composite Firestore index. Private-audience write attempts are rejected. The composer explains why publishing is public-only until real private-audience authorization exists; it does not quietly relabel private content as public.
- Firestore rules tests cover public reads, private direct-read denial, unsupported private creation/update denial, and public-filtered list access.

### Media and messaging

- Fixed the mismatch between user-media object paths and their `mediaId` metadata: the path now matches the exact ID checked by `storage.rules`.
- Voice messages now upload durable audio instead of storing a temporary browser `blob:` URL. Chat audio is stored under a chat-specific path and Storage rules use the Firestore chat participants list to restrict reads, uploads, and deletes to participants/the uploading owner.
- Replaced simulated recording after microphone permission failures with an explicit error. Recording duration now uses a ref-backed timer so the final audio message receives its actual duration. Voice messages use native audio controls for actual playback; legacy messages without a stored audio URL display that limitation.
- Message deletion now awaits Firestore deletion before removing the message from the UI and reports failure rather than implying a successful delete.
- The inbox’s “Ignore” behavior was only closing the view. It now says “Hide request,” persists the hidden ID in local storage, and tells the user that the request is hidden only on this device. A server-side reject/block workflow remains unimplemented.

### VOH, wallet, and untrusted values

- The visitor app now says “Preview feed” and warns that sample content may appear, instead of implying the guest sees verified live activity. The mobile feed toolbar now hides redundant desktop controls and keeps all five categories visible without clipping. Post metadata is simplified on narrow cards.
- VOH no longer includes the just-submitted user prompt twice in the model history. It no longer invents feed counts/trends, claims an active encrypted inbox tunnel, or claims a fixed joined-community count. Inbox context explicitly states that private message contents are not included.
- The rate limiter no longer keys directly off untrusted `X-Forwarded-For`. The backend uses Express’s `req.ip`/socket address; any future trusted-proxy configuration must match the actual deployment chain.
- Replaced sample wallet balances, exchange rates, payouts, transaction rows, and inoperative “transfer” buttons with the values already stored on the account (or “Not available”) and an explicit notice that a trusted ledger/transfer backend is not connected.
- Removed placeholder follower, following, reputation, and synthetic username/bio data from chat contact summaries when the source chat does not contain those values.

## Validation performed

| Check | Result |
|---|---|
| `npm run lint` | Passed after installing the declared `functions` workspace dependencies |
| `npm run build` | Passed; Vite still reports the existing large JavaScript chunk warning |
| `npm run test:unit` | Passed: 11 tests, 0 failures |
| `npm run test:rules` | Passed: 14 Firestore Emulator tests, 0 failures |
| `npm run test:storage` | Passed: 2 Storage Emulator tests, including participant-bound chat audio access, 0 failures |
| `npm audit` (root app) | Passed: 0 known advisories after compatible dependency updates and a patched gRPC override |
| `npm audit --prefix functions --omit=dev` | 9 moderate advisories remain; remediation requires major Firebase Admin / Functions updates and was not forced |
| `git diff --check` | Passed |
| Desktop + 390px mobile screenshot review | Passed; all five feed categories fit at mobile width and visitor preview is labelled |

Emulator tests use demo project IDs and synthetic users/data. No production credentials, user records, live Firebase project, or live deployment were used.

## Remaining constraints and rollout notes

1. **Rules and index are not deployed.** Repository changes do not change production authorization until the intended Firebase project receives reviewed `firestore.rules`, `storage.rules`, and `firestore.indexes.json` deployments.
2. **Post audience backfill is needed before deploying the stricter rules.** Shared post queries now require `audience == 'public'`; existing public documents with no `audience` field will no longer appear in shared feeds and will fail direct-read checks. Backfill confirmed-public legacy posts to `audience: 'public'` with an authorized migration, and separately review ambiguous/private legacy records rather than blindly making them public.
3. **Private post audiences are intentionally unavailable.** Secure follower/circle/community/only-me access and membership-aware queries still need a designed and tested authorization model. The composer blocks the unsupported options instead of exposing them as if secure.
4. **General user-media storage remains a distinct policy.** Existing `users/{uid}/media/{id}` uploads remain readable by any authenticated user under the existing general-media rule. Voice notes now use the participant-scoped chat path. Any future private profile/document upload must receive its own owner-only storage path/rule before use.
5. **Wallet, transfers, payouts, and transaction ledger still need trusted server infrastructure.** The UI no longer fabricates them; no monetary conversion, provider integration, or authoritative transaction path was implemented.
6. **Other server-owned app actions remain incomplete.** Likes/share counters, recipient notifications/security events, admin/moderation claims, and server-side request rejection still require trusted backend paths; client rules reject or clearly limit those operations where covered.
7. **Proxy-aware rate limiting needs deployment configuration.** Current keying resists spoofed forwarded headers but a reverse-proxy deployment may group multiple visitors under one remote address. Configure `trust proxy` only after verifying the exact trusted proxy chain and add a deployment-level rate-limit test.
8. **Functions dependencies:** nine moderate npm audit findings remain in the Firebase Admin/Functions transitive tree; the available automated fix requires major runtime SDK upgrades. These were not force-upgraded. The root app dependency tree now audits clean after semver-compatible dependency refreshes and a gRPC patch override; typecheck, emulators, and build must be run on the updated lockfiles before merge.

## Git workflow

Changes are on the repository’s `main` branch in the connected checkout. No force-push or production deployment is planned. The final commit and push result will be reported after the final validation pass.
