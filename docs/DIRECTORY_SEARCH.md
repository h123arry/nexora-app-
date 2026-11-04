# NEXORA directory search

The current directory callable is a bounded prefix search, not a full-text search engine.

## Searchable entities

- Public member usernames
- Page usernames and display names
- Public Circle names

The client requests results through `searchNexoraDirectory`. The callable requires authentication and accepts 2–40 characters. Results are capped per category.

## Privacy and moderation

The server excludes the viewer's own record, banned/suspended/seed profiles, accounts that block the viewer, and accounts blocked by the viewer. Private profiles are returned only when the viewer already follows that account. Public Circles exclude users listed in their banned-user array. Page records marked suspended are excluded.

The current search does not index private messages, private posts, closed Circles, or private events. It does not expose email addresses, phone numbers, private settings, wallet fields or moderation metadata.

## Current limitations

This is a first server-backed directory slice. Post text, hashtags, event names, business services and creator analytics are not yet included in server-side search. Ranking is prefix-based and bounded; cursor pagination and production relevance tuning remain future work. The local search fallback still searches content already loaded in the client.
