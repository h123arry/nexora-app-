import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldPath, FieldValue, getFirestore, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { writeFile } from 'node:fs/promises';
import { resolveFirebaseProjectId } from '../runtimeConfig.js';

const PAGE_SIZE = 200;
const PRODUCTION_PROJECT_ID = 'nexora-prod-voiceharrison';

export interface PublicProfileScrubSummary {
  dryRun: boolean;
  scanned: number;
  wouldScrub: number;
  scrubbed: number;
  unchanged: number;
  pages: number;
}

export async function runPublicProfilePrivateFieldScrub(
  db: Firestore,
  options: { dryRun: boolean; onProgress?: (summary: PublicProfileScrubSummary) => void } = { dryRun: true },
): Promise<PublicProfileScrubSummary> {
  const summary: PublicProfileScrubSummary = {
    dryRun: options.dryRun,
    scanned: 0,
    wouldScrub: 0,
    scrubbed: 0,
    unchanged: 0,
    pages: 0,
  };

  let cursor: QueryDocumentSnapshot | undefined;
  while (true) {
    let query = db.collection('publicProfiles')
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const page = await query.get();
    if (page.empty) break;

    const needsScrub = page.docs.filter(snapshot => {
      const data = snapshot.data();
      return Object.prototype.hasOwnProperty.call(data, 'interestDNA')
        || Object.prototype.hasOwnProperty.call(data, 'dateOfBirth');
    });

    summary.pages += 1;
    summary.scanned += page.size;
    summary.unchanged += page.size - needsScrub.length;
    if (options.dryRun) {
      summary.wouldScrub += needsScrub.length;
    } else if (needsScrub.length > 0) {
      const batch = db.batch();
      for (const snapshot of needsScrub) {
        batch.update(snapshot.ref, {
          interestDNA: FieldValue.delete(),
          dateOfBirth: FieldValue.delete(),
        });
      }
      // A failed batch stops the migration. It never skips ahead silently.
      await batch.commit();
      summary.scrubbed += needsScrub.length;
    }

    cursor = page.docs[page.docs.length - 1];
    options.onProgress?.({ ...summary });
    if (page.size < PAGE_SIZE) break;
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
  const confirmProduction = args.includes('--confirm-production');
  const reportPath = argValue(args, 'report');
  const projectId = resolveFirebaseProjectId();
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (apply && !emulator && (!confirmProduction || projectId !== PRODUCTION_PROJECT_ID)) {
    throw new Error(`Refusing non-emulator writes. Production apply requires project ${PRODUCTION_PROJECT_ID} and the explicit --confirm-production flag. No changes were made.`);
  }

  const app = initializeApp(
    { credential: applicationDefault(), projectId },
    `public-profile-private-field-scrub-${process.pid}`,
  );
  const summary = await runPublicProfilePrivateFieldScrub(getFirestore(app), {
    dryRun: !apply,
    onProgress: progress => console.log(JSON.stringify({
      projectId,
      emulator,
      phase: apply ? 'apply' : 'dry-run',
      ...progress,
    })),
  });

  const report = { projectId, emulator, ...summary };
  console.log(JSON.stringify(report, null, 2));
  if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
}

if (process.argv[1]?.endsWith('scrubPublicProfilePrivateFields.js')) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown migration error';
    console.error(`Public profile privacy scrub stopped safely: ${message}`);
    process.exitCode = 1;
  });
}
