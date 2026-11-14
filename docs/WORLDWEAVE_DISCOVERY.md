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

## Client integration

The WorldWeave view now uses the callable for public discovery instead of directly subscribing to the full public parent documents. Search is server-filtered, public results are cursor-paginated with a load-more control, and the user's own experiences are merged back in from their authenticated membership query. This prevents the discovery list from downloading every public participant ID array.

## Rollout

This is an additive client/backend capability. It does not change membership authorization or deploy to production.
