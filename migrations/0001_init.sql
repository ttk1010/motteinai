CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  gender TEXT,
  lat REAL,
  lon REAL,
  place TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY, -- トークンのSHA-256
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'processing',
  image_key TEXT NOT NULL,
  cutout_key TEXT,
  category TEXT NOT NULL DEFAULT 'top',
  subcategory TEXT NOT NULL DEFAULT 'tshirt',
  color TEXT NOT NULL DEFAULT '#9A9A9A',
  pattern TEXT NOT NULL DEFAULT 'solid',
  fit TEXT NOT NULL DEFAULT 'regular',
  formality INTEGER NOT NULL DEFAULT 2,
  warmth INTEGER NOT NULL DEFAULT 2,
  seasons TEXT NOT NULL DEFAULT '["spring","summer","autumn","winter"]',
  brand TEXT,
  price INTEGER,
  wear_count INTEGER NOT NULL DEFAULT 0,
  last_worn_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX items_user ON items(user_id, created_at);

CREATE TABLE wear_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_ids TEXT NOT NULL,
  worn_on TEXT NOT NULL
);
CREATE INDEX wear_logs_user ON wear_logs(user_id, worn_on);

CREATE TABLE wants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'check' | 'archetype'
  image_key TEXT,
  tags TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX wants_user ON wants(user_id, created_at);
