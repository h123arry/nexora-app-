import { randomUUID } from 'node:crypto';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldPath, FieldValue, getFirestore, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFile, writeFile } from 'node:fs/promises';
import { resolveFirebaseProjectId, resolveFirebaseStorageBucket, resolveFirestoreDatabaseId, PRODUCTION_FIREBASE_PROJECT_ID } from '../runtimeConfig.js';

const WEAVE_PAGE_SIZE = 50;
const MOMENT_PAGE_SIZE = 100;
const MEDIA_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DOWNLOAD_TOKEN_KEY = 'firebaseStorageDownloadTokens';

type CustomStorageMetadata = Record<string, string | number | boolean | null>;

type StorageFileLike = {
  exists(): Promise<[boolean]>;
  getMetadata(): Promise<[{ metadata?: CustomStorageMetadata }, unknown]>;
  setMetadata(metadata: { metadata: CustomStorageMetadata }): Promise<unknown>;
};
type StorageBucketLike = { file(path: string): StorageFileLike };

export type LegacyMediaOutcome =
  | 'would-revoke-and-clear'
  | 'would-clear-revoked-token'
  | 'revoked-and-cleared'
  | 'cleared-revoked-token'
  | 'already-clear'
  | 'skipped-public'
  | 'unsafe-reference'
  | 'missing-object'
  | 'changed-during-migration'
  | 'failed';

export interface LegacyMediaSummary {
  dryRun: boolean;
  inspectedMoments: number;
  scanned: number;
  wouldRevokeAndClear: number;
  wouldClearRevokedToken: number;
  revokedAndCleared: number;
  clearedRevokedToken: number;
  alreadyClear: number;
  skippedPublic: number;
  unsafeReference: number;
  missingObject: number;
  changedDuringMigration: number;
  failed: number;
  stoppedAtLimit: boolean;
}

export function firebaseDownloadTokenObjectPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com'
      || !url.searchParams.has('token') || !url.searchParams.get('token')) return null;
    const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
    if (!match) return null;
    const path = decodeURIComponent(match[1]);
    return path && !path.includes('..') && !path.includes('\\') ? path : null;
  } catch {
    return null;
  }
}

export function metadataWithRotatedFirebaseDownloadToken(metadata: CustomStorageMetadata | undefined): CustomStorageMetadata {
  // Rotate to a fresh, undistributed token. Cloud Storage metadata PATCH merges
  // custom keys, so replacing the token invalidates every previously issued URL
  // without risking accidental loss of unrelated metadata.
  return { ...(metadata || {}), [DOWNLOAD_TOKEN_KEY]: randomUUID() };
}

function increment(summary: LegacyMediaSummary, outcome: LegacyMediaOutcome): void {
  summary.scanned += 1;
  switch (outcome) {
    case 'would-revoke-and-clear': summary.wouldRevokeAndClear += 1; break;
    case 'would-clear-revoked-token': summary.wouldClearRevokedToken += 1; break;
    case 'revoked-and-cleared': summary.revokedAndCleared += 1; break;
    case 'cleared-revoked-token': summary.clearedRevokedToken += 1; break;
    case 'already-clear': summary.alreadyClear += 1; break;
    case 'skipped-public': summary.skippedPublic += 1; break;
    case 'unsafe-reference': summary.unsafeReference += 1; break;
    case 'missing-object': summary.missingObject += 1; break;
    case 'changed-during-migration': summary.changedDuringMigration += 1; break;
    case 'failed': summary.failed += 1; break;
  }
}

