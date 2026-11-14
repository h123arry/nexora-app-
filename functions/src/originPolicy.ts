export type OriginUploadKind = 'upload_ingest' | 'studio_export';
export type OriginCredentialState = 'absent' | 'verified' | 'untrusted' | 'invalid' | 'unsupported' | 'pending';

export type OriginUploadInput = {
  assetId: string;
  ownerUid: string;
  mediaGeneration: string;
  contentDigest: string;
  contentType: string;
  byteSize: number;
  studioExport: boolean;
};

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function buildOriginUploadRecords(input: OriginUploadInput) {
  if (!SAFE_ID.test(input.assetId) || !SAFE_ID.test(input.ownerUid)) {
    throw new Error('Origin asset and owner identifiers must be valid.');
  }
  if (!/^\d{1,32}$/.test(input.mediaGeneration)) {
    throw new Error('A valid immutable media generation is required.');
  }
  if (!SHA256.test(input.contentDigest)) {
    throw new Error('A server-computed SHA-256 content digest is required.');
  }
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0) {
    throw new Error('Origin media size must be a positive safe integer.');
  }
  if (typeof input.contentType !== 'string' || input.contentType.length < 3 || input.contentType.length > 128) {
    throw new Error('A valid media content type is required.');
  }

  const originKind: OriginUploadKind = input.studioExport ? 'studio_export' : 'upload_ingest';
  return {
    origin: {
      assetId: input.assetId,
      ownerUid: input.ownerUid,
      originKind,
      contentDigest: input.contentDigest,
      digestAlgorithm: 'sha256' as const,
      mediaGeneration: input.mediaGeneration,
      contentType: input.contentType,
      byteSize: input.byteSize,
      credentialState: 'absent' as OriginCredentialState,
      lineageState: 'unlinked' as const,
      disclosureState: 'unknown' as const,
      schemaVersion: 1 as const,
    },
    event: {
      eventId: `generation_${input.mediaGeneration}`,
      assetId: input.assetId,
      actorUid: input.ownerUid,
      eventType: 'uploaded_to_nexora' as const,
      contributionRole: 'uploader' as const,
      disclosureSource: 'platform_observed' as const,
      mediaGeneration: input.mediaGeneration,
      contentDigest: input.contentDigest,
      digestAlgorithm: 'sha256' as const,
      schemaVersion: 1 as const,
    },
  };
}
