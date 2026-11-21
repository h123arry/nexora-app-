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

export function videoRenditionsForSize(sourceWidth, sourceHeight, renditions) {
  if (!Number.isSafeInteger(sourceWidth) || sourceWidth <= 0 ||
      !Number.isSafeInteger(sourceHeight) || sourceHeight <= 0) {
    throw new Error('Valid source video dimensions are required');
  }
  const shortEdge = Math.min(sourceWidth, sourceHeight);
  return renditions.filter(rendition => Number.isSafeInteger(rendition.height) && rendition.height > 0 && rendition.height <= shortEdge);
}

export function videoRenditionDimensions(sourceWidth, sourceHeight, targetShortEdge) {
  if (!Number.isSafeInteger(sourceWidth) || sourceWidth <= 0 ||
      !Number.isSafeInteger(sourceHeight) || sourceHeight <= 0 ||
      !Number.isSafeInteger(targetShortEdge) || targetShortEdge <= 0 ||
      targetShortEdge > Math.min(sourceWidth, sourceHeight)) {
    throw new Error('The requested video rendition must fit within the source dimensions');
  }
  const scale = targetShortEdge / Math.min(sourceWidth, sourceHeight);
  return {
    width: Math.max(2, Math.round(sourceWidth * scale / 2) * 2),
    height: Math.max(2, Math.round(sourceHeight * scale / 2) * 2),
  };
}

export function canClaimMediaProcessing(current, nowMs = Date.now(), staleAfterMs = 15 * 60 * 1000) {
  if (!current) return true;
  if (current.status === 'pending_upload' || current.status === 'uploaded' || current.status === 'failed') return true;
  if (current.status !== 'processing') return false;
  const startedAt = typeof current.processingStartedAt?.toMillis === 'function' ? current.processingStartedAt.toMillis() : 0;
  return startedAt > 0 && nowMs - startedAt >= staleAfterMs;
}

/** Validate an authenticated R2 completion event without treating private chat objects as public media. */
export function classifyR2StorageObject(event, expectedBucket) {
  if (event?.provider !== 'r2') return { ignored: true, reason: 'unrecognized-provider' };
  const object = event.object || event.data || {};
  const name = object.name;
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
  if (!/^\d{1,32}$/.test(generation)) throw new Error('A valid immutable R2 media generation is required');
  return { ignored: false, provider: 'r2', object, ownerId, mediaId, size, contentType, isVideo, isImage, generation };
}


/** True only when a ready video already has an MP4 rendition in this exact R2 asset generation. */
export function hasR2VideoRendition(asset, ownerId, mediaId) {
  if (!asset || !Array.isArray(asset.renditions) || typeof asset.generation !== 'string') return false;
  const prefix = `processed/${ownerId}/${mediaId}/${asset.generation}/`;
  return asset.renditions.some(rendition =>
    rendition && Number.isSafeInteger(rendition.height) && rendition.height >= 144 && rendition.height <= 4320
    && typeof rendition.mp4Path === 'string' && rendition.mp4Path.startsWith(prefix)
    && rendition.mp4Path.endsWith('/video.mp4')
    && !rendition.mp4Path.split('/').some(part => !part || part === '.' || part === '..')
  );
}

/** Reconcile uploaded/failed/stale assets and ready videos whose R2 renditions are missing. */
export function shouldReconcileR2Asset(asset, mediaId, nowMs = Date.now(), staleAfterMs = 45 * 60 * 1000) {
  if (!asset || asset.storageProvider !== 'r2' || !['video', 'image'].includes(String(asset.kind))) return false;
  if (asset.status === 'ready') {
    return asset.kind === 'video' && !hasR2VideoRendition(asset, String(asset.ownerId || ''), mediaId);
  }
  return ['uploaded', 'failed', 'processing'].includes(String(asset.status))
    && canClaimMediaProcessing(asset, nowMs, staleAfterMs);
}
