-- Uploaded CSVs live in their own schema so user SQL can never touch app/auth tables.
CREATE SCHEMA IF NOT EXISTS uploads;

-- Registry of uploaded datasets (shared by everyone signed in: a team workspace).
CREATE TABLE IF NOT EXISTS public.datasets (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  table_name  text NOT NULL UNIQUE,
  columns     jsonb NOT NULL,          -- [{ name, type }]
  row_count   integer NOT NULL DEFAULT 0,
  owner_id    uuid NOT NULL,           -- Supabase auth user id (auth.users.id)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- The Supabase API exposes the public schema directly. This app talks to Postgres only via
-- the Express server, so lock the table away from the public anon/authenticated API roles.
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

-- Read-only role used for user-submitted SQL: can see ONLY the uploads schema.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_readonly') THEN
    CREATE ROLE app_readonly NOLOGIN;
  END IF;
END $$;

-- The connecting user must be a member of the role to SET ROLE to it.
DO $$
BEGIN
  EXECUTE format('GRANT app_readonly TO %I', current_user);
END $$;

GRANT USAGE ON SCHEMA uploads TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA uploads TO app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA uploads GRANT SELECT ON TABLES TO app_readonly;
