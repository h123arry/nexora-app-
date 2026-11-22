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

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function getBundledGiftCatalog(): Promise<GiftCatalogResponse> {
  const response = await fetch('/giftverse/catalog.json', { cache: 'force-cache', credentials: 'same-origin' });
  if (!response.ok) throw new Error('The bundled GiftVerse catalogue could not be loaded.');
  const catalog = await response.json() as GiftCatalogResponse;
  if (!catalog || !Array.isArray(catalog.gifts) || catalog.gifts.length < 1000
    || new Set(catalog.gifts.map(gift => gift.id)).size !== catalog.gifts.length
    || catalog.gifts.some(gift => !gift.id || !gift.name || !Number.isSafeInteger(gift.priceNex) || gift.priceNex < 0)) {
    throw new Error('The bundled GiftVerse catalogue failed integrity checks.');
  }
  return catalog;
}

/** Server prices remain authoritative for every quote, purchase and delivery. The bundled catalogue is display-only fallback. */
export async function getGiftCatalog(): Promise<GiftCatalogResponse> {
  const call = httpsCallable<void, GiftCatalogResponse>(functions, 'getGiftCatalog', { timeout: 15000 });
  try {
    const response = (await call()).data;
    if (!response || !Array.isArray(response.gifts) || response.gifts.length < 1000) {
      throw new Error('The GiftVerse service returned an incomplete catalogue.');
    }
    return response;
  } catch (serverError) {
    try {
      return await getBundledGiftCatalog();
    } catch {
      throw serverError instanceof Error ? serverError : new Error('GiftVerse is temporarily unavailable.');
    }
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
