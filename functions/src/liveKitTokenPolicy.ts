import { createHmac } from 'node:crypto';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Create a LiveKit-compatible HS256 access token. Never expose the signing secret. */
export function createLiveKitJwt(claims: Record<string, unknown>, secret: string): string {
  if (!secret) throw new Error('LiveKit API secret is required.');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode(claims);
  const unsigned = header + '.' + payload;
  return unsigned + '.' + createHmac('sha256', secret).update(unsigned).digest('base64url');
}
