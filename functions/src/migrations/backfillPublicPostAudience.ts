import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { readFile, writeFile } from 'node:fs/promises';

const MAX_BATCH_SIZE = 200;
const MAX_CONCURRENCY = 10;

type ManifestEntry = {
  id: string;
  confirmedPublic: true;
  evidence: string;
};

type Manifest = {
  version: 1;
  entries: ManifestEntry[];
};

type Outcome = 'would-update' | 'updated' | 'already-public' | 'restricted' | 'missing' | 'unapproved' | 'failed';

export interface MigrationRecord {
  id: string;
  outcome: Outcome;
}

export interface MigrationSummary {
  dryRun: boolean;
  scanned: number;
  wouldUpdate: number;
  updated: number;
  alreadyPublic: number;
  restricted: number;
  missing: number;
  unapproved: number;
  failed: number;
  records: MigrationRecord[];
}

function validateManifest(value: unknown): Manifest {
  if (!value || typeof value !== 'object') throw new Error('Manifest must be a JSON object.');
  const manifest = value as Partial<Manifest>;
  if (manifest.version !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error('Manifest must contain version: 1 and an entries array.');
  }
  const ids = new Set<string>();
  for (const entry of manifest.entries) {
    if (!entry || typeof entry.id !== 'string' || !/^[^/]{1,150}$/.test(entry.id)) {
      throw new Error('Every manifest entry must have a valid Firestore post ID.');
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate manifest post ID: ${entry.id}`);
    ids.add(entry.id);
    if (entry.confirmedPublic !== true || typeof entry.evidence !== 'string' || entry.evidence.trim().length < 10) {
      throw new Error(`Post ${entry.id} needs explicit public confirmation and a non-empty evidence note (at least 10 characters).`);
    }
  }
  return manifest as Manifest;
}

async function migrateOne(db: Firestore, entry: ManifestEntry, dryRun: boolean): Promise<MigrationRecord> {
  const postRef = db.collection('posts').doc(entry.id);
  try {
    return await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(postRef);
      if (!snapshot.exists) return { id: entry.id, outcome: 'missing' };
      const data = snapshot.data() ?? {};
      if (data.audience === 'public') return { id: entry.id, outcome: 'already-public' };
      if (Object.prototype.hasOwnProperty.call(data, 'audience')) return { id: entry.id, outcome: 'restricted' };
      if (dryRun) return { id: entry.id, outcome: 'would-update' };
      // Transaction rechecks that the audience is still absent immediately before write.
      transaction.update(postRef, { audience: 'public' });
      return { id: entry.id, outcome: 'updated' };
    });
  } catch {
    // Never include post content or other document fields in diagnostics.
    return { id: entry.id, outcome: 'failed' };
  }
}

export async function runPublicAudienceBackfill(
  db: Firestore,
  manifest: Manifest,
  options: { dryRun: boolean; onProgress?: (summary: MigrationSummary) => void } = { dryRun: true },
): Promise<MigrationSummary> {
  validateManifest(manifest);
  const summary: MigrationSummary = {
    dryRun: options.dryRun,
    scanned: 0,
    wouldUpdate: 0,
    updated: 0,
    alreadyPublic: 0,
    restricted: 0,
    missing: 0,
    unapproved: 0,
    failed: 0,
    records: [],
  };
  const approved = manifest.entries;
  const batches = Math.ceil(approved.length / MAX_BATCH_SIZE);
  for (let batchIndex = 0; batchIndex < batches; batchIndex += 1) {
    const batch = approved.slice(batchIndex * MAX_BATCH_SIZE, (batchIndex + 1) * MAX_BATCH_SIZE);
    for (let offset = 0; offset < batch.length; offset += MAX_CONCURRENCY) {
      const results = await Promise.all(batch.slice(offset, offset + MAX_CONCURRENCY).map((entry) => migrateOne(db, entry, options.dryRun)));
      for (const record of results) {
        summary.scanned += 1;
        summary[record.outcome === 'would-update' ? 'wouldUpdate' : record.outcome === 'updated' ? 'updated' : record.outcome === 'already-public' ? 'alreadyPublic' : record.outcome] += 1;
        summary.records.push(record);
      }
      options.onProgress?.({ ...summary, records: [...summary.records] });
    }
  }
  return summary;
}

function argValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const manifestPath = argValue(args, 'manifest');
  const reportPath = argValue(args, 'report');
  const apply = args.includes('--apply');
  const confirmProduction = args.includes('--confirm-production');
  if (!manifestPath) throw new Error('Usage: --manifest=/secure/path/approved-public-posts.json [--apply] [--confirm-production] [--report=/secure/path/report.json]');
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId;
  if (!projectId) throw new Error('Project ID is missing; set GCLOUD_PROJECT or GCP_PROJECT explicitly.');
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  if (apply && !emulator && !confirmProduction) {
    throw new Error('Refusing non-emulator writes without the explicit --confirm-production flag. No migration was applied.');
  }
  const manifest = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  const app = initializeApp({ credential: applicationDefault(), projectId }, `post-audience-migration-${process.pid}`);
  const summary = await runPublicAudienceBackfill(getFirestore(app), manifest, {
    dryRun: !apply,
    onProgress: (progress) => console.log(JSON.stringify({ projectId, emulator, phase: apply ? 'apply' : 'dry-run', scanned: progress.scanned, wouldUpdate: progress.wouldUpdate, updated: progress.updated, alreadyPublic: progress.alreadyPublic, restricted: progress.restricted, missing: progress.missing, failed: progress.failed })),
  });
  console.log(JSON.stringify({ projectId, emulator, manifestEntries: manifest.entries.length, ...summary }, null, 2));
  if (reportPath) await writeFile(reportPath, `${JSON.stringify({ projectId, emulator, ...summary }, null, 2)}\n`, { mode: 0o600 });
  if (summary.failed > 0) process.exitCode = 2;
}

if (process.argv[1]?.endsWith('backfillPublicPostAudience.js')) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown migration error';
    console.error(`Migration stopped safely: ${message}`);
    process.exitCode = 1;
  });
}
