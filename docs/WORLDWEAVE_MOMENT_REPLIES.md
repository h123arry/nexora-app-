# WorldWeave Moment Replies

## Behavior

Current contributors can open a conversation thread beneath a moment and add text replies. The owner or reply author can remove a reply. Replies are separate records and do not alter the original moment text or chronological position.

## Persistence

- Reply path: `worldWeaves/{weaveId}/moments/{momentId}/replies/{replyId}`
- Each reply stores its author UID, server-resolved display name/username, text, and server timestamp.
- The moment stores a server-maintained `replyCount`.
- Create and delete operations update the reply record and aggregate count in one transaction.
- Each moment is capped at 500 replies; each reply is limited to 1,000 characters.
- Client-provided author identity and counts are ignored.

## Privacy and authorization

- Only current contributors and the owner can read replies.
- Only current contributors can create replies.
- A reply author or the owner can delete a reply.
- Removed contributors lose read and write access through the existing membership rules.
- Clients cannot create, edit, or delete reply documents or modify `replyCount` directly.

## Client experience

- A moment has an expandable reply thread.
- Only one thread is subscribed at a time, avoiding a listener for every moment in the timeline.
- The client loads the latest 50 replies in chronological display order.
- Reply submission has explicit busy, success, and error states.
- Authors and owners see removal controls.

## Verification

- Functions emulator tests cover attribution, create/delete counts, author/owner authorization, invalid content, and the 500-reply ceiling.
- Firestore rules tests cover member-only reads, unrelated-user denial, client write denial, and count tampering.
- Full CI is required before merge.
