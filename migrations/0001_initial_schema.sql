-- WeekFlow initial schema (Phase 1)
-- Household enhancement layer — not provider PIM data.

CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  display_name text NOT NULL,
  permissions_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  from_type text NOT NULL,
  from_id text NOT NULL,
  to_type text NOT NULL,
  to_id text NOT NULL,
  kind text NOT NULL,
  folder_url text,
  folder_provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS links_edge_unique
  ON links (household_id, from_type, from_id, to_type, to_id, kind);

CREATE TABLE IF NOT EXISTS item_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id text NOT NULL,
  shared_to_board boolean NOT NULL DEFAULT false,
  board_display text NOT NULL DEFAULT 'title_only',
  shared_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS item_shares_item_unique
  ON item_shares (household_id, item_type, item_id);

CREATE TABLE IF NOT EXISTS board_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_type text,
  item_id text,
  x real NOT NULL DEFAULT 0,
  y real NOT NULL DEFAULT 0,
  rotation real NOT NULL DEFAULT 0,
  pin_style text,
  content_json jsonb,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id text NOT NULL,
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  filename text NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS links_household_idx ON links (household_id);
CREATE INDEX IF NOT EXISTS item_shares_household_idx ON item_shares (household_id);
CREATE INDEX IF NOT EXISTS board_pins_household_idx ON board_pins (household_id);
CREATE INDEX IF NOT EXISTS attachments_household_idx ON attachments (household_id);

-- Demo household for prototype (Phase 2+ uses this until real auth)
INSERT INTO households (id, name, owner_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Household', 'demo-user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO household_members (household_id, user_id, role, display_name)
SELECT '00000000-0000-0000-0000-000000000001', 'demo-user', 'owner', 'Demo User'
WHERE NOT EXISTS (
  SELECT 1 FROM household_members
  WHERE household_id = '00000000-0000-0000-0000-000000000001'
    AND user_id = 'demo-user'
);
