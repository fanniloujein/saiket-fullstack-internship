-- Users: the profile fields of the task (name, email, age) + login and role
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(60)  NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  email          VARCHAR(254) NOT NULL CHECK (email = lower(email) AND email LIKE '%_@_%._%'),
  age            SMALLINT     NOT NULL CHECK (age BETWEEN 13 AND 120),
  bio            VARCHAR(160) NOT NULL DEFAULT '',
  role           VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash  TEXT         NOT NULL,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE OF name, email, age, bio, role, password_hash ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
