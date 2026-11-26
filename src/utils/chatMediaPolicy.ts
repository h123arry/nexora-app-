const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', ogv: 'video/ogg',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4a: 'audio/mp4', wav: 'audio/wav', wave: 'audio/wav',
  ogg: 'audio/ogg', oga: 'audio/ogg', aac: 'audio/aac', opus: 'audio/opus',
  flac: 'audio/flac', m4b: 'audio/mp4', '3gp': 'audio/3gpp',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain', csv: 'text/csv', rtf: 'application/rtf', md: 'text/markdown',
  json: 'application/json', xml: 'application/xml',
  zip: 'application/zip', '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar', tar: 'application/x-tar', gz: 'application/gzip',
};

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'audio/mp3': 'audio/mpeg',
  'audio/x-m4a': 'audio/mp4',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/x-aac': 'audio/aac',
  'application/x-pdf': 'application/pdf',
  'application/x-zip-compressed': 'application/zip',
};

const KNOWN_MIME_TYPES = new Set([...Object.values(EXTENSION_MIME_TYPES), 'audio/webm']);

const VOICE_RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
] as const;

export function normalizeChatAttachmentContentType(fileName: string, reportedType?: string): string {
  const extension = fileName.split('.').pop()?.trim().toLowerCase() || '';
  const extensionType = EXTENSION_MIME_TYPES[extension];
  const reported = (reportedType || '').split(';')[0].trim().toLowerCase();
  const normalized = MIME_ALIASES[reported] || reported;
  if (!normalized || normalized === 'application/octet-stream' || normalized === 'binary/octet-stream') {
    return extensionType || 'application/octet-stream';
  }
  // Android document providers sometimes report a generic or incorrect type.
  // A known file extension is a better upload hint in that case.
  if (extensionType && !KNOWN_MIME_TYPES.has(normalized)) return extensionType;
  return normalized;
}

export function selectVoiceRecordingMimeType(isTypeSupported: (mimeType: string) => boolean): string | undefined {
  return VOICE_RECORDING_MIME_TYPES.find(mimeType => isTypeSupported(mimeType));
}

export function voiceRecordingExtension(contentType: string): string {
  const normalized = MIME_ALIASES[contentType.split(';')[0].trim().toLowerCase()]
    || contentType.split(';')[0].trim().toLowerCase();
  if (normalized === 'audio/mp4') return 'm4a';
  if (normalized === 'audio/aac') return 'aac';
  if (normalized === 'audio/ogg') return 'ogg';
  if (normalized === 'audio/wav') return 'wav';
  return 'webm';
}
