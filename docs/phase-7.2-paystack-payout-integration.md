# Phase 7.2: Paystack creator payout integration

## Scope of this tranche

This tranche extends the existing GIFTVERSE payout foundation with a server-only Paystack NGN integration. It does not enable withdrawals or claim a bank payout has occurred.

### Implemented in source

- A Paystack adapter for the Nigerian bank directory, account-number resolution, and NUBAN transfer-recipient creation.
- Creator-authenticated callable functions for listing supported NGN banks and registering a verified bank-account destination.
- Bank account details are sent directly to Paystack over TLS. NEXORA persists only the provider recipient code, account name, bank code/name, and last four account digits; the full account number is not stored.
- New beneficiary registrations remain `pending`. Paystack account resolution confirms bank account details, not the creator's legal identity, beneficial ownership, KYC/AML status, or payout eligibility.
- Verified email or phone authentication is required before a creator can submit bank details.
- A signed Paystack transfer webhook receiver supports the current timestamped `Paystack-Signature` format and the legacy `x-paystack-signature` format. It checks the raw body, enforces the 300-second timestamp window for timestamped signatures, uses HMAC-SHA512 and constant-time digest comparison, and stores transfer events in an idempotent inbox. It does not mark a withdrawal paid.
- Provider secrets are declared as Firebase Functions secrets and are never exposed to the browser.

### Required secret configuration

Set these in the isolated staging Functions secret manager before exercising the integration:

- `PAYSTACK_SECRET_KEY`: Paystack test secret key for staging; live secret key only for a separately approved production setup.
- `PAYSTACK_WEBHOOK_SECRET`: the webhook signing secret (`whsec_`) for the same Paystack environment.

Never commit either secret or paste it into source code, browser configuration, chat, or CI logs. Configure the webhook URL in the matching Paystack dashboard after deploying the staging Functions endpoint.

### Still blocked before any cash withdrawal

1. Owner-controlled Paystack merchant account activation and transfer capability approval.
2. Staging secrets, bank account test cases, webhook registration, and signed test delivery evidence.
3. Documented creator identity/KYC/AML, sanctions and fraud checks, beneficiary ownership review, and change-of-bank cooling-off controls.
4. An approved NEX-to-NGN conversion policy with a transparent quote, rate source, rounding, fees, minimum/maximums, expiry, and treasury funding controls.
5. A durable withdrawal request state machine that reserves NEX atomically, creates one provider transfer with a deterministic idempotency reference, and handles pending/success/failed/reversed outcomes without double debit or double refund.
6. Reconciliation against Paystack transfer verification and settlement/balance reports, including exception queues and operator audit.
7. Finance approval, operational limits, sandbox tests for success/failure/reversal/duplicate/out-of-order events, and production approval.

The existing `requestCreatorPayout` remains fail-closed. The existing provider configuration flag remains false. Do not change either until the conversion policy, reserve/release ledger, provider transfer workflow, reconciliation and compliance gates are implemented and verified.

## Provider behavior references

- [Paystack bank-account recipient creation](https://paystack.com/docs/transfers/creating-transfer-recipients/)
- [Paystack single transfers](https://paystack.com/docs/transfers/single-transfers/)
- [Paystack transfer API](https://paystack.com/docs/api/transfer/)
- [Paystack webhook signature verification](https://paystack.com/docs/payments/webhooks/)
