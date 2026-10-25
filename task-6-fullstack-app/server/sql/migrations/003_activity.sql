-- Activity log: who did what, and when. Rows stay when a user is deleted (ON DELETE SET NULL),
-- the name is kept in "details" so the history remains readable.
CREATE TABLE IF NOT EXISTS activity (
  id          BIGSERIAL   PRIMARY KEY,
  actor_id    UUID        REFERENCES users (id) ON DELETE SET NULL,
  user_id     UUID        REFERENCES users (id) ON DELETE SET NULL,
  action      VARCHAR(40) NOT NULL,
  details     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_created_idx ON activity (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_user_idx ON activity (user_id);
