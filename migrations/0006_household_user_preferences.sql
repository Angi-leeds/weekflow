-- Tier-1 Settings synced across devices (calendar prefs, account defaults, etc.)

CREATE TABLE IF NOT EXISTS household_user_preferences (
  household_id uuid PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  prefs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO households (id, name, owner_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo household', 'demo')
ON CONFLICT (id) DO NOTHING;
