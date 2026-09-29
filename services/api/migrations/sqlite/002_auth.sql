ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN created_at TEXT;
ALTER TABLE users ADD COLUMN updated_at TEXT;
ALTER TABLE users RENAME COLUMN name TO full_name;
CREATE UNIQUE INDEX idx_users_email ON users(email);

ALTER TABLE memberships ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE memberships ADD COLUMN reporting_scope TEXT;
ALTER TABLE memberships ADD COLUMN discipline TEXT;
ALTER TABLE memberships ADD COLUMN area TEXT;
