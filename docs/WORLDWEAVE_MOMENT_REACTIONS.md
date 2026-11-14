# WorldWeave Moment Reactions

## Behavior

Contributors can react to an individual moment with one of four reactions:
- Heart
- Applause
- Insight
- Laugh

Each contributor has at most one active reaction per moment. Selecting the same reaction again removes it; selecting a different reaction switches it.

## Persistence model

- User reaction: `worldWeaves/{weaveId}/moments/{momentId}/reactions/{uid}`
- Aggregate: `reactionCounts` on the moment document.
- Writes are performed by the trusted `setWorldWeaveMomentReaction` callable only.
- The callable checks authentication, valid IDs, moment existence, and current membership.
- Reaction document and aggregate counts update in one Firestore transaction.
- Negative counts are prevented; duplicate clicks are idempotent through the per-user document.

## Privacy

- Only current contributors and the owner can read reaction records.
- Clients cannot create, update, or delete reaction records directly.
- Public visitors can view public moments but cannot react until they join.
- The aggregate is stored on the moment so the existing live timeline subscription updates counts without one listener per reaction.

## Client experience

- Reaction controls appear for current contributors only.
- Counts update through the existing live moment subscription.
- No client-supplied aggregate is trusted.
- Reaction state is not represented as an optimistic local count; Firestore remains the source of truth.

## Verification

- Callable emulator tests cover toggle on/off, switching reaction type, unique per-user records, non-member rejection, unsupported values, and missing moments.
- Firestore rules tests prove current-member read access, unrelated-user denial, and client write denial.
- Full CI is required before merge.
