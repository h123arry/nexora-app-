# NEXORA LiveKit transport setup

The live-room transport code uses LiveKit Cloud for WebRTC media. The browser receives only a short-lived participant token. The LiveKit API secret is used only inside Firebase Functions.

## Required Firebase configuration

Use the NEXORA production Firebase project only after staging validation and owner approval.

1. In a trusted terminal, select the intended Firebase project:
   `firebase use nexora-prod-voiceharrison`
2. Store both LiveKit credentials as Firebase Functions secrets:
   `firebase functions:secrets:set LIVEKIT_API_KEY`
   `firebase functions:secrets:set LIVEKIT_API_SECRET`
3. Configure the non-secret server URL in the Functions environment file for the selected project:
   `LIVEKIT_URL=wss://your-project.livekit.cloud`

Do not put the API secret in Vite variables, frontend code, source control, screenshots, or chat. Do not use the LiveKit development token server for production.

## Deploy and verify

Deploy the token issuer and live-room functions after setting the secrets and URL:

```bash
firebase deploy --only functions:getLiveKitToken,functions:startLiveSession,functions:endLiveSession,functions:joinLiveSession,functions:leaveLiveSession,functions:heartbeatLiveSession,functions:sendLiveChatMessage,functions:reconcileLiveSessionViewers
```

Deploy Firestore rules, indexes and TTL configuration using the reviewed release procedure. Verify that the callable is deployed in the same region used by the NEXORA client Functions SDK.

## Acceptance test

- Sign in as a host, start a room, and grant camera/microphone permissions.
- Sign in as a second account on another device and join the room.
- Confirm the viewer sees the host's live video and hears audio.
- Confirm the viewer cannot publish audio or video.
- Confirm camera/microphone toggles, leave/end, reconnect, permission denial and network handoff.
- Confirm a suspended/restricted host cannot obtain a publish token and a non-member cannot obtain a room token.
- Inspect browser bundles and logs to confirm no API secret is present.

The application UI and token issuer are implemented in this branch. They are not production-live until the secrets are configured, Functions are deployed, and a two-device broadcast test passes.
