# Nexora social UX patterns

This note records the research used as design guidance for the Signature Violet refinement. No external code or branding was imported.

## Adapted principles

- **Pixelfed:** favor relationship-first, minimally ranked discovery; keep audience and interaction controls explicit; separate short-lived updates from durable posts.
- **Mastodon:** make publishing visibility and content-warning choices explicit; support focused user-curated surfaces instead of treating one timeline as the only context.
- **Misskey:** keep audience scope separate from content sensitivity; use lightweight reactions and distinct labeled timelines with selective real-time updates.
- **Lemmy:** make community trust boundaries, rules, and moderation ownership legible; preserve reply context and offer clear space-level feed controls.
- **Owncast:** keep moderation close to messages, make operator controls visible, and treat read-only/participatory presentation modes as distinct capabilities.

These principles were applied conservatively to the existing Nexora architecture: the current live feed, search, inbox, notifications, communities, profiles, and mobile navigation were visually tightened without changing Firebase data models or claiming unsupported privacy/federation behavior.

## Sources

- https://github.com/pixelfed/pixelfed
- https://raw.githubusercontent.com/pixelfed/docs/main/spec/ActivityPub.md
- https://docs.joinmastodon.org/user/posting/
- https://docs.joinmastodon.org/user/network/
- https://misskey-hub.net/en/docs/for-users/features/note//
- https://misskey-hub.net/en/docs/for-users/features/timeline//
- https://join-lemmy.org/docs/introduction.html
- https://join-lemmy.org/docs/users/04-moderation.html
- https://owncast.online/docs/chat/moderation/
- https://owncast.online/docs/embed/
