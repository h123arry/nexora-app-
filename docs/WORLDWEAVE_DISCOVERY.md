# WorldWeave Public Discovery

## Behavior

The trusted `discoverPublicWorldWeaves` callable returns a cursor-paginated page of public WorldWeaves. It supports optional title/description search, newest-first pagination, and within-page relevance/freshness ordering.

- Only experiences with `visibility == public` are queried.
- Deleted, removed, suspended, draft, and archived experiences are excluded.
- Search requires every normalized query term to occur in the public title/description.
- Pages contain at most 20 results.
- The cursor is bound to the normalized query and the last page's update timestamp/document ID.

## Privacy boundary

The response is an explicit public projection containing only experience ID, title, description, owner ID/name, moment count, and created/updated timestamps.

It never returns:
- participant ID arrays or membership documents;
- invite documents or invite state;
- private media URLs or storage paths;
- private activity history or moment contents.

Owner account restrictions, private-profile follow requirements, and block relationships are checked before a result is returned. A viewer's block list and the owner's block list both suppress discovery.

## Verification

The Functions emulator tests cover authentication, query/cursor validation, strict projection fields, 20-item pagination, and exclusion of private experiences, blocked owners, and private-profile owners without an existing follow.

## Rollout

This adds a callable backend capability and Firestore index reuse. It does not automatically expose a new client screen or deploy to production.
