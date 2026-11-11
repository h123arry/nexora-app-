export type NexoraLensCategory =
  | 'Camera Enhance'
  | 'Beauty'
  | 'Cinema'
  | 'Colour'
  | 'Creator'
  | 'AR'
  | 'Fantasy'
  | 'Playful'
  | 'World';

export type NexoraLensSticker =
  | 'none' | 'crown' | 'cat' | 'halo' | 'glasses' | 'hearts'
  | 'sparkles' | 'puppy' | 'bunny' | 'flower' | 'robot' | 'butterfly';

export type NexoraLens = {
  id: string;
  name: string;
  category: NexoraLensCategory;
  filter: string;
  sticker: NexoraLensSticker;
  description: string;
  intensity: number;
  featured?: boolean;
};

const collections: Array<{
  category: NexoraLensCategory;
  prefixes: string[];
  suffixes: string[];
  description: string;
  base: { brightness: number; contrast: number; saturate: number; hue: number; sepia: number };
}> = [
  { category: 'Camera Enhance', prefixes: ['ClearFrame', 'TrueLight', 'LensLift', 'DetailFlow', 'FocusTone'], suffixes: ['Natural', 'Balanced', 'Bright', 'Soft', 'Clean', 'Studio'], description: 'A camera-first enhancement tuned for natural-looking capture.', base: { brightness: 1.04, contrast: 1.05, saturate: 1.03, hue: 0, sepia: 0 } },
  { category: 'Beauty', prefixes: ['Aura', 'Velvet', 'Petal', 'Silk', 'Luminous'], suffixes: ['Glow', 'Bloom', 'Radiance', 'Softlight', 'Dew', 'Polish'], description: 'A portrait finish with carefully balanced light and colour.', base: { brightness: 1.08, contrast: 0.97, saturate: 1.08, hue: 0, sepia: 0.025 } },
  { category: 'Cinema', prefixes: ['Nexa', 'Frame', 'Noir', 'Scene', 'Motion'], suffixes: ['Film', 'Drama', 'Dusk', 'Classic', 'Epic', 'Silver'], description: 'An original NEXORA film-inspired colour treatment.', base: { brightness: 0.99, contrast: 1.16, saturate: 0.92, hue: 4, sepia: 0.06 } },
  { category: 'Colour', prefixes: ['Prism', 'Chromatic', 'Spectrum', 'Vivid', 'Tonal'], suffixes: ['Shift', 'Rush', 'Muse', 'Wave', 'Pop', 'Dream'], description: 'A distinctive colour palette for expressive photos and clips.', base: { brightness: 1.02, contrast: 1.08, saturate: 1.24, hue: 12, sepia: 0 } },
  { category: 'Creator', prefixes: ['Creator', 'Vlog', 'Daily', 'Story', 'Social'], suffixes: ['Ready', 'Focus', 'Polished', 'Warmth', 'Fresh', 'Signature'], description: 'A ready-to-record look for stories, vlogs and creator videos.', base: { brightness: 1.04, contrast: 1.08, saturate: 1.1, hue: -4, sepia: 0.015 } },
  { category: 'AR', prefixes: ['Nexa', 'Orbit', 'Icon', 'Persona', 'Playform'], suffixes: ['Crown', 'Whiskers', 'Halo', 'Spectacles', 'HeartEyes', 'Spark'], description: 'A face-tracked NEXORA character or accessory effect.', base: { brightness: 1, contrast: 1.04, saturate: 1.1, hue: 0, sepia: 0 } },
  { category: 'Fantasy', prefixes: ['Astral', 'Celestia', 'Mythic', 'Stardust', 'Ethereal'], suffixes: ['Wings', 'Aurora', 'Moonbeam', 'Enchanted', 'Nebula', 'Dream'], description: 'A fantastical colour world with animated visual accents.', base: { brightness: 1.08, contrast: 1.1, saturate: 1.22, hue: 24, sepia: 0.025 } },
  { category: 'Playful', prefixes: ['Bubbly', 'Giggle', 'Jelly', 'Popstar', 'Sunny'], suffixes: ['Bounce', 'Candy', 'Confetti', 'Smile', 'Twist', 'Fizz'], description: 'A bright, playful look for expressive moments.', base: { brightness: 1.1, contrast: 1.05, saturate: 1.3, hue: -12, sepia: 0 } },
  { category: 'World', prefixes: ['Terra', 'Coastal', 'Urban', 'Desert', 'Evergreen'], suffixes: ['Morning', 'Golden', 'Coastline', 'Afterglow', 'Rainfall', 'Horizon'], description: 'An environment-inspired look for places, travel and everyday scenes.', base: { brightness: 1.03, contrast: 1.08, saturate: 1.12, hue: 8, sepia: 0.035 } },
];

