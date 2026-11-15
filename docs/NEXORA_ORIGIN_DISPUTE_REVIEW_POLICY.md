# NEXORA Origin — Attribution Dispute Review Policy

**Status:** Operational baseline  
**Applies to:** Staff reviewers handling NEXORA Origin attribution disputes

## 1. What this process decides

This workflow reviews whether a recorded remix-attribution presentation or creator response should stand or be overturned. It is not a court, copyright tribunal, ownership registry, or truth-verification service. A C2PA credential, upload hash, permission snapshot, or lineage record is evidence about a technical record and its history; none independently proves who owns rights or whether depicted events are true.

## 2. Reviewer independence

- A reviewer must hold an authorized server-issued moderator, senior-moderator, admin, or founder claim.
- Neither the derivative creator/requester nor the attributed source creator may review or decide the case, even if that account also has a moderator claim.
- If a reviewer has a personal, financial, organizational, or prior moderation conflict, they must recuse and ask another authorized reviewer to take the case.
- The backend enforces the participant conflict-of-interest rule. UI visibility is not authorization.

## 3. Evidence and review sequence

1. Read the original correction reason, source creator response, and dispute explanation.
2. Inspect only the platform records available through the restricted Origin case and lineage tools: derivative owner, source asset reference, recorded attribution snapshot, permission basis, and case transition history.
3. Check whether the media-to-post binding, source creator identity, public-source access decision, and permission snapshot were recorded consistently at the time of remix.
4. Distinguish a correction to attribution presentation from a claim of copyright ownership, consent, impersonation, or factual falsity. Refer those separate claims to the relevant moderation/legal process.
5. Record a reasoned outcome of at least 20 characters and no more than 1,500 characters.

## 4. Outcomes

- **Uphold:** The source creator's accepted/rejected correction response remains the final platform decision for this case.
- **Overturn:** The source creator's response is set aside as the final platform decision for this case.
- The outcome and reviewer note are recorded in the case and a separate audit event. The immutable lineage event is not edited by this action.
- Do not issue a strike, account penalty, ranking change, creator payout adjustment, public warning, or ownership badge solely from this workflow.

## 5. Privacy and communications

- Case details are private to the requester, attributed source creator, and authorized reviewers.
- In-app notifications disclose only that a case transition occurred; they do not include dispute text or private media URLs.
- Evidence attachments are not currently supported. Do not request identity documents, private media, passwords, or sensitive personal information through direct messages or informal channels.
- If the available platform record is insufficient, leave the matter unresolved and escalate through the established internal safety/legal process rather than inventing a finding.

## 6. Audit, appeals and retention

- Every final decision records the reviewer UID, outcome, note, and server timestamp in a separate audit event.
- The case remains available to both creators in their private Origin inbox; notifications are delivered to both participants on final resolution.
- A final decision does not silently rewrite provenance. Any future correction to lineage must use a separately reviewed, versioned correction mechanism.
- Reopen or further appeal requires a separately authorized operational process; the current callable intentionally allows only one final decision per disputed case.

## 7. Release controls

- This policy is an operational baseline, not legal advice or a substitute for jurisdiction-specific rights procedures.
- Private-account remix remains disabled until an authoritative accepted-follower model and its emulator tests are implemented.
- No public "verified" credential label is permitted until the production trust-anchor list is owner-approved and trusted-fixture tests pass.
- Production/staging device acceptance and staff training must be recorded before enabling the workflow broadly.
