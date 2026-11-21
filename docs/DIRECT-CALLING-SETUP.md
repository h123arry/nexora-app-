# NEXORA direct calling setup

NEXORA direct voice and video calls reuse the existing LiveKit Cloud transport. Calls are private two-person rooms; the browser receives a short-lived room token only after the invited account accepts. The LiveKit API secret remains in Firebase Functions secrets.

## Required configuration

Direct calling uses the same server-side credentials and URL as NEXORA Live:

- Firebase Functions secret: `LIVEKIT_API_KEY`
- Firebase Functions secret: `LIVEKIT_API_SECRET`
- Functions environment: `LIVEKIT_URL=wss://your-project.livekit.cloud`

Never add the LiveKit API secret to Vite variables, mobile app configuration, or source control. If these secrets are not configured, the call must fail with a clear unavailable message; it must not show a fake connected state.

## Deploy after review

After staging validation and owner approval, deploy the new call functions and the reviewed Firestore rules/indexes through the normal release process:

```bash
firebase deploy --only functions:startDirectCall,functions:respondToDirectCall,functions:endDirectCall,functions:getDirectCallToken
firebase deploy --only firestore:rules,firestore:indexes
```

The functions use the existing `europe-west1` Firebase region.

## Acceptance checks

1. Sign in to two different NEXORA accounts on separate devices and open their existing one-to-one conversation.
2. Start a voice call; verify the recipient sees an incoming call, can accept or decline, and both sides hear each other.
3. Repeat with video; verify remote video, local preview, camera on/off, front/rear camera switching and mute.
4. Test caller cancel, recipient decline, unanswered-call expiry, simultaneous call attempts, an account block, disabled direct messages, suspended/restricted accounts, and a network interruption.
5. Verify a third account cannot read the call document or obtain a room token.
6. Verify that ending a call closes both clients and that no microphone/camera track remains active.

## Current scope and release gaps

This first implementation covers in-app/browser one-to-one calls and web push incoming-call alerts. It does not yet implement Android Telecom/ConnectionService or iOS CallKit/PushKit lock-screen call handling, a persistent call-history screen, or group calls. Those are separate native and product work and must be completed and tested before claiming the same background-call experience as WhatsApp.
