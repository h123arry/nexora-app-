export const MAX_INPUT_BYTES = 250 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_DURATION_SECONDS = 60 * 60;

export function classifyStorageObject(event, expectedBucket) {
  const object = event?.data || event;
  const name = object?.name;
  const match = typeof name === 'string'
    ? name.match(/^users\/([A-Za-z0-9_-]{1,128})\/media\/([A-Za-z0-9_-]{1,128})$/)
    : null;
  if (!match || object.bucket !== expectedBucket) return { ignored: true, reason: 'unrecognized-object' };
  const [, ownerId, mediaId] = match;
  if (object.metadata?.ownerId !== ownerId || object.metadata?.mediaId !== mediaId) {
    return { ignored: true, reason: 'metadata-owner-mismatch' };
  }

  const size = Number(object.size);
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_INPUT_BYTES) {
    throw new Error('Input file size is missing or outside media processing limits');
  }
  const contentType = String(object.contentType || '').toLowerCase();
  const isVideo = contentType.startsWith('video/');
  const isImage = contentType.startsWith('image/');
  if (!isVideo && !isImage) return { ignored: true, reason: 'unsupported-media-type' };
  if (isImage && size > MAX_IMAGE_BYTES) throw new Error('Image exceeds 12 MiB processing limit');

  const generation = String(object.generation || '');
  if (!/^\d{1,32}$/.test(generation)) {
    throw new Error('A valid Cloud Storage object generation is required for immutable processing');
  }

  return { ignored: false, object, ownerId, mediaId, size, contentType, isVideo, isImage, generation };
}

export function imageRenditionWidths(sourceWidth) {
  if (!Number.isSafeInteger(sourceWidth) || sourceWidth <= 0) {
    throw new Error('A valid source image width is required');
  }
  const widths = [320, 640, 1280].filter(width => width <= sourceWidth);
  return widths.length ? widths : [sourceWidth];
}

export function videoRenditionsForHeight(sourceHeight, renditions) {
  if (!Number.isSafeInteger(sourceHeight) || sourceHeight <= 0) {
    throw new Error('A valid source video height is required');
  }
  return renditions.filter(rendition => Number.isSafeInteger(rendition.height) && rendition.height > 0 && rendition.height <= sourceHeight);
}
