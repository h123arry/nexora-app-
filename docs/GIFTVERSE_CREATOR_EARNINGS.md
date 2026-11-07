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

# Phases 5.6–5.10: creator economy expansion

## 5.6 — payout infrastructure readiness

- Creator payout readiness is exposed by getCreatorPayoutReadiness.
- A trusted finance administrator may register a provider-issued Paystack recipient token after completing identity and bank verification outside NEXORA. Raw account numbers are never accepted or stored by this flow.
- requestCreatorPayout validates the requested NEX amount, verified beneficiary status and available balance. It fails closed while provider integration, a reviewed NEX/NGN conversion policy and provider settlement funding are unavailable. It does not debit or reserve wallet funds and never reports a payout as sent.
- Cash withdrawal activation still requires Paystack secret provisioning, provider balance monitoring, idempotent transfer creation, signed webhook verification, beneficiary lifecycle controls, reconciliation, fraud/compliance approval and operational testing in a provider sandbox before production.
- No live payout credential or exchange rate was supplied in this repository task, so real bank transfer execution remains intentionally disabled.

## 5.7 — gifting fraud intelligence

- Every trusted gift delivery now calculates a deterministic risk score from recent sender velocity, recent spend, gift value, account age and account restriction state.
- The score and reason codes are attached to the creator earning record and an immutable-by-client giftRiskSignals record.
- Low, review and high tiers are used for prioritising human review. A score is not a finding of fraud and does not automatically reverse a gift, freeze an account or confiscate NEX.
- Finance administrators can clear or escalate a signal with a required review note. Every decision writes a separate audit event.
- Risk signals do not replace refunds, chargebacks or formal moderation workflows.

## 5.8 — creator financial intelligence

- getCreatorGiftAnalytics aggregates server-created creator earning records for 7–90 day windows.
- The Creator Studio shows verified 30-day gift gross, settled creator share and gift units, plus the available daily series.
- Analytics are in NEX and only include records available in the trusted gift earnings collection. The bounded result is marked when truncated.
- Forecasting is deliberately not presented as fact; it needs a sufficiently long verified history and a documented model before it is exposed.

## 5.9 — live gift competitions

- Finance administrators can schedule a competition against an existing live session, for up to seven days.
- Real gift deliveries made in that session and within the competition window are attributed to the competition in the same trusted delivery transaction.
- A server-derived leaderboard ranks creators by recorded gift NEX volume. It is provisional and does not create a prize pool or promise a cash reward.
- Competition contribution records are server-managed. Clients cannot manufacture scores or edit competition outcomes.

## 5.10 — global creator economy foundation

- Creators can choose NGN, USD, GBP, EUR, GHS, KES, ZAR, CAD or AUD as a display preference.
- This is a presentation preference only. NEX wallet accounting remains NEX; no unsupported FX quote, currency conversion, tax treatment or cross-border payout is fabricated.
- International settlement requires per-country provider coverage, beneficiary/KYC verification, local regulatory review, transparent exchange-rate quotes, fee disclosure and payout reconciliation before a corridor can be enabled.

## Collections and access

- giftRiskSignals, giftRiskReviewAudit, creatorPayoutBeneficiaries, creatorPayoutAuditEvents, giftCompetitions and giftCompetitionContributions are server-managed.
- creatorPayoutRequests is owner-readable but server-write-only. The current fail-closed payout endpoint does not create requests until the provider and rate are operational.
- Firestore composite indexes support sender velocity, creator reporting, active competition attribution and risk review.
- Callable authorization is checked server-side; UI visibility is not treated as authorization.
