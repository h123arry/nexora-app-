import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface NexoraGift {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  priceNex: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image: string;
  animation: 'sparkle' | 'reveal' | 'cinematic' | 'legendary';
  subscriptionExclusive: boolean;
  limitedEdition: boolean;
  icon: string;
  description: string;
}
export interface GiftCatalogResponse { version: number; currency: 'NEX'; gifts: NexoraGift[]; }
export interface GiftQuote {
  quoteVersion: number; giftId: string; priceNex: number; currency: 'NEX';
  expiresInSeconds: number; serverIssuedAt: string;
}

const RETRYABLE_CATALOG_ERRORS = new Set([
  'functions/unavailable', 'functions/deadline-exceeded',
  'functions/internal', 'functions/resource-exhausted',
]);
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Read-only catalogue calls may be retried safely; wallet operations must never use this retry path. */
export async function getGiftCatalog(): Promise<GiftCatalogResponse> {
  const call = httpsCallable<void, GiftCatalogResponse>(functions, 'getGiftCatalog', { timeout: 15000 });
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = (await call()).data;
      if (!response || !Array.isArray(response.gifts) || response.gifts.length === 0) {
        throw new Error('The GiftVerse catalogue returned no gifts.');
      }
      return response;
    } catch (error) {
      lastError = error;
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code) : '';
      if (!RETRYABLE_CATALOG_ERRORS.has(code) || attempt === 2) throw error;
      await wait(350 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('GiftVerse is temporarily unavailable.');
}

export async function quoteNexGift(giftId: string): Promise<GiftQuote> {
  const call = httpsCallable<{ giftId: string }, GiftQuote>(functions, 'quoteNexGift');
  return (await call({ giftId })).data;
}
