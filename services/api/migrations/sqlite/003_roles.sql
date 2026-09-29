-- Remove the CHECK constraint on role by recreating the table
CREATE TABLE memberships_new (
    project_id TEXT NOT NULL REFERENCES projects(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    reporting_scope TEXT,
    discipline TEXT,
    area TEXT,
    PRIMARY KEY (project_id, user_id)
);

INSERT INTO memberships_new SELECT * FROM memberships;

DROP TABLE memberships;
ALTER TABLE memberships_new RENAME TO memberships;
