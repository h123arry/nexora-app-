# GIFTVERSE creator earnings and revenue sharing

Phase 5.5 establishes the trusted settlement layer on top of the existing GIFTVERSE delivery and NEX ledger.

## Revenue policy

- Policy version: `gift-revenue-v1`
- Creator share: 70% (7,000 basis points)
- NEXORA platform share: 30% (3,000 basis points)
- Split arithmetic uses integer NEX units. The creator receives the 70% share rounded to the nearest whole NEX unit (half-up); the platform receives the remainder. BigInt arithmetic avoids intermediate precision loss, and no fractional or unallocated NEX is created.
- The policy version and both shares are persisted on every settlement. Changing the policy later must create a new version; historical settlements are never recalculated.

## Gift lifecycle

1. `sendNexGift` remains the only gift purchase entry point. It validates the server catalogue, debits the sender and credits `gift_escrow` in the same Firestore transaction.
2. The delivery transaction creates a `creatorEarnings` record in `pending_review`. No creator balance is credited at delivery time.
3. A finance-claim protected `settleGiftCreatorEarning` callable performs an atomic settlement from escrow to the creator's NEX wallet and the platform treasury. It writes balanced ledger entries, wallet history, a settlement record and the versioned split.
4. Repeated settlement requests are idempotent. The same gift cannot be settled twice.
5. `getCreatorEarningsSnapshot` exposes only the authenticated creator's own earnings and aggregates.

## Important financial boundary

NEX is the internal NEXORA wallet unit. This phase settles creator earnings in NEX; it does not claim to convert NEX into NGN or pay a bank account. External cash withdrawals remain disabled until a real payment/payout provider, verified beneficiary workflow, compliance checks, signed webhook verification, reconciliation and operational approval are implemented. No payout is reported as successful without a provider-confirmed settlement.

## Security and operations

- Clients cannot write creator earnings, settlements, ledger entries or wallet balances directly.
- Settlement requires a trusted finance administrator claim.
- Firestore transactions check escrow funds and all wallet projections before posting.
- All postings use immutable double-entry records and deterministic idempotency references.
- Pending-review earnings are not spendable. Only successful settlement moves the creator share into their existing NEX wallet.
