/**
 * Resolve the Firestore target without silently routing production traffic to
 * the project's `(default)` database. The emulator is the only implicit local
 * exception because it does not model named Firestore databases.
 */
export function resolveFirestoreDatabaseId(env: NodeJS.ProcessEnv = process.env): string {
  const configuredId = env.FIRESTORE_DATABASE_ID?.trim();

  if (configuredId?.includes('<owner-')) {
    throw new Error('FIRESTORE_DATABASE_ID is still an owner placeholder; refusing to initialize Firestore.');
  }
  if (configuredId) return configuredId;
  if (env.FIRESTORE_EMULATOR_HOST) return '(default)';

  throw new Error('FIRESTORE_DATABASE_ID must be explicitly configured outside the Firestore emulator; refusing to assume (default).');
}
