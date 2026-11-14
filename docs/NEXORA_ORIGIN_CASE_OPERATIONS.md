# NEXORA Origin case operations

## Creator correction workflow
Attribution correction cases are private Firestore records. The requester and attributed source creator can list their own cases through the authenticated Origin callable. Only the derivative owner can open a case; only the attributed source creator can accept or reject an open request; only the requester can dispute a decided request.

## Notifications
A trusted Firestore transition handler delivers durable inbox notifications to the relevant participant for request, response, dispute, and final-review transitions. Notification IDs are deterministic per case, state, recipient, and event kind, so retries do not create duplicate inbox items. Existing push delivery consumes these inbox records subject to each account's push preference.

## Staff dispute review
The dispute queue and final-decision callable require moderator/admin/founder custom claims, matching the existing moderation role contract. Queue results are bounded to 100 records and expose case metadata only. A reviewer must submit a reasoned decision (upheld or overturned); the case transition and audit event are committed atomically. Client access to the case collection remains default-deny.

## Limitations
This is the trusted backend operations layer. A polished creator inbox and staff dashboard surface, full emulator-driven callable authorization tests, and an operational moderation policy/runbook remain separate acceptance items. The workflow does not change immutable lineage history and does not establish legal ownership of media.
