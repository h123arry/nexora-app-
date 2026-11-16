# Rate-limit record retention

Transient rate-limit documents must not accumulate indefinitely. The Firestore index configuration enables TTL on the `expiresAt` timestamp for:

- `payoutOtpRateLimits`
- `ngnBankLookupRateLimits`
- `chatMediaRateLimits`
- `chatMediaPlaybackRateLimits`

The bank-lookup limiter now writes `expiresAt` as a Firestore-compatible Date/Timestamp rather than a millisecond number. The other three collections already write Date/Timestamp values.

TTL is asynchronous cleanup, not a real-time security boundary. Expired documents can remain visible until Firestore processes the deletion; Firebase documents that TTL deletion is typically completed within 24 hours. Rate-limit decisions must continue to use the window counters and timestamps, never the assumption that TTL already removed a record.

The field overrides disable unnecessary single-field indexes on these expiry-only fields. The repository test validates that all four TTL policies remain present.

Deploying `firestore.indexes.json` applies the TTL configuration to the selected Firebase project. This PR changes repository configuration only. It does not deploy indexes or alter the production project; staging verification and explicit owner approval are required before any deployment.
