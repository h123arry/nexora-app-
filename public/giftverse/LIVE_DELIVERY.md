# GIFTVERSE live delivery contract

The live renderer subscribes to the server-owned `giftDeliveryEvents` collection, filtered by a live session ID. Only the trusted `sendNexGift` callable can create delivery events. A live session must exist at `liveSessions/{sessionId}` with `status: "live"` and `creatorId` (or `hostId`) matching the gift recipient.

## Delivery behavior

- The callable re-reads the canonical catalogue price and never trusts a client price.
- A gift is debited once into the GIFTVERSE escrow wallet using a balanced NEX ledger transfer.
- The creator receives a pending earnings record; it is not spendable wallet credit and cannot be withdrawn until creator settlement is implemented.
- Live gifts create an immutable event consumed by `GiftLiveOverlay`.
- Every gift is also recorded in the creator's static gallery. Gallery entries never replay the live animation.
- Idempotency keys make retries safe. A repeated key with a different payload is rejected.
- Live events are readable by viewers but cannot be created or changed by clients.

## Integration boundary

The current `LiveView` is a local demonstration, not a production broadcast/session service. A production broadcaster must create and maintain the authoritative `liveSessions/{sessionId}` document and pass that exact session ID to the viewer overlay and gift sender. Until that exists, live gifts fail closed rather than pretending a local UI state is a real broadcast.
