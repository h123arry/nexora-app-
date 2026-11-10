import { createHmac } from 'node:crypto';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function canPublishLiveVideo(isHost: boolean, guestStatus: unknown): boolean {
  return isHost || guestStatus === 'approved';
}

/** Build least-privilege room grants. NEXORA chat uses its authenticated backend, not LiveKit data packets. */
export function createLiveKitVideoGrant(roomName: string, isHost: boolean) {
  if (!roomName || roomName.length > 135) throw new Error('A valid LiveKit room is required.');
  return {
    roomJoin: true,
    room: roomName,
    canPublish: isHost,
    canPublishData: false,
    canSubscribe: true,
    canUpdateOwnMetadata: false,
  };
}

/** Create a LiveKit-compatible HS256 access token. Never expose the signing secret. */
export function createLiveKitJwt(claims: Record<string, unknown>, secret: string): string {
  if (!secret) throw new Error('LiveKit API secret is required.');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode(claims);
  const unsigned = header + '.' + payload;
  return unsigned + '.' + createHmac('sha256', secret).update(unsigned).digest('base64url');
}