async function migrateMoment(
  db: Firestore,
  bucket: StorageBucketLike,
  moment: QueryDocumentSnapshot,
  weaveVisibility: unknown,
  dryRun: boolean,
): Promise<LegacyMediaOutcome | null> {
  const mediaUrl = moment.get('mediaUrl');
  const urlObjectPath = firebaseDownloadTokenObjectPath(mediaUrl);
  if (!urlObjectPath) return null;
  if (weaveVisibility === 'public') return 'skipped-public';
  if (weaveVisibility !== 'private') return 'unsafe-reference';

  const authorId = moment.get('authorId');
  const storagePath = moment.get('storagePath');
  if (typeof authorId !== 'string' || !MEDIA_ID.test(authorId)
    || typeof storagePath !== 'string'
    || storagePath !== `users/${authorId}/media/${moment.id}`
    || urlObjectPath !== storagePath) return 'unsafe-reference';

  const file = bucket.file(storagePath);
  try {
    const [exists] = await file.exists();
    if (!exists) return 'missing-object';
    const [metadata] = await file.getMetadata();
    const customMetadata = metadata.metadata || {};
    const hasTokenMetadata = typeof customMetadata[DOWNLOAD_TOKEN_KEY] === 'string'
      && customMetadata[DOWNLOAD_TOKEN_KEY].trim().length > 0;
    if (dryRun) return hasTokenMetadata ? 'would-revoke-and-clear' : 'would-clear-revoked-token';

    if (hasTokenMetadata) {
      await file.setMetadata({ metadata: metadataWithRotatedFirebaseDownloadToken(customMetadata) });
    }

    const result = await db.runTransaction(async transaction => {
      const latest = await transaction.get(moment.ref);
      if (!latest.exists || latest.get('storagePath') !== storagePath || latest.get('mediaUrl') !== mediaUrl) {
        return false;
      }
      transaction.update(moment.ref, {
        mediaUrl: '',
        legacyDownloadTokenRevokedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!result) return 'changed-during-migration';
    return hasTokenMetadata ? 'revoked-and-cleared' : 'cleared-revoked-token';
  } catch {
    // Never log the media URL, token, object metadata, or account content.
    return 'failed';
  }
}

export async function runLegacyWorldWeaveMediaMigration(
  db: Firestore,
  bucket: StorageBucketLike,
  options: { dryRun?: boolean; maxMoments?: number } = {},
): Promise<LegacyMediaSummary> {
  const dryRun = options.dryRun !== false;
  const maxMoments = options.maxMoments ?? 5000;
  if (!Number.isSafeInteger(maxMoments) || maxMoments < 1 || maxMoments > 100000) {
    throw new Error('maxMoments must be an integer between 1 and 100000.');
  }
  const summary: LegacyMediaSummary = {
    dryRun, inspectedMoments: 0, scanned: 0, wouldRevokeAndClear: 0, wouldClearRevokedToken: 0,
    revokedAndCleared: 0, clearedRevokedToken: 0, alreadyClear: 0, skippedPublic: 0,
    unsafeReference: 0, missingObject: 0, changedDuringMigration: 0,
    failed: 0, stoppedAtLimit: false,
  };

  let weaveCursor: QueryDocumentSnapshot | undefined;
  while (true) {
    let weaveQuery = db.collection('worldWeaves').orderBy(FieldPath.documentId()).limit(WEAVE_PAGE_SIZE);
    if (weaveCursor) weaveQuery = weaveQuery.startAfter(weaveCursor);
    const weaves = await weaveQuery.get();
    if (weaves.empty) break;
    for (const weave of weaves.docs) {
      let momentCursor: QueryDocumentSnapshot | undefined;
      while (true) {
        let momentQuery = weave.ref.collection('moments').orderBy(FieldPath.documentId()).limit(MOMENT_PAGE_SIZE);
        if (momentCursor) momentQuery = momentQuery.startAfter(momentCursor);
        const moments = await momentQuery.get();
        if (moments.empty) break;
        for (const moment of moments.docs) {
          if (summary.inspectedMoments >= maxMoments) {
            summary.stoppedAtLimit = true;
            return summary;
          }
          summary.inspectedMoments += 1;
          const outcome = await migrateMoment(db, bucket, moment, weave.get('visibility'), dryRun);
          if (outcome) increment(summary, outcome);
        }
        momentCursor = moments.docs[moments.docs.length - 1];
        if (moments.size < MOMENT_PAGE_SIZE) break;
      }
    }
    weaveCursor = weaves.docs[weaves.docs.length - 1];
    if (weaves.size < WEAVE_PAGE_SIZE) break;
  }
  return summary;
}

function argValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const allowProduction = args.includes('--allow-production');
  const confirmProject = argValue(args, 'confirm-project');
  const reportPath = argValue(args, 'report');
  const maxMoments = Number(argValue(args, 'max-moments') || 5000);
  const projectId = resolveFirebaseProjectId();
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST && (process.env.STORAGE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST));

  if (apply && !emulator && confirmProject !== projectId) {
    throw new Error('Refusing writes without --confirm-project=<exact Firebase project ID>. No migration was applied.');
  }
  if (apply && projectId === PRODUCTION_FIREBASE_PROJECT_ID && !allowProduction) {
    throw new Error('Refusing production migration without the additional --allow-production flag. No migration was applied.');
  }
  if (allowProduction && projectId !== PRODUCTION_FIREBASE_PROJECT_ID) {
    throw new Error('--allow-production is valid only for the configured production project.');
  }

  const app = initializeApp({ credential: applicationDefault(), projectId }, `legacy-worldweave-media-migration-${process.pid}`);
  const db = getFirestore(app, resolveFirestoreDatabaseId());
  const bucket = getStorage(app).bucket(resolveFirebaseStorageBucket());
  const summary = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: !apply, maxMoments });
  console.log(JSON.stringify({ projectId, emulator, phase: apply ? 'apply' : 'dry-run', ...summary }, null, 2));
  if (reportPath) await writeFile(reportPath, `${JSON.stringify({ projectId, emulator, ...summary }, null, 2)}\n`, { mode: 0o600 });
  if (summary.failed > 0 || summary.unsafeReference > 0 || summary.missingObject > 0 || summary.changedDuringMigration > 0) {
    process.exitCode = 2;
  }
}

if (process.argv[1]?.endsWith('revokeLegacyWorldWeaveDownloadTokens.js')) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown migration error';
    console.error(`Legacy media migration stopped safely: ${message}`);
    process.exitCode = 1;
  });
}
