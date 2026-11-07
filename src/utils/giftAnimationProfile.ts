export type GiftAnimation = 'sparkle' | 'reveal' | 'cinematic' | 'legendary';
export type GiftAnimationCategory = 'dragon' | 'wildlife' | 'floral' | 'royal' | 'luxury' | 'celestial' | 'tech' | 'music' | 'love' | 'african' | 'mythic' | 'seasonal' | 'other';
export interface GiftAnimationProfile { category: GiftAnimationCategory; particleCount: number; durationMs: number; }
const CATEGORIES = new Set<GiftAnimationCategory>(['dragon','wildlife','floral','royal','luxury','celestial','tech','music','love','african','mythic','seasonal']);
const DURATIONS: Record<GiftAnimation, number> = { sparkle: 3400, reveal: 4000, cinematic: 5000, legendary: 6400 };
export function getGiftAnimationProfile(giftId: string, animation: GiftAnimation): GiftAnimationProfile {
  const prefix = giftId.split('-')[0] as GiftAnimationCategory;
  const category = CATEGORIES.has(prefix) ? prefix : 'other';
  const intensity = animation === 'legendary' ? 16 : animation === 'cinematic' ? 12 : animation === 'reveal' ? 8 : 5;
  return { category, particleCount: intensity, durationMs: DURATIONS[animation] };
}
