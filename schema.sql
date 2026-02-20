-- Leaderboard scores for all games
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  player_name TEXT NOT NULL,
  time_ms INTEGER NOT NULL,
  moves INTEGER,
  tiles_clicked INTEGER,
  used_hint INTEGER DEFAULT 0,
  session_token TEXT NOT NULL,
  ip_hash TEXT,
  flagged INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game, flagged, time_ms);
CREATE INDEX IF NOT EXISTS idx_scores_dash ON scores(game, flagged, tiles_clicked DESC);

-- Anonymous wisdom messages
CREATE TABLE IF NOT EXISTS wisdom (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  ip_hash TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Page view tracking (supplements Cloudflare Analytics)
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  referrer TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_views_date ON page_views(created_at);

-- Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
