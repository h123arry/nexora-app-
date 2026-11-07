# NEXORA media processing worker

This Cloud Run service consumes Cloud Storage object-finalized events delivered by Eventarc. It validates the owner-scoped upload path and metadata, probes the original with ffprobe, creates bounded 360p/720p/1080p MP4 renditions and HLS VOD playlists, extracts a poster frame, uploads immutable outputs, and advances the matching `mediaAssets/{mediaId}` record to `ready` only when the processing token still matches.

## Required deployment configuration

- Cloud Run service: `nexora-media-worker`
- Runtime: Node.js 22 container in this directory
- Environment: `MEDIA_BUCKET` set to the exact private Firebase Storage bucket
- Service identity: least-privilege read on source objects, create on `processed/**`, and Firestore read/write on `mediaAssets`
- Eventarc trigger: the same bucket, event type `google.cloud.storage.object.v1.finalized`, destination Cloud Run service, authenticated service identity with `roles/run.invoker`
- Cloud Run ingress should accept Eventarc traffic only; do not expose an unauthenticated public endpoint.
- Set request timeout and memory to accommodate the largest permitted input; begin with 2 vCPU / 4 GiB and a 900-second request timeout, then load-test before increasing limits.

Deploy from this directory after enabling Cloud Run, Eventarc, Cloud Build, Artifact Registry, and Eventarc delivery APIs. Configure the Firebase Storage bucket's location consistently with the Eventarc trigger.

## Delivery and security notes

The worker is idempotent across duplicate events: a Firestore transaction claims the asset with a unique processing token, and the final ready transition checks that token and owner again. Failed work records a bounded failure category and can be retried by redelivery or an operator retry. Source objects are never overwritten. Generated objects use generation-scoped immutable paths and long-lived immutable cache headers.

The worker does not make the source bucket public. HLS and MP4 outputs inherit the bucket's access controls. A production CDN must use a private origin with signed delivery (Cloud CDN signed URLs/cookies or an equivalent authenticated CDN). Do not grant `allUsers` access to the Firebase bucket to make playback work. Provision the private CDN origin and signed URL key through the infrastructure deployment, then expose signed playback URLs through an authenticated server endpoint.

## Validation

Use a dedicated staging bucket and staging Firestore project. Upload a real short MP4 through the app, wait for Eventarc delivery, then verify the `ready` state, ffprobe metadata, poster, all generated MP4/HLS objects, and playback from a second signed-in account. Repeat delivery of the same CloudEvent and verify that no second processing run overwrites the ready state. Test malformed media, oversize media, retry after worker failure, and cleanup of abandoned processing records.

No live deployment is implied by adding this service to source control.
