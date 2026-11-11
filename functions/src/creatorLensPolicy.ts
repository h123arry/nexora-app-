export const CREATOR_LENS_LIMIT = 50;
export const CREATOR_LENS_NAME_MAX = 32;

export type CreatorLensRecipe = {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
};

export type CreatorLensInput = {
  name: string;
  recipe: CreatorLensRecipe;
};

export function validateCreatorLensInput(value: unknown): CreatorLensInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Lens details are required.');
  const input = value as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 3 || name.length > CREATOR_LENS_NAME_MAX) throw new Error('Lens names must contain 3 to 32 characters.');
  if (!input.recipe || typeof input.recipe !== 'object' || Array.isArray(input.recipe)) throw new Error('A lens colour recipe is required.');
  const recipe = input.recipe as Record<string, unknown>;
  const bounds: Record<keyof CreatorLensRecipe, [number, number]> = {
    brightness: [70, 140], contrast: [70, 150], saturation: [0, 180], hue: [-180, 180],
  };
  const normalized = {} as CreatorLensRecipe;
  for (const key of Object.keys(bounds) as Array<keyof CreatorLensRecipe>) {
    const value = recipe[key];
    const [min, max] = bounds[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`Lens ${key} must be between ${min} and ${max}.`);
    }
    normalized[key] = Math.round(value);
  }
  return { name, recipe: normalized };
}

export function creatorLensFilter(recipe: CreatorLensRecipe): string {
  return `brightness(${(recipe.brightness / 100).toFixed(2)}) contrast(${(recipe.contrast / 100).toFixed(2)}) saturate(${(recipe.saturation / 100).toFixed(2)}) hue-rotate(${recipe.hue}deg)`;
}

export function validateCreatorLensId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('A valid creator lens reference is required.');
  return value;
}

export function canSubmitCreatorLens(status: unknown): boolean {
  return status === 'draft' || status === 'rejected';
}

export function canReviewCreatorLens(status: unknown): boolean {
  return status === 'pending_review';
}
