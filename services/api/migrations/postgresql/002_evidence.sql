-- 002_evidence.sql: Field Evidence domain model & Event-Evidence many-to-many relationship
CREATE TABLE IF NOT EXISTS evidence (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  source_capture_id text,
  type text NOT NULL CHECK(type IN ('photo','video','audio','document')),
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  thumbnail_url text,
  media_url text,
  captured_at timestamptz NOT NULL,
  uploaded_at timestamptz NOT NULL,
  captured_by text NOT NULL REFERENCES users(id),
  duration_ms integer,
  width integer,
  height integer,
  sha256 text NOT NULL,
  sync_status text NOT NULL DEFAULT 'synced',
  metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_evidence (
  execution_event_id text NOT NULL REFERENCES execution_events(id),
  evidence_id text NOT NULL REFERENCES evidence(id),
  PRIMARY KEY (execution_event_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_project ON evidence(project_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_event_evidence_event ON event_evidence(execution_event_id);
CREATE INDEX IF NOT EXISTS idx_event_evidence_evidence ON event_evidence(evidence_id);
