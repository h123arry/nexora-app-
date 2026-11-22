#!/usr/bin/env node
/**
 * One-way, idempotent Firestore -> Cloudflare D1 staging importer.
 *
 * Required environment:
 *   GOOGLE_APPLICATION_CREDENTIALS (or ADC available to Firebase Admin)
 *   GCLOUD_PROJECT
 *   FIRESTORE_DATABASE_ID
 *   CLOUDFLARE_API_TOKEN (D1:Edit permission)
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_D1_DATABASE_ID
 *
 * This imports Firestore documents into the lossless staging envelope only.
 * It does not migrate Firebase Authentication users or Storage object bytes,
 * and it never copies credential/token-like fields.
 */
import { createHash, randomUUID } from 'node:crypto';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required migration configuration: ${name}`);
  return value;
};

const projectId = required('GCLOUD_PROJECT');
const databaseId = required('FIRESTORE_DATABASE_ID');
const accountId = required('CLOUDFLARE_ACCOUNT_ID');
const d1DatabaseId = required('CLOUDFLARE_D1_DATABASE_ID');
const apiToken = required('CLOUDFLARE_API_TOKEN');
const pageSize = Math.min(250, Math.max(1, Number(process.env.MIGRATION_PAGE_SIZE) || 100));
const batchSize = Math.min(50, Math.max(1, Number(process.env.MIGRATION_BATCH_SIZE) || 25));
const excludedCollections = new Set(
  (process.env.MIGRATION_EXCLUDED_COLLECTIONS || 'credentials,secrets,oauthTokens,authTokens,sessions,privateKeys')
    .split(',').map(value => value.trim()).filter(Boolean),
);

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId });
const firestore = getFirestore(app, databaseId);
const runId = randomUUID();
const d1Endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${d1DatabaseId}/query`;

function serialize(value) {
  if (value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') return { __type: 'timestamp', value: value.toDate().toISOString() };
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (typeof value.path === 'string' && value.firestore) return { __type: 'document_reference', path: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { __type: 'bytes_base64', value: Buffer.from(value).toString('base64') };
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (/password|secret|private.?key|access.?token|refresh.?token|oauth.?token|api.?key|service.?account|credential/i.test(key)) continue;
    output[key] = serialize(child);
  }
  return output;
}

async function d1Batch(statements) {
  const response = await fetch(d1Endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch: statements }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const code = payload?.errors?.[0]?.code || response.status;
    throw new Error(`Cloudflare D1 migration request failed (code ${code}).`);
  }
  return payload.result || [];
}

async function writeDocuments(documents) {
  if (!documents.length) return;
  const statements = documents.map(document => ({
    sql: `INSERT INTO migration_documents
      (source_path, source_collection, source_document_id, parent_path, payload_json, payload_sha256, source_update_time, migration_run_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_path) DO UPDATE SET
        source_collection=excluded.source_collection,
        source_document_id=excluded.source_document_id,
        parent_path=excluded.parent_path,
        payload_json=excluded.payload_json,
        payload_sha256=excluded.payload_sha256,
        source_update_time=excluded.source_update_time,
        imported_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
        migration_run_id=excluded.migration_run_id`,
    params: [
      document.path, document.collection, document.id, document.parentPath ?? '',
      document.payload, document.hash, document.updateTime ?? '', runId,
    ],
  }));
  await d1Batch(statements);
}

let scanned = 0;
let imported = 0;
let pending = [];

async function flush() {
  if (!pending.length) return;
  const batch = pending;
  pending = [];
  await writeDocuments(batch);
  imported += batch.length;
  await d1Batch([{
    sql: 'UPDATE migration_runs SET documents_scanned=?, documents_imported=? WHERE id=?',
    params: [String(scanned), String(imported), runId],
  }]);
}

async function walkCollection(collection, parentPath = null) {
  if (excludedCollections.has(collection.id)) return;
  let cursor = null;
  while (true) {
    let query = collection.orderBy(FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    for (const snapshot of page.docs) {
      scanned += 1;
      const payload = JSON.stringify(serialize(snapshot.data()));
      const document = {
        path: snapshot.ref.path,
        collection: collection.id,
        id: snapshot.id,
        parentPath,
        payload,
        hash: createHash('sha256').update(payload).digest('hex'),
        updateTime: snapshot.updateTime?.toDate().toISOString() || null,
      };
      pending.push(document);
      if (pending.length >= batchSize) await flush();

      const subcollections = await snapshot.ref.listCollections();
      for (const subcollection of subcollections) {
        await walkCollection(subcollection, snapshot.ref.path);
      }
    }
    cursor = page.docs.at(-1);
    if (page.size < pageSize) break;
  }
}

await d1Batch([{
  sql: `INSERT INTO migration_runs (id, source_project, source_database, status, started_at, metadata_json)
    VALUES (?, ?, ?, 'running', strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?)`,
  params: [runId, projectId, databaseId, JSON.stringify({ pageSize, batchSize, mode: 'staging-document-import' })],
}]);

try {
  const collections = await firestore.listCollections();
  for (const collection of collections) await walkCollection(collection);
  await flush();
  await d1Batch([{
    sql: `UPDATE migration_runs SET status='completed', completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
      documents_scanned=?, documents_imported=? WHERE id=?`,
    params: [String(scanned), String(imported), runId],
  }]);
  process.stdout.write(JSON.stringify({ runId, status: 'completed', scanned, imported }) + '\\n');
} catch (error) {
  await d1Batch([{
    sql: `UPDATE migration_runs SET status='failed', completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
      documents_scanned=?, documents_imported=?, error_code='migration_failed' WHERE id=?`,
    params: [String(scanned), String(imported), runId],
  }]).catch(() => {});
  process.stderr.write(JSON.stringify({ runId, status: 'failed', scanned, imported, message: error instanceof Error ? error.message : 'Unknown migration error' }) + '\\n');
  process.exitCode = 1;
}
