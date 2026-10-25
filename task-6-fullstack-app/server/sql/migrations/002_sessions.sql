-- Login sessions. The browser only keeps a random token in an HttpOnly cookie;
-- the database stores its SHA-256 hash, so a database leak does not leak sessions.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  CHAR(64)    PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_agent  VARCHAR(200) NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);
