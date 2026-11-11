export type StudioExportMetadata = {
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
};

export type StudioExportExpectation = {
  durationSeconds: number;
  width: number;
  height: number;
};

export function getStudioExportValidationError(
  actual: StudioExportMetadata,
  expected: StudioExportExpectation,
): string | null {
  if (!/^video\/webm(?:;|$)/i.test(actual.mimeType)) {
    return 'The browser returned an unsupported export format. Studio currently exports WebM video.';
  }
  if (!Number.isFinite(actual.sizeBytes) || actual.sizeBytes <= 0) {
    return 'The export is empty. Your Studio draft is safe; try rendering again.';
  }
  if (!Number.isFinite(actual.durationSeconds) || actual.durationSeconds <= 0) {
    return 'The exported video has no readable duration. Your Studio draft is safe; try rendering again.';
  }
  if (!Number.isFinite(actual.width) || !Number.isFinite(actual.height) || actual.width <= 0 || actual.height <= 0) {
    return 'The exported video dimensions could not be verified. Your Studio draft is safe; try rendering again.';
  }
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return `The export dimensions did not match the selected format (${expected.width}×${expected.height}). Try rendering again.`;
  }
  const tolerance = Math.max(0.75, expected.durationSeconds * 0.08);
  if (!Number.isFinite(expected.durationSeconds) || expected.durationSeconds <= 0 ||
      Math.abs(actual.durationSeconds - expected.durationSeconds) > tolerance) {
    return 'The exported video duration does not match your timeline. Your draft is safe; try rendering again.';
  }
  return null;
}
