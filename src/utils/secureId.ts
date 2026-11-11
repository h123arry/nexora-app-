/**
 * Generate collision-resistant identifiers for client-created records.
 * Crypto APIs are required; never fall back to Math.random for durable IDs.
 */
export function createSecureId(prefix = 'id'): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure random generation is unavailable in this browser context.');
  }
  if (typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  const token = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${token}`;
}

export function secureRandomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new Error('A valid integer range is required.');
  }
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure random generation is unavailable in this browser context.');
  }
  const range = max - min + 1;
  const ceiling = Math.floor(0x100000000 / range) * range;
  const sample = new Uint32Array(1);
  do {
    cryptoApi.getRandomValues(sample);
  } while (sample[0] >= ceiling);
  return min + (sample[0] % range);
}
