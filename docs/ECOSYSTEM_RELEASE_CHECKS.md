# NEXORA ecosystem release checks

Run these from the repository root before staging a release:

```bash
npm ci
npm ci --prefix functions
npm run lint
npm run functions:build
npm run test:unit
npm run test:auth
npm run test:rules
npm run test:storage
npm run test:migration
npm run test:engagement
npm run test:voh-security
npm run build
npm run validate:deployment
```

The engagement emulator suite includes Circle invitations, business service catalogue ownership, booking request lifecycle and rate limits, privacy-aware directory search, and official Page channel publishing.

Before production rollout:

1. Deploy the matching Firestore rules and composite indexes.
2. Deploy the Firebase Functions exports for business services, bookings, directory search and Page channel updates.
3. Verify the deployed Functions are using the owner-controlled NEXORA Production Firebase project and intended Firestore database.
4. Run two-account tests for customer, Page owner, Page follower, non-follower and Circle member access.
5. Verify booking requests remain pending until the business explicitly accepts them.
6. Verify no payment is collected and no paid entitlement is granted while the provider adapter is disabled.
7. Test inbox preference synchronisation on two separately authenticated devices.
8. Record latency, error rate, notification delivery and abuse-response results from staging.

CI passing verifies the commit's automated checks. It does not deploy Firebase resources or prove production scale, real-device usability or payment settlement.
