-- Migration 001: the users table
-- The database itself enforces the same rules as the API validation,
-- so data stays correct even if someone writes to the table directly.

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(60)  NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  email       VARCHAR(254) NOT NULL CHECK (email = lower(email) AND email LIKE '%_@_%._%'),
  age         SMALLINT     NOT NULL CHECK (age BETWEEN 1 AND 120),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

-- Indexes for the filters and sorts used by GET /api/users
CREATE INDEX IF NOT EXISTS users_age_idx ON users (age);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at);

-- Keep updated_at correct automatically on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
