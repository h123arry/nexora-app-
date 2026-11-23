import React from 'react';
import type { ImgHTMLAttributes } from 'react';
import { useResolvedUrl } from '../utils/indexedDbStorage';

/**
 * Resolves NEXORA media gateway and legacy device-local URLs before rendering.
 * Use this for feed/profile avatars and carousel images so Capacitor clients
 * never try to load relative /api/media paths from capacitor://localhost.
 */
export default function NexoraResolvedImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const resolvedSrc = useResolvedUrl(typeof src === 'string' ? src : undefined);
  return <img {...props} src={resolvedSrc || undefined} />;
}
