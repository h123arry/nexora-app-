# Nexora Phase 8: Monetization and creator-economy foundation

## Current provider status

Nexora currently has **no configured payment provider, merchant account, provider SDK, hosted checkout adapter, webhook secret, or payout onboarding integration** in this repository. Checkout, paid entitlements, subscriptions, refunds, and payouts therefore remain disabled. The application must not claim that a payment occurred because a browser returned from a checkout URL or because a client wrote a status.

The implementation in this phase is a secure backend boundary, not a live payment integration. No sandbox or live payment transaction was executed.

## Architecture

- **Catalog and product policy:** `functions/src/monetizationPolicy.ts` defines stable product identifiers, integer minor-unit pricing, currency, billing interval, entitlements, availability, and product version. The initial catalog is intentionally unavailable until an actual provider adapter is implemented and configured.
- **Trusted monetization callables:** `functions/src/monetization.ts` exposes `getMonetizationCatalog`, `createCheckoutSession`, `getBillingSummary`, and `getFinanceOverview`. The catalog and billing summary are safe backend responses. Checkout fails closed with `failed-precondition`; it never creates a payment or grants access.
- **Client boundary:** `src/services/monetizationService.ts` contains the frontend callable wrappers. React components do not define prices or call privileged provider APIs.
- **Financial collections:** `financialTransactions`, `subscriptions`, `entitlements`, `checkoutAttempts`, `refundRequests`, `creatorEarnings`, `financialLedger`, `paymentWebhookFailures`, and `financeAuditEvents` are protected by `firestore.rules`. Clients can read only their own sanitized billing records where appropriate and cannot write financial state.
- **Creator dashboard:** the existing creator dashboard continues to show a truthful unavailable state. It does not calculate earnings from views, likes, clicks, or local counters.
- **Membership UI:** the existing profile membership destination now shows that provider-backed memberships are unavailable and contains no simulated subscribers, prices, receipts, or balances.

## Payment verification contract for the future adapter

A real adapter must be implemented for the selected provider before `providerConfigured` can become true. It must:

1. Create hosted checkout using a server-side product lookup.
2. Use a server-generated internal checkout ID and idempotency key.
3. Verify the provider’s signed webhook using the raw request body and provider-specific signature rules.
4. Match provider transaction ID, internal checkout ID, owner, product version, amount, and currency.
5. Persist the verified transaction before deriving an entitlement.
6. Process duplicate events idempotently and tolerate out-of-order lifecycle events.
7. Record failed payment, refund, reversal, dispute, and chargeback events without overwriting history.
8. Never store raw card details in Nexora.
9. Restrict return URLs to known Nexora origins.
10. Record provider failures without logging secrets or unrestricted provider payloads.

Until this adapter exists, no environment variable alone may activate checkout.

## Entitlements and subscription lifecycle

Entitlements must be derived from trusted `financialTransactions`, `subscriptions`, product definitions, and effective dates. Fields such as `isPremium`, `subscriptionActive`, arbitrary expiry timestamps, or client-provided prices are not authoritative. The policy helpers cover safe transaction transitions and reject unsupported transitions.

A future implementation must explicitly handle activation, renewal, cancellation-at-period-end, immediate cancellation where supported, failed renewal, grace period, expiry, upgrade, downgrade, refund, dispute, reversal, and administrative correction with an audit record.

## Ledger and currency rules

Authoritative amounts use integer minor units. Currency is stored alongside every amount and is never treated as interchangeable with another currency. Completed records are append-only: refunds, reversals, commission changes, and corrections are separate entries.

Nexora’s existing NEX/reputation concepts are not treated as fiat money or payment balances. No purchase, transfer, redemption, exchange-rate, or cash-conversion feature was activated in this phase. Any future redeemable balance would require a separate financial design, abuse controls, provider support, identity checks, and compliance review.

## Creator revenue accounting

`calculateRevenueShare` is a pure, unit-testable foundation using exact integer arithmetic and a versioned commission rule. It distinguishes gross amount, provider fee, tax, platform commission, and creator share. Creator earnings must only be created from verified transactions and must remain separate from estimated analytics, views, likes, or reach.

Payout execution is disabled. A future payout flow requires creator eligibility, account standing, identity/business verification where required, a verified payout destination, available-balance checks, idempotent requests, provider confirmation, status tracking, audit history, and reconciliation.

## Refunds and disputes

The policy layer rejects refunds for non-confirmed transactions and prevents refunding more than the original amount. No refund endpoint is exposed until a provider’s legitimate refund API and webhook lifecycle are implemented. A refund request is not a completed refund until the provider confirms it.

## Administration and least privilege

`getFinanceOverview` requires a finance-specific claim (`finance_admin`) or an explicitly allowed admin/founder role. It returns operational summaries without provider secrets. General moderators do not receive finance access automatically. The admin surface should call this protected function rather than read unrestricted financial collections.

## Required production configuration before activation

Before enabling real checkout, Nexora must select and configure a provider, complete merchant onboarding, add provider-specific server credentials through the project secret manager, configure HTTPS webhook routing, implement and test the provider adapter, define supported countries/currencies, publish terms and refund policy, complete required tax/compliance review, deploy rules and indexes, and run provider sandbox tests.

Required secret names should be provider-specific and documented only by name, for example `NEXORA_PAYMENT_SECRET`, `NEXORA_PAYMENT_WEBHOOK_SECRET`, and `NEXORA_PAYMENT_PUBLIC_KEY`. No values belong in source control or client bundles.

## Testing status

This phase adds pure policy tests for product availability, integer money validation, transaction transitions, refund eligibility, currency mismatch, and revenue sharing. Firestore rules tests must prove that clients cannot create or modify transactions, subscriptions, entitlements, ledgers, creator earnings, refunds, or webhook-failure records, while owner reads remain scoped correctly.

No live or sandbox payment integration was run because no provider is configured. That is an explicit limitation, not a successful payment test.
