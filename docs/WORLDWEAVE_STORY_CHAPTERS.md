# WorldWeave Story Chapters

## Purpose

Chapters let a WorldWeave tell a structured story without splitting contributors into separate experiences or breaking the canonical timeline. Examples include Before, During, After, Reflections, or chapters organized around stages of a shared event.

## Behavior

- Owners can create up to 30 chapters.
- Chapter titles are 2–60 characters; descriptions are optional and capped at 250 characters.
- Owners can rename chapters.
- Contributors can assign new moments to an existing chapter when posting.
- The timeline can be filtered to one chapter, unchaptered moments, or the full story.
- Each moment remains in the original chronological timeline and carries an optional `chapterId`.
- Chapters are ordered by a stable server-assigned position; no client-supplied order is trusted.
- Chapter creation and edits appear in WorldWeave activity history.

## Persistence and authorization

- Chapter path: `worldWeaves/{weaveId}/chapters/{chapterId}`
- Chapter writes use trusted callable functions and require the current owner.
- Current members can read chapters in private experiences; signed-in users can read chapters in public experiences.
- Moment creation rules accept an optional `chapterId` only when the corresponding chapter document exists under the same WorldWeave.
- Clients cannot create, edit, reorder, or delete chapter documents directly.

## Limits and next improvements

- Maximum 30 chapters per experience.
- This slice supports create and rename; archive, delete, and reorder need a separate lifecycle design so existing moment assignments are never orphaned.
- Timeline filtering operates on the currently loaded moment page; older moments can still be loaded through the existing pagination flow.
- Chapter covers, recap generation, and chapter-specific contributor permissions remain future work.

## Verification

- Functions emulator tests cover ordering, owner-only create/rename, invalid titles, and the 30-chapter ceiling.
- Firestore rules tests cover member privacy, client write denial, valid chapter assignment, and nonexistent chapter rejection.
- Existing moments without a chapter remain fully compatible.
