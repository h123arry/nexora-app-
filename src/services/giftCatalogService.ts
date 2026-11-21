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
  const call = httpsCallable<void, GiftCatalogResponse>(functions, 'getGiftCatalog', { timeout: 20000 });
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = (await call()).data;
      if (!response || !Array.isArray(response.gifts) || response.gifts.length < 1100) {
        throw new Error('The GiftVerse catalogue response is incomplete.');
      }
      return response;
    } catch (error) {
      lastError = error;
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code) : '';
      if (!RETRYABLE_CATALOG_ERRORS.has(code) || attempt === 2) break;
      await wait(500 * (attempt + 1));
    }
  }

  // Gift browsing must remain available when Functions is temporarily unreachable.
  // This public, versioned file is generated from the same server-owned catalogue.
  try {
    const response = await fetch('/giftverse/catalog.json', { cache: 'force-cache' });
    if (!response.ok) throw new Error('Bundled GiftVerse catalogue is unavailable.');
    const catalog = await response.json() as GiftCatalogResponse;
    if (catalog.version !== 3 || catalog.currency !== 'NEX' || !Array.isArray(catalog.gifts) || catalog.gifts.length < 1100) {
      throw new Error('The bundled GiftVerse catalogue is incomplete.');
    }
    return catalog;
  } catch {
    throw lastError instanceof Error ? lastError : new Error('GiftVerse is temporarily unavailable.');
  }
}

export async function quoteNexGift(giftId: string): Promise<GiftQuote> {
  const call = httpsCallable<{ giftId: string }, GiftQuote>(functions, 'quoteNexGift');
  return (await call({ giftId })).data;
}

export interface GiftInventoryItem {
  id: string;
  giftId: string;
  giftName: string;
  image: string;
  rarity: NexoraGift['rarity'];
  animation: NexoraGift['animation'];
  category: string;
  priceNex: number;
  quantity: number;
  updatedAt?: unknown;
}

export async function purchaseNexGift(giftId: string, idempotencyKey: string) {
  const call = httpsCallable<{ giftId: string; idempotencyKey: string }, {
    giftId: string; quantity: number; replayed: boolean; status: 'owned';
  }>(functions, 'purchaseNexGift');
  return (await call({ giftId, idempotencyKey })).data;
}

export async function getMyGiftInventory(): Promise<GiftInventoryItem[]> {
  const call = httpsCallable<void, { items: GiftInventoryItem[] }>(functions, 'getMyGiftInventory');
  return (await call()).data.items;
}
