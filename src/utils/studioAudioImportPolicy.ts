export const STUDIO_MAX_AUDIO_IMPORT_BYTES = 100 * 1024 * 1024;
export const STUDIO_MAX_AUDIO_DURATION_SECONDS = 30 * 60;

export function getStudioAudioImportError(file: Pick<File, 'type' | 'size'>): string | null {
  if (!file.type.toLowerCase().startsWith('audio/')) {
    return 'Choose an audio file for the soundtrack. Video and image files belong on the video or image tracks.';
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return 'This audio file is empty or unreadable.';
  if (file.size > STUDIO_MAX_AUDIO_IMPORT_BYTES) return 'Audio files must be 100 MB or smaller. Compress the file or choose a shorter track.';
  return null;
}

export function getStudioAudioDurationError(durationSeconds: number): string | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 'The audio file has no readable duration. Choose another audio file.';
  if (durationSeconds > STUDIO_MAX_AUDIO_DURATION_SECONDS) return 'Audio tracks must be 30 minutes or shorter.';
  return null;
}
