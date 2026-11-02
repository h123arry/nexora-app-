const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
};

/** Keep the stored filename extension aligned with the validated media MIME type. */
export function videoFileExtension(contentType: string): string | null {
  const normalized = String(contentType || '').split(';')[0].trim().toLowerCase();
  return VIDEO_EXTENSIONS[normalized] || null;
}
