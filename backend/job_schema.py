JOB_SCHEMA = """
CREATE TABLE IF NOT EXISTS deck_jobs (
 id TEXT PRIMARY KEY, workspace TEXT NOT NULL, request_key TEXT, request_hash TEXT NOT NULL,
 edition_id TEXT NOT NULL REFERENCES editions(id), brief TEXT NOT NULL, profile TEXT NOT NULL,
 options TEXT NOT NULL, status TEXT NOT NULL, reason TEXT, revision INTEGER NOT NULL DEFAULT 1,
 selected TEXT, slides TEXT, attempts INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT, lease_until REAL, qa TEXT, created REAL NOT NULL, updated REAL NOT NULL,
 UNIQUE(workspace,request_key)
);
CREATE INDEX IF NOT EXISTS deck_pending ON deck_jobs(status,updated);
CREATE TABLE IF NOT EXISTS deck_files (
 job_id TEXT PRIMARY KEY REFERENCES deck_jobs(id), revision INTEGER NOT NULL,
 pptx BLOB NOT NULL, pdf BLOB NOT NULL, article BLOB NOT NULL
);
"""
