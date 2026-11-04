# NEXORA business services and Page channels

## Business service catalogue

Business Pages may publish service records under `pages/{pageId}/services/{serviceId}` through the trusted `publishBusinessServiceListing` callable. Only the Page owner may create or change a listing. A listing contains:

- `name` and `description`
- `durationMinutes`
- Optional `priceMinor` and ISO currency code
- `status` (`active` or `paused`)
- `bookable`

Active, bookable services are publicly readable. Paused listings are readable only by the owning Page account. Clients cannot directly create, edit or delete service records.

## Booking requests

Customers use `createBusinessBookingRequest` to submit a requested date/time and optional note. The callable:

- Requires an authenticated customer and an active bookable service on a Business Page
- Rejects the Page owner booking their own service
- Requires a future date within 180 days
- Uses a customer-scoped idempotency key to prevent duplicate retries
- Limits each customer to ten new booking requests per rolling hour
- Creates a `pending` request; it does not claim the appointment is confirmed

Booking records live in `pageBookings/{bookingId}`. Only the customer and owning Page account may read them. All writes are callable-only. The Page owner resolves a pending request with `respondToBusinessBookingRequest`, accepting or declining it. A resolved request cannot be silently changed to the opposite state.

The Page profile panel exposes service publishing, pause/reactivation, booking requests, customer requests and owner decisions.

## Official Page channels

A Page owner publishes short broadcast updates with `publishPageChannelUpdate`. Updates are stored under `pages/{pageId}/channelUpdates/{updateId}`. The owner and accounts following the Page can read updates; clients cannot write or delete channel records directly. The owner can remove an update through `deletePageChannelUpdate`.

Following a Page currently provides free access to its official channel. This is not a paid creator subscription.

## Payment and settlement boundary

NEXORA's payment-provider adapter is not configured. No service listing collects money, no booking request takes a deposit, and no paid creator subscription or entitlement is activated by these features. Do not enable checkout or promise paid access until a provider adapter, signed webhook verification, settlement/reconciliation, refunds and production secrets have been configured and tested.

## Deployment and verification

Deploy the new Firebase callable exports and the updated Firestore rules/indexes before expecting these features to work in production. Emulator tests cover ownership, request idempotency, rate limits, service state, channel publishing and read permissions. A passing CI run does not mean Firebase Functions have been deployed.
