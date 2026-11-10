# NEXORA Live recordings and replays

NEXORA Live recordings are optional host-controlled MP4 captures. LiveKit Egress writes directly to a **private Google Cloud Storage bucket in europe-west1**. The browser never receives the bucket credentials. Playback is issued by a callable function as a two-hour V4 signed URL after the backend verifies that the requester hosted or attended the room.

## Infrastructure target

- Firebase / Google Cloud project: `nexora-prod-voiceharrison`
- Bucket location: `europe-west1`
- Suggested globally-unique bucket: `nexora-live-replays-nexora-prod-voiceharrison`
- Object prefix: `nexora-live/{sessionId}/`
- Access: uniform bucket-level access and public access prevention enabled
- Format: MP4 (LiveKit room-composite Egress)

The bucket name is a parameter, not hardcoded in application logic.

## One-time Google Cloud setup

Run these commands from an authenticated Google Cloud CLI session with project-admin permissions. Confirm the active project before creating resources.

```bash
gcloud config set project nexora-prod-voiceharrison
gcloud services enable storage.googleapis.com iam.googleapis.com iamcredentials.googleapis.com

export REPLAY_BUCKET=nexora-live-replays-nexora-prod-voiceharrison
export EGRESS_SA=nexora-live-egress-writer@nexora-prod-voiceharrison.iam.gserviceaccount.com

gcloud storage buckets create gs://$REPLAY_BUCKET \
  --location=europe-west1 \
  --uniform-bucket-level-access \
  --public-access-prevention

gcloud iam service-accounts create nexora-live-egress-writer \
  --display-name="NEXORA Live recording writer"

gcloud storage buckets add-iam-policy-binding gs://$REPLAY_BUCKET \
  --member="serviceAccount:$EGRESS_SA" \
  --role="roles/storage.objectCreator"
```

Create a key for the Egress writer service account in a secure local directory, outside the repository. Never commit or upload the key to GitHub.

```bash
gcloud iam service-accounts keys create "$HOME/nexora-live-egress-writer.json" \
  --iam-account="$EGRESS_SA"
```

Set the Functions secret interactively and securely. Paste the complete JSON key content when prompted; do not put it in a shell command, source file, issue, or chat.

```bash
firebase functions:secrets:set LIVE_REPLAY_GCS_CREDENTIALS \
  --project nexora-prod-voiceharrison
```

Set the non-secret bucket parameter in `functions/.env.nexora-prod-voiceharrison`:

```dotenv
LIVE_REPLAY_GCS_BUCKET=nexora-live-replays-nexora-prod-voiceharrison
```

The Firebase Functions runtime identity also needs object-read access to issue signed playback URLs. Determine the runtime service account configured for the deployed Functions (do not assume it if the project has a custom identity), then grant it bucket-level object viewer access:

```bash
export FUNCTIONS_RUNTIME_SA="REPLACE_WITH_DEPLOYED_FUNCTIONS_RUNTIME_SERVICE_ACCOUNT"
gcloud storage buckets add-iam-policy-binding gs://$REPLAY_BUCKET \
  --member="serviceAccount:$FUNCTIONS_RUNTIME_SA" \
  --role="roles/storage.objectViewer"

gcloud iam service-accounts add-iam-policy-binding "$FUNCTIONS_RUNTIME_SA" \
  --member="serviceAccount:$FUNCTIONS_RUNTIME_SA" \
  --role="roles/iam.serviceAccountTokenCreator"
```

The second binding allows the Functions runtime identity to sign V4 URLs as itself. Keep the Egress writer and Functions runtime identities separate: Egress can create objects; Functions can read objects and sign short-lived links.

## Deploy

After the bucket, secret, parameter and IAM bindings are in place, deploy the recording functions and the room lifecycle functions that stop recordings on room end or host timeout:

```bash
firebase deploy --only functions:startLiveRecording,functions:stopLiveRecording,functions:getLiveReplayPlayback,functions:endLiveSession,functions:reconcileLiveSessionViewers --project nexora-prod-voiceharrison
```

If Firebase prompts for `LIVE_REPLAY_GCS_BUCKET`, enter the bucket name above. The deploy command must run from the repository root with the project's existing production environment configuration.

## Runtime behavior and safeguards

- Only the authenticated host can start or stop a recording.
- Concurrent start requests are reserved transactionally to avoid duplicate Egress jobs.
- The host can start recording while a room is live; ending a room or expiring the host lease requests Egress stop.
- Replays are not public bucket objects. Only the host or a user with a server-created attendance record can request playback.
- Signed playback URLs expire after two hours to support long-form replay viewing while remaining time-limited.
- Replay object paths are restricted to the `nexora-live/` prefix.
- Egress failures are recorded on the live-session document; no fake replay is generated.
- The service-account key is stored as a Firebase Functions secret and is passed to LiveKit Egress only from the server.

## Operational verification checklist

1. Verify the bucket is in `europe-west1`, uniform access is enabled, and public access prevention is enforced.
2. Verify the Egress writer can create objects but cannot list or read the bucket.
3. Verify the Functions runtime identity can read objects and sign URLs.
4. Start a staging live room, start recording, stop recording, and confirm an MP4 object appears under `nexora-live/{sessionId}/`.
5. Confirm a host and an attendee can obtain a five-minute playback URL.
6. Confirm a non-attendee receives permission denied and direct unauthenticated bucket access is denied.
7. Confirm ending a room and host-heartbeat expiry both stop an active Egress job.

**Deployment status:** repository implementation and CI are separate from cloud provisioning. Do not treat recording as production-ready until the bucket, secret, IAM grants, Functions deployment, and end-to-end verification above are complete.
