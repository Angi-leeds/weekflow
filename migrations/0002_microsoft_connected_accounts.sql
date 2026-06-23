-- Phase 9: Microsoft Graph OAuth tokens and provider item mappings

CREATE TABLE IF NOT EXISTS connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS provider_item_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  connected_account_id uuid NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  local_item_id text NOT NULL,
  external_id text NOT NULL,
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, item_type, local_item_id)
);

CREATE INDEX IF NOT EXISTS provider_item_mappings_external_idx
  ON provider_item_mappings (connected_account_id, external_id);
