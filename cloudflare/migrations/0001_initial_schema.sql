-- NEXORA Cloudflare D1 migration foundation.
-- This schema is for the isolated migration/staging database only.
-- Firebase remains the production source of truth until a separately approved cutover.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS migration_runs (
  id TEXT PRIMARY KEY,
  source_project TEXT NOT NULL,
  source_database TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','running','paused','completed','failed')),
  started_at TEXT,
  completed_at TEXT,
  documents_scanned INTEGER NOT NULL DEFAULT 0,
  documents_imported INTEGER NOT NULL DEFAULT 0,
  documents_skipped INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- Lossless staging envelope. Never place Firebase passwords, OAuth secrets,
-- service-account keys, or other credentials in this table.
CREATE TABLE IF NOT EXISTS migration_documents (
  source_path TEXT PRIMARY KEY,
  source_collection TEXT NOT NULL,
  source_document_id TEXT NOT NULL,
  parent_path TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  payload_sha256 TEXT NOT NULL,
  source_update_time TEXT,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  migration_run_id TEXT NOT NULL REFERENCES migration_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_migration_documents_collection
  ON migration_documents(source_collection, source_document_id);
CREATE INDEX IF NOT EXISTS idx_migration_documents_parent
  ON migration_documents(parent_path);

-- Canonical read models are populated only after collection-specific mapping
-- and authorization policies have been reviewed.
CREATE TABLE IF NOT EXISTS nexora_profiles (
  uid TEXT PRIMARY KEY,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  created_at TEXT,
  updated_at TEXT,
  source_path TEXT UNIQUE REFERENCES migration_documents(source_path)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nexora_profiles_username
  ON nexora_profiles(username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS nexora_posts (
  id TEXT PRIMARY KEY,
  author_uid TEXT NOT NULL,
  body TEXT,
  media_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(media_json)),
  visibility TEXT NOT NULL DEFAULT 'public',
  created_at TEXT,
  updated_at TEXT,
  source_path TEXT UNIQUE REFERENCES migration_documents(source_path)
);

CREATE INDEX IF NOT EXISTS idx_nexora_posts_author_created
  ON nexora_posts(author_uid, created_at DESC);

CREATE TABLE IF NOT EXISTS nexora_follows (
  follower_uid TEXT NOT NULL,
  followed_uid TEXT NOT NULL,
  created_at TEXT,
  source_path TEXT UNIQUE REFERENCES migration_documents(source_path),
  PRIMARY KEY (follower_uid, followed_uid),
  CHECK (follower_uid <> followed_uid)
);

CREATE INDEX IF NOT EXISTS idx_nexora_follows_followed
  ON nexora_follows(followed_uid, follower_uid);

CREATE TABLE IF NOT EXISTS nexora_media_assets (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  visibility TEXT NOT NULL DEFAULT 'private',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT,
  source_path TEXT UNIQUE REFERENCES migration_documents(source_path)
);

CREATE INDEX IF NOT EXISTS idx_nexora_media_owner
  ON nexora_media_assets(owner_uid, created_at DESC);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('0001', 'Create isolated migration envelope and initial social read models');
