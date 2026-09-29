CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, timezone TEXT NOT NULL,
  active_snapshot_id TEXT NOT NULL, seed_version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memberships (
  project_id TEXT NOT NULL REFERENCES projects(id), user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('supervisor','planner','viewer','admin')),
  PRIMARY KEY(project_id,user_id)
);
CREATE TABLE IF NOT EXISTS schedule_snapshots (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), imported_at TEXT NOT NULL, source_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), snapshot_id TEXT NOT NULL REFERENCES schedule_snapshots(id),
  wbs TEXT NOT NULL, level INTEGER NOT NULL CHECK(level IN (5,6)), name TEXT NOT NULL, discipline TEXT NOT NULL,
  work_type TEXT NOT NULL, asset_id TEXT NOT NULL, location_json TEXT NOT NULL, planned_start TEXT NOT NULL,
  planned_finish TEXT NOT NULL, planned_quantity_json TEXT, actual_progress_percent REAL NOT NULL CHECK(actual_progress_percent BETWEEN 0 AND 100),
  actual_quantity_json TEXT, actual_as_of TEXT, source_verification_id TEXT, version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(snapshot_id,wbs)
);
CREATE TABLE IF NOT EXISTS execution_events (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), reporter_id TEXT NOT NULL REFERENCES users(id),
  observed_at TEXT NOT NULL, received_at TEXT NOT NULL, evidence_json TEXT NOT NULL, extracted_facts_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('submitted','proposed','verified','rejected')), version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS match_proposals (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), execution_event_id TEXT NOT NULL REFERENCES execution_events(id),
  snapshot_id TEXT NOT NULL REFERENCES schedule_snapshots(id), engine_version TEXT NOT NULL, config_version TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('primary','deterministic_fallback')), status TEXT NOT NULL CHECK(status IN ('proposed','verified','rejected')),
  candidates_json TEXT NOT NULL, created_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, UNIQUE(execution_event_id)
);
CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), proposal_id TEXT NOT NULL UNIQUE REFERENCES match_proposals(id),
  activity_id TEXT, planner_id TEXT NOT NULL REFERENCES users(id), decision TEXT NOT NULL CHECK(decision IN ('verified','rejected')),
  progress_percent REAL, actual_quantity_json TEXT, note TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS idempotency_records (
  project_id TEXT NOT NULL, actor_id TEXT NOT NULL, route TEXT NOT NULL, key TEXT NOT NULL, request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL, response_status INTEGER NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(project_id,actor_id,route,key)
);
CREATE TABLE IF NOT EXISTS audit_entries (
  project_id TEXT NOT NULL, sequence INTEGER NOT NULL, previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL,
  canonical_payload TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL, occurred_at TEXT NOT NULL, request_id TEXT NOT NULL,
  PRIMARY KEY(project_id,sequence), UNIQUE(project_id,entry_hash)
);
CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL, aggregate_type TEXT NOT NULL, aggregate_id TEXT NOT NULL,
  type TEXT NOT NULL, payload_json TEXT NOT NULL, occurred_at TEXT NOT NULL, published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_project ON execution_events(project_id, received_at, id);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id, wbs, id);
CREATE INDEX IF NOT EXISTS idx_outbox_project ON outbox_events(project_id, occurred_at, id);
