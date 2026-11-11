# NEXORA Universal Search & Discovery

## What is indexed

The trusted server projection in `searchIndex/{kind}_{sourceId}` supports:
- Public people profiles (`users`)
- Public posts and public video posts (`posts`)
- Public Pages (`pages`)
- Public Circles (`communities`)
- Live rooms while their status is `live` (`liveSessions`)
- Public Circle posts, scheduled events, open polls and announcements
- Active services belonging to Business Pages
- Published Page channel updates
- Hashtag/topic hits derived from matching public post tags

The index stores only the fields needed for discovery: title, bounded excerpt, public avatar/thumbnail, owner ID, target path, tags, normalized text, prefix/bigram search keys, timestamps and bounded engagement signals. It does not copy private messages, email addresses, phone numbers, payment records, private Circle content, or private-account posts.

## Search behavior

- Unicode normalization, accent folding and punctuation normalization.
- Prefix matching across title, username, description, bio, content and tags.
- Multi-term relevance: every query term must match through exact, prefix or one-edit-distance token matching.
- A bounded bigram fallback provides typo tolerance when the exact prefix has no candidates.
- Ranking combines title match strength, freshness decay, bounded engagement, verification, followed creators/Pages and the viewer's interest DNA.
- Results are deduplicated by stable indexed document ID and cursor-paginated in bounded pages.
- Search is authenticated. Private-profile visibility, both sides of block relationships, account restrictions, Circle visibility and bans, and Page visibility are checked server-side before a hit is returned.
- The Firestore search projection is denied to all client reads and writes. Clients call the authenticated callable only.

## Index lifecycle

Firestore write triggers maintain the index for:
- `posts/{postId}`, `users/{userId}`, `pages/{pageId}`, `communities/{communityId}`
- `liveSessions/{sessionId}`
- Circle subcollections: `posts`, `events`, `polls` and `announcements`
- Page subcollections: `services` and `channelUpdates`

Deletion, unpublishing, suspension, private audience changes and ended live rooms remove the corresponding projection. Trigger writes are idempotent; the source document remains authoritative.

## Existing data backfill

New triggers cover writes after deployment. Existing records need a one-time backfill. The admin-only callable `backfillNexoraSearchIndex` processes bounded batches of 100 and returns a continuation cursor.

Run the callable as a trusted NEXORA admin for each of the **11 supported sources** until `done: true`:
`users`, `posts`, `pages`, `communities`, `liveSessions`, `circlePosts`, `circleEvents`, `circlePolls`, `circleAnnouncements`, `pageServices`, `pageUpdates`.

Pass the returned `nextCursor` as `cursor` on the next call for that same source. Keep each source's cursor separate and record completion for each source. Do not expose this callable to ordinary users or run a broad backfill from a client app. The callable verifies the admin custom claim before reading or writing index records.

## Trending

`getNexoraTrendingTopics` derives current topics from a bounded window of up to 250 public posts, freshness-weights engagement, and requires multiple posts and multiple creators. It does not treat one creator's repeated posts as a platform-wide trend.

## Staging rollout gates

Do not deploy or backfill until all of the following are verified for the intended **staging** project:

1. A dedicated staging Firebase project ID has been provisioned and approved by the project owner.
2. The Firebase CLI project alias resolves to that staging project; never substitute the production alias.
3. Functions runtime configuration explicitly sets `NEXORA_ENV=staging`, `NEXORA_STAGING_PROJECT_ID` to the approved staging project ID, and `FIRESTORE_DATABASE_ID` to the intended staging database.
4. The Functions runtime project ID matches `NEXORA_STAGING_PROJECT_ID`. The runtime rejects a staging/production mismatch and rejects an implicit non-emulator Firestore database.
5. The deploy identity has least-privilege access to staging only. Confirm the active account and target project immediately before deployment.
6. Firestore rules and required indexes are deployed with the Functions that maintain and query the projection.
7. Indexing triggers and callable endpoints deploy successfully; inspect deployment output rather than treating a successful CLI exit alone as runtime verification.

The repository currently defines local and production Firebase aliases only. Do not assume a staging alias or staging project is configured merely because the code supports a staging environment. If any staging identifier, database, credentials, or access boundary is missing or ambiguous, stop and obtain owner-approved configuration. Never work around the guardrails by targeting production.

## Controlled backfill and validation

After staging deployment:
1. Verify the staging project ID and database again from the deployed Functions runtime.
2. Confirm the search-index collection is unreadable and unwritable from guest and ordinary authenticated client SDKs.
3. Run a small, representative staging-only smoke test for public profiles, public posts/videos, Pages, public Circles, live rooms and each supported subcollection.
4. Invoke the admin backfill for all 11 sources, one source at a time, in batches of at most 100. Persist each continuation cursor and continue until that source returns `done: true`.
5. Re-run the backfill safely for a small sample to verify idempotency; verify deletes, privacy changes, ended live rooms and removed content disappear from results.
6. Test private profiles, both directions of blocks, restricted accounts, private/invite-only Circles, Circle bans and non-public Pages using separate test accounts.
7. Measure callable latency, error rate, Firestore reads/writes, index document growth and candidate coverage. Investigate unexpected cost or visibility before widening rollout.
8. Record the completed source list, counts, validation evidence and rollback decision before considering production.

Do not run the historical backfill in production as part of a staging exercise. Production rollout requires a separate explicit approval and its own verified deployment window.

The client falls back to the existing locally loaded discovery results if the server callable is unavailable. The global index is not populated for pre-existing documents until the admin backfill has been run. Search results never imply that unindexed/private data is searchable.
