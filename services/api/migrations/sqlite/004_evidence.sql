-- 004_evidence.sql: Field Evidence domain model & Event-Evidence many-to-many relationship
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  source_capture_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('photo','video','audio','document')),
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  thumbnail_url TEXT,
  media_url TEXT,
  captured_at TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  captured_by TEXT NOT NULL REFERENCES users(id),
  duration_ms INTEGER,
  width INTEGER,
  height INTEGER,
  sha256 TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_evidence (
  execution_event_id TEXT NOT NULL REFERENCES execution_events(id),
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  PRIMARY KEY (execution_event_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_project ON evidence(project_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_event_evidence_event ON event_evidence(execution_event_id);
CREATE INDEX IF NOT EXISTS idx_event_evidence_evidence ON event_evidence(evidence_id);
