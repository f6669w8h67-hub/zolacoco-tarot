-- Zolacoco Tarot VIP membership schema (Neon Postgres)
-- Authentication secrets and payment information are intentionally not stored here.

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text UNIQUE,
  email text NOT NULL,
  full_name text,
  line_id text,
  birthday date,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'expired')),
  access_starts_at timestamptz,
  access_expires_at timestamptz,
  suspended_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT members_access_window_valid CHECK (
    access_expires_at IS NULL OR access_starts_at IS NULL OR access_expires_at > access_starts_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS members_email_lower_idx ON members (lower(email));
CREATE INDEX IF NOT EXISTS members_status_expiry_idx ON members (status, access_expires_at);

CREATE TABLE IF NOT EXISTS member_access_audit (
  id bigserial PRIMARY KEY,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'activated', 'extended', 'suspended', 'restored', 'expired', 'updated', 'deleted')),
  months_delta integer,
  previous_status text,
  new_status text,
  previous_expires_at timestamptz,
  new_expires_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_access_audit_member_created_idx
  ON member_access_audit (member_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_members_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_set_updated_at ON members;
CREATE TRIGGER members_set_updated_at
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION set_members_updated_at();
