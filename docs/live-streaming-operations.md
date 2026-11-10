# NEXORA Live streaming operations

This document describes the real LiveKit-backed broadcast path and the checks required before calling NEXORA Live production-ready.

## Implemented application behavior

- A host can create one active live room at a time.
- Viewer admission and host presence are tracked by trusted Firebase callables.
- Hosts and approved guests can publish audio/video; ordinary viewers receive media only.
- Hosts can mute live chat, remove a viewer, or ban a viewer for that room.
- Ban/removal state is checked by the admission, chat and LiveKit-token paths. Moderation is saved before an active LiveKit participant is disconnected.
- Host and approved guest clients can share their screen where the browser/device supports screen capture.
- Live discovery ranks rooms using freshness, actual viewers, peak audience and chat activity. Gift count is deliberately a low-weight signal.
- Optional host-controlled recording and private replays use the separate GCS setup in [live-recordings-and-replays.md](./live-recordings-and-replays.md).

## Required server configuration

The server must have all of the following before a host can start a room:

- Firebase Functions secrets `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
- `LIVEKIT_URL` set to the LiveKit Cloud or self-hosted secure WebSocket URL (the code has a configured default endpoint, but production ownership and access must be verified).

Set secrets through the Firebase CLI in the explicitly selected project. Do not paste credentials into source control, app configuration, or chat.

```bash
firebase functions:secrets:set LIVEKIT_API_KEY
firebase functions:secrets:set LIVEKIT_API_SECRET
```

The start-room callable now fails closed if the required credentials or secure URL are missing. It does not create a room that appears live but cannot issue video credentials.

## Deployment scope

After verifying the Firebase project and environment, deploy only the required functions rather than running an unrestricted production deployment:

```bash
firebase deploy --only functions:startLiveSession,functions:endLiveSession,functions:joinLiveSession,functions:leaveLiveSession,functions:heartbeatLiveSession,functions:sendLiveChatMessage,functions:updateLiveSessionSettings,functions:requestLiveGuestAccess,functions:reviewLiveGuestAccess,functions:reconcileLiveSessionViewers,functions:getLiveKitToken,functions:moderateLiveParticipant
```

Recording functions have additional GCS secret, bucket and IAM requirements; follow the replay operations document before deploying or enabling them.

## Real-device acceptance checklist

Run these tests against the intended staging environment before production:

1. Sign in as a host on device/browser A and start a room with camera and microphone permissions.
2. Sign in as a different account on device/browser B and join as a viewer. Confirm that the viewer receives the host's live audio/video but cannot publish.
3. From the viewer account, request stage access. Approve it from the host and confirm the guest can publish. Deny another request and confirm that account remains receive-only.
4. Share the host screen, stop sharing from the browser's native control, and confirm the share track ends cleanly. Repeat as an approved guest.
5. Mute a viewer's chat and confirm the server rejects messages, not merely that the UI hides the input.
6. Ban a viewer and confirm they are removed from the room, cannot reconnect, cannot obtain a new video token, and cannot send chat. Unban and verify that a fresh join works.
7. Remove a viewer without banning them and verify that the viewer count decreases and that they can rejoin only if the host permits normal room access.
8. Close a viewer tab without leaving cleanly and confirm the heartbeat expiry reconciler corrects the viewer count.
9. End the room as host and verify that all clients receive the ended state and the room disappears from live discovery.
10. Repeat on supported Android and desktop browsers, including permission denial, camera unavailable, microphone unavailable, network interruption and reconnect cases.

## What CI does and does not prove

CI validates TypeScript, Functions compilation, unit tests, emulator security rules and production build artifacts. It does not prove that the production LiveKit project, Firebase secrets, network access, device permissions or actual media delivery work. Record the environment, browser/device, test accounts and result for every real-device test. Do not mark production Live as verified until a host and a separate viewer have completed a real broadcast successfully.