const arStickers: NexoraLensSticker[] = [
  'crown', 'cat', 'halo', 'glasses', 'hearts', 'sparkles',
  'puppy', 'bunny', 'flower', 'robot', 'butterfly',
];

const originalNames: Record<string, string> = {
  crown: 'Nexa Royalty',
  cat: 'Nexa Whiskers',
  halo: 'Halo Drift',
  glasses: 'Violet Vision',
  hearts: 'Heartlight',
  sparkles: 'Orbit Spark',
  puppy: 'Pawfect',
  bunny: 'Moon Bunny',
  flower: 'Petal Crown',
  robot: 'Nexa Bot',
  butterfly: 'Butterfly Aura',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeLens(collectionIndex: number, itemIndex: number): NexoraLens {
  const collection = collections[collectionIndex];
  const prefix = collection.prefixes[Math.floor(itemIndex / collection.suffixes.length)];
  const suffix = collection.suffixes[itemIndex % collection.suffixes.length];
  const variation = itemIndex + 1;
  const brightness = clamp(collection.base.brightness + ((variation % 5) - 2) * 0.025, 0.78, 1.28);
  const contrast = clamp(collection.base.contrast + ((variation % 6) - 2.5) * 0.035, 0.78, 1.42);
  const saturate = clamp(collection.base.saturate + ((variation % 7) - 3) * 0.065, 0.45, 1.8);
  const hue = collection.base.hue + ((variation * 19 + collectionIndex * 13) % 73) - 36;
  const sepia = clamp(collection.base.sepia + (variation % 4) * 0.035, 0, 0.22);
  const isAr = collection.category === 'AR';
  const sticker = isAr && itemIndex < arStickers.length ? arStickers[itemIndex] : 'none';
  const name = sticker !== 'none' ? originalNames[sticker] : `${prefix} ${suffix} ${String(variation).padStart(2, '0')}`;
  const id = `nexora-${collection.category.toLowerCase().replaceAll(' ', '-')}-${String(variation).padStart(2, '0')}`;
  const filter = [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${saturate.toFixed(3)})`,
    `hue-rotate(${hue}deg)`,
    `sepia(${sepia.toFixed(3)})`,
  ].join(' ');
  return {
    id,
    name,
    category: collection.category,
    filter: itemIndex === 0 && collection.category === 'Camera Enhance' ? 'brightness(1.04) contrast(1.05) saturate(1.03)' : filter,
    sticker,
    description: collection.description,
    intensity: 100,
    featured: itemIndex < 3,
  };
}

export const NEXORA_LENS_CATALOG: NexoraLens[] = collections.flatMap((_, collectionIndex) =>
  Array.from({ length: 30 }, (_, itemIndex) => makeLens(collectionIndex, itemIndex)),
);

export const NEXORA_LENS_CATALOG_VERSION = '1.0.0';
export const NEXORA_LENS_CATALOG_SIZE = NEXORA_LENS_CATALOG.length;

export const NEXORA_LENS_CATEGORIES = [
  'For you', 'Camera Enhance', 'Beauty', 'Cinema', 'Colour',
  'Creator', 'AR', 'Fantasy', 'Playful', 'World', 'Favourites',
] as const;

export const NEXORA_FEATURED_LENS_IDS = NEXORA_LENS_CATALOG
  .filter((lens) => lens.featured)
  .map((lens) => lens.id);

export function getNexoraLensById(id: string) {
  return NEXORA_LENS_CATALOG.find((lens) => lens.id === id) ?? NEXORA_LENS_CATALOG[0];
}
