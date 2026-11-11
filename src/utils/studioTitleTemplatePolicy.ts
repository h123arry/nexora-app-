import { normalizeStudioTextLayer, type StudioTextLayer } from './studioTextLayerPolicy';

export type StudioTitleTemplateId = 'nexora-signal' | 'creator-spotlight' | 'cinematic-chapter' | 'bold-hook' | 'quiet-note';

export type StudioTitleTemplate = {
  id: StudioTitleTemplateId;
  name: string;
  description: string;
  sample: string;
  layer: Omit<StudioTextLayer, 'id' | 'start' | 'end'>;
};

export const STUDIO_TITLE_TEMPLATES: readonly StudioTitleTemplate[] = [
  {
    id: 'nexora-signal',
    name: 'NEXORA Signal',
    description: 'Violet editorial title with a confident pop entrance',
    sample: 'YOUR STORY STARTS HERE',
    layer: { text: 'YOUR STORY STARTS HERE', color: '#F5F7FF', position: 'center', fontSize: 54, opacity: 1, scale: 1, rotation: 0, animation: 'pop', animationDuration: 0.55, keyframes: [] },
  },
  {
    id: 'creator-spotlight',
    name: 'Creator Spotlight',
    description: 'Warm gold creator introduction',
    sample: 'MEET THE CREATOR',
    layer: { text: 'MEET THE CREATOR', color: '#F6D98B', position: 'bottom', fontSize: 48, opacity: 1, scale: 1, rotation: 0, animation: 'slide-up', animationDuration: 0.7, keyframes: [] },
  },
  {
    id: 'cinematic-chapter',
    name: 'Cinematic Chapter',
    description: 'Quiet white chapter heading',
    sample: 'CHAPTER ONE',
    layer: { text: 'CHAPTER ONE', color: '#FFFFFF', position: 'center', fontSize: 42, opacity: 0.96, scale: 1, rotation: 0, animation: 'fade', animationDuration: 1.1, keyframes: [] },
  },
  {
    id: 'bold-hook',
    name: 'Bold Hook',
    description: 'Large high-contrast opening hook',
    sample: 'WAIT FOR IT',
    layer: { text: 'WAIT FOR IT', color: '#FFFFFF', position: 'top', fontSize: 68, opacity: 1, scale: 1, rotation: 0, animation: 'zoom', animationDuration: 0.45, keyframes: [] },
  },
  {
    id: 'quiet-note',
    name: 'Quiet Note',
    description: 'Subtle violet note for reflective edits',
    sample: 'A MOMENT TO REMEMBER',
    layer: { text: 'A MOMENT TO REMEMBER', color: '#CDBBFF', position: 'bottom', fontSize: 34, opacity: 0.92, scale: 1, rotation: 0, animation: 'fade', animationDuration: 0.9, keyframes: [] },
  },
] as const;

export function createStudioTitleTemplate(
  templateId: StudioTitleTemplateId,
  id: string,
  start: number,
): StudioTextLayer {
  const template = STUDIO_TITLE_TEMPLATES.find(item => item.id === templateId) ?? STUDIO_TITLE_TEMPLATES[0];
  return normalizeStudioTextLayer({ ...template.layer, id, start, end: 0 }, id);
}
