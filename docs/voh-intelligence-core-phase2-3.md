# VOH Intelligence Core Phase 2.3: Public Discovery

## Scope
This phase adds an explicit, read-only Public Discovery context for VOH AI. It complements the existing personal feed, profile, Circles, notifications, drafts, Studio and World Pulse scopes without granting access to private conversations or write actions.

## Data boundary
- The server loads at most 30 recent Firestore posts where `audience == public`.
- Each candidate is rechecked against the owner's profile, account restriction status, privacy settings and bilateral block lists.
- Posts from private profiles are included only when the authenticated viewer follows the owner.
- Deleted, removed, suspended, draft and archived content is excluded.
- The model receives at most 12 compact post summaries and 8 sample-scoped topic counts.
- Media URLs, Storage paths, owner IDs, private documents, member lists and arbitrary source fields are not included.
- Topic counts require at least two posts from at least two distinct creators in the loaded sample.

## Accuracy rules
The sample is a bounded point-in-time view, not a complete index, live global feed or authoritative trending ranking. VOH is instructed to state that limitation and must not extrapolate platform-wide claims.

## Access control
The `public_discovery` scope is opt-in for each chat request. Only the read-only `get_public_discovery_snapshot` tool is registered for that scope. Missing verified identity fails closed. Inbox and all write/action tools remain unavailable.

## Verification
The phase adds tests for public-audience filtering, private-profile visibility, sample-scoped topic aggregation, media/path omission, missing identity, tool declaration and explicit scope policy. The new test is included in `npm run test:unit`.
