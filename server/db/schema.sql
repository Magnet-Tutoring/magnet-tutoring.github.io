-- Magnet Tutoring schema. Idempotent: safe to run on every boot.
-- Store nothing beyond these columns (no SSNs, no payment data).

CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'family',
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id              serial PRIMARY KEY,
  user_id         int REFERENCES users(id),
  guardian_name   text NOT NULL,
  guardian_contact text NOT NULL,
  student_name    text,
  student_grade   text NOT NULL,
  subject         text,
  session_type    text,
  length          text,
  preferred_times text,
  notes           text,
  status          text NOT NULL DEFAULT 'requested',
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credits (
  id                       serial PRIMARY KEY,
  user_id                  int NOT NULL REFERENCES users(id),
  delta_private_hour_equiv numeric(5,2) NOT NULL,
  reason                   text,
  created_by               int REFERENCES users(id),
  created_at               timestamptz DEFAULT now()
);

-- Session store for connect-pg-simple (standard table definition).
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    varchar NOT NULL COLLATE "default",
  "sess"   json NOT NULL,
  "expire" timestamptz NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
