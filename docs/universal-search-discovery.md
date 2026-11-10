# NEXORA Universal Search & Discovery

## What is indexed

The trusted server projection in `searchIndex/{kind}_{sourceId}` supports:
- Public people profiles (`users`)
- Public posts and public video posts (`posts`)
- Public Pages (`pages`)
- Public Circles (`communities`)
- Live rooms while their status is `live` (`liveSessions`)
- Scheduled events, open polls and announcements in public Circles
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
- Search is authenticated. Private-profile visibility, both sides of block relationships, and Circle bans are checked server-side before a hit is returned.
- The Firestore search projection is denied to all client reads and writes. Clients call the authenticated callable only.

## Index lifecycle

Firestore write triggers maintain the index for:
- `posts/{postId}`, `users/{userId}`, `pages/{pageId}`, `communities/{communityId}`
- `liveSessions/{sessionId}`
- Public Circle posts and scheduled Circle events
- Active Page services and Page channel updates

Deletion, unpublishing, suspension, private audience changes and ended live rooms remove the corresponding projection. Trigger writes are idempotent; the source document remains authoritative.

## Existing data backfill

New triggers cover writes after deployment. Existing records need a one-time backfill. The admin-only callable `backfillNexoraSearchIndex` processes bounded batches of 100 and returns a continuation cursor.

Run the callable as a trusted NEXORA admin for each source until `done: true`:
`users`, `posts`, `pages`, `communities`, `liveSessions`, `circlePosts`, `circleEvents`, `circlePolls`, `circleAnnouncements`, `pageServices`, `pageUpdates`.

Pass the returned `nextCursor` as `cursor` on the next call for that same source. Do not expose this callable to ordinary users or run a broad backfill from a client app. The callable verifies the admin custom claim before reading or writing index records.

## Trending

`getNexoraTrendingTopics` derives current topics from a bounded window of up to 250 public posts, freshness-weights engagement, and requires multiple posts and multiple creators. It does not treat one creator's repeated posts as a platform-wide trend.

## Deployment and readiness

1. Deploy Firestore rules and Functions together.
2. Confirm all indexing triggers and callable endpoints deploy in the selected Firebase environment.
3. Run the admin backfill for all nine sources.
4. Verify public/private/block test cases in the Firestore Emulator.
5. Confirm search-index documents are inaccessible from client SDKs.
6. Validate search latency, function invocation cost, index growth and candidate coverage against staging data before production rollout.

The client falls back to the existing locally loaded discovery results if the server callable is unavailable. The global index is not populated for pre-existing documents until the admin backfill has been run. Search results never imply that unindexed/private data is searchable.
