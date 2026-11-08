# NEXORA NGN withdrawals: Paystack launch runbook

## Current implementation boundary

The Paystack adapter is server-side. It supports Nigerian bank lookup and account resolution, provider recipient creation, NEX reservation, transfer initiation, signed transfer webhooks and scheduled reconciliation. The creator-facing screen distinguishes test mode from live cash withdrawals.

**Do not announce or enable live NGN withdrawals until every live gate below has been evidenced.** A test-mode transfer is not a real bank settlement.

## 1. Create and verify the Paystack business integration

1. Use a Paystack business account eligible for Transfers. Paystack documents that transfer access requires a registered business, a valid recipient, an available transfer balance and any configured approval steps.
2. Complete Paystack's business verification and transfer activation in the Paystack Dashboard.
3. Confirm the business is approved to send NGN transfers and that the integration's NGN balance can fund the controlled test transfer plus provider fees.
4. Confirm the business has completed the applicable legal, tax, KYC/AML, sanctions and consumer-disclosure review for paying NEXORA creators.

Paystack references:
- https://paystack.com/docs/transfers/
- https://paystack.com/docs/transfers/how-transfers-work/
- https://paystack.com/docs/transfers/creating-transfer-recipients/

## 2. Provision credentials safely

Never paste secret keys into chat, source files, frontend environment variables, GitHub commits, screenshots or support tickets.

For a non-production Firebase project, provision Paystack **test** credentials:

```bash
firebase use <nexora-staging-project>
firebase functions:secrets:set PAYSTACK_SECRET_KEY
firebase functions:secrets:set PAYSTACK_WEBHOOK_SECRET
```

Enter the values at the secure CLI prompts. Use the Paystack test secret key (`sk_test_...`) and the webhook signing secret (`whsec_...`) from the matching test integration. Deploy the Functions after setting secrets:

```bash
firebase deploy --only functions
```

Use a separate Firebase project and separate Secret Manager values for production. Do not swap test and live keys in the same environment. The adapter rejects unknown key prefixes and never returns a secret to the client.

## 3. Configure the Paystack webhook

After deployment, set the Paystack webhook endpoint to:

```
https://us-central1-<firebase-project-id>.cloudfunctions.net/paystackPayoutWebhook
```

Configure transfer events:
- `transfer.success`
- `transfer.failed`
- `transfer.reversed`

Use the matching environment's webhook secret. The endpoint validates Paystack's timestamped `Paystack-Signature` HMAC against the original raw body (and supports the legacy `x-paystack-signature` during migration). It rejects invalid signatures and stale timestamped events. Keep the server clock synchronized.

Paystack reference: https://paystack.com/docs/payments/webhooks/

## 4. Verify and register creator beneficiaries

The creator:
1. Selects a Nigerian bank and enters a 10-digit account number.
2. NEXORA calls Paystack's Resolve Account Number endpoint.
3. The creator confirms the returned account-holder name.
4. NEXORA creates a Paystack `nuban` transfer recipient and stores only the provider recipient code, bank metadata, account name and last four account digits.

The raw account number is used only for the provider request and is not persisted in NEXORA. Email verification is required. If the creator changes bank details, create and verify a new provider recipient before replacing the old one. Finance must then review the exact provider beneficiary against the creator's external KYC/identity evidence, confirm the account-holder name matches, and record a non-sensitive evidence reference in the finance operations panel. That approval is bound to the exact recipient reference and becomes pending again if the beneficiary changes.

Paystack reference: https://paystack.com/docs/transfers/creating-transfer-recipients/

## 5. Approve the NEX-to-NGN policy

The conversion policy is intentionally not guessed or hard-coded. Finance must approve and document:
- The exact kobo-per-NEX rate and how it is funded.
- A conservative provider-fee reserve in kobo, in addition to the transfer principal.
- Minimum and maximum NEX withdrawal amounts.
- Whether the rate is fixed or time-bound, including when it expires.
- Provider fees, who bears them, and the displayed net amount.
- Refund/reversal treatment, creator disclosures and applicable tax/compliance obligations.

The finance-only `configureNgnPayoutPolicy` callable stores the approved integer rate, provider-fee reserve and limits. The finance operations panel exposes this policy and the beneficiary compliance review queue. It must first be configured in test mode. Never configure a rate based on an arbitrary display-currency preference or an unsupported FX quote.

## 6. Test the complete sandbox lifecycle

Use test credentials and test beneficiaries. Test all of the following:
- Bank directory retrieval and account resolution.
- Correct and mismatched account-holder confirmation.
- Recipient creation and repeat beneficiary setup.
- Valid withdrawal, insufficient NEX, below-minimum and above-maximum amounts.
- Duplicate idempotency key and concurrent requests.
- Transfer pending/OTP response and final success.
- Provider failure and reversal, ensuring the NEX reserve is restored exactly once.
- Duplicate, malformed, stale and invalid-signature webhooks.
- Webhook delivery retry and out-of-order events.
- Timeout after provider submission, with the NEX reserve held until reconciliation proves the outcome.
- Scheduled verification of pending transfers and exact reference/amount/currency matching.
- Provider-balance shortfall and provider API outage.

Paystack notes that test transfers simulate success; they do not prove a live bank credit. A green sandbox run is required but is not the final live-settlement sign-off.

## 7. Live activation gates

Live activation is rejected unless all of these are explicitly confirmed by finance:
- Paystack registered-business transfer eligibility is verified.
- The live NGN settlement account is funded and the available balance is checked.
- Compliance approval is recorded.
- The production webhook has delivered a valid signed event and has been verified end to end.
- A controlled live test transfer to an authorized company-owned/test beneficiary has completed and the receiving bank confirms the credit.
- The approved rate, fees, limits, refund/reversal and support procedures are published.

The finance-only policy callable requires these five live evidence flags, a positive provider-fee reserve, a non-sensitive evidence-bundle reference and explicit live settlement approval. These flags are attestations, not substitutes for retaining the supporting evidence and approvals. Each creator also needs a separate finance review of their current beneficiary and identity match.

## 8. Reconciliation and operations

The scheduled `reconcilePaystackCreatorPayouts` function checks pending, unknown and approval-waiting transfers every 15 minutes. Provider outcomes are applied idempotently. A timeout is treated as ambiguous: NEX stays reserved until Paystack confirms the transfer outcome. Never manually mark a payout successful based only on the initial API response.

Finance operations must review:
- Provider transfer reference and status.
- NEX reserved/debited amount and approved conversion rate.
- NGN amount in kobo and provider balance movement.
- Webhook event history and reconciliation result.
- Failed/reversed payouts and restored NEX.
- Unresolved or aging `submission_unknown` records.

## Completion definition

Mark **NGN WITHDRAWALS COMPLETE** only after:
1. Sandbox lifecycle tests pass.
2. Live credentials and production webhook are provisioned.
3. A controlled live transfer is confirmed credited by the receiving bank.
4. The provider webhook is signature-verified.
5. NEXORA reconciliation matches the transfer reference, NGN amount and NEX ledger reservation/debit.
6. Finance/compliance signs off and live policy activation is enabled.

Until then, the truthful status is **Paystack integration implemented; live withdrawals gated pending provider onboarding and verified settlement**.
