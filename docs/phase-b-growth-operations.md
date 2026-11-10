# Phase B growth systems: operations and release notes

## Referral programme

Referral issuance is intentionally disabled until the server-owned programme configuration and promotional NEX treasury are provisioned.

Create `referralProgramConfig/current` using an authorized administrative process with:

- `enabled`: boolean; keep false until funding and acceptance checks are complete.
- `rewardNex`: positive safe integer paid to the referrer after qualification.
- `maxSuccessfulReferrals`: positive safe integer cap per referrer.

The reward is transferred from `nexWallets/referral_promo_pool` using the existing balanced NEX ledger. The promotional account must already have sufficient `availableBalance`. Never enable the programme by directly editing a wallet balance or by allowing a client to set reward values. Fund the pool through an audited finance/treasury operation first.

Referral flow:
1. A signed-in user requests an opaque referral code. Firestore stores only its SHA-256 digest.
2. A newly created account (no older than seven days) claims the code once.
3. A trusted post-created Function checks for the invitee's verified email and first public-post action.
4. A Firestore transaction enforces the referrer cap, checks the funded pool, writes balanced ledger entries, and marks the attribution qualified. Replays cannot pay twice.

If configuration is missing, disabled, invalid, or underfunded, issuance or settlement fails closed. No automatic production provisioning or deployment is performed by this code change.

## Community challenges

Challenges are stored and mutated by trusted Functions. Clients cannot directly write challenge, participant, or contribution documents because Firestore retains default-deny access for these new collections.

A member joins before contributing. A public post containing the exact tag `#nxchallenge_<challengeId>` is recorded by the post-created trigger. The post ID is the contribution document ID, making retries idempotent. The challenge completes when its configured contribution target is reached or it expires.

## Public feed polls

Feed poll votes are now server-managed. Each authenticated account has one immutable vote per post, the selected option counts are updated transactionally, and the account's vote is restored on feed load. The Circle poll system remains separate and continues to use its existing membership and manager permissions.

## Numbered creator series

Creators can create a series in Creator Studio and attach only their own public posts. Episode numbers are assigned transactionally by the server. The post ID is the episode document ID, so the same post cannot be added twice to one series.

## Share cards and invitations

Post share cards are rendered locally in the browser as 1080 × 1350 PNG files. Post text is not sent to an external rendering service. Referral links carry an opaque code in the `ref` query parameter and are claimed only after authentication.

## Release gates

Before enabling referrals or launching the growth systems:
- Deploy the reviewed Functions to an isolated staging project.
- Seed a funded referral promo account using the approved ledger workflow.
- Run the referral, challenge and content-series emulator tests.
- Verify two-account signup, referral attribution, first public-post qualification and one-time NEX settlement in staging.
- Verify the social challenge join/post flow across two accounts and the numbered series episode order.
- Test share-card export and native share on mobile browsers.
- Deploy Functions and reviewed Firestore rules only after staging acceptance.
