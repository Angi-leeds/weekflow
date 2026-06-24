import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Pool } from "pg";
import { getPool } from "./index";

function resolveMigrationsDir(): string | null {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), "migrations"),
    path.join(process.cwd(), "dist", "migrations"),
    path.join(moduleDir, "..", "..", "migrations"),
    path.join(moduleDir, "..", "migrations"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return null;
}

/** Serializes concurrent migration runs on Replit autoscale. */
const LOCK_KEY = 847291;

const WEEKFLOW_TABLES = [
  "users",
  "households",
  "household_members",
  "links",
  "item_shares",
  "board_pins",
  "attachments",
  "connected_accounts",
  "provider_item_mappings",
];

export async function applyPendingMigrations(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log("DATABASE_URL not set — skipping migrations");
    return;
  }

  const lockClient = await pool.connect();
  await lockClient.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id serial PRIMARY KEY,
        filename text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const applied = await pool.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations",
    );
    const appliedSet = new Set(applied.rows.map((row) => row.filename));

    const migrationsDir = resolveMigrationsDir();
    if (!migrationsDir) {
      console.warn("No migrations directory found — running schema repair only");
      await ensureAuthPhase11bSchema(pool);
      return;
    }

    console.log(`Migrations directory: ${migrationsDir}`);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      if (appliedSet.has(filename)) {
        console.log(`Skip (already applied): ${filename}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, filename), "utf8");
      console.log(`Applying migration: ${filename}`);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
          [filename],
        );
        await client.query("COMMIT");
        console.log(`OK: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    await ensureAuthPhase11bSchema(pool);
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    lockClient.release();
  }
}

/** Idempotent repair when SQL files were skipped or a deploy missed migration 0004. */
async function ensureAuthPhase11bSchema(pool: Pool): Promise<void> {
  const columnCheck = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'totp_enabled'
     ) AS exists`,
  );

  if (!columnCheck.rows[0]?.exists) {
    console.log("Repair: applying Phase 11b auth columns on users");
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS totp_secret text,
        ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
    `);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens (user_id);

    CREATE TABLE IF NOT EXISTS household_invites (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      token text NOT NULL UNIQUE,
      invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      display_name text,
      household_id uuid REFERENCES households(id) ON DELETE SET NULL,
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS household_invites_email_idx ON household_invites (lower(email));

    CREATE TABLE IF NOT EXISTS auth_challenges (
      token text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS auth_challenges_user_idx ON auth_challenges (user_id);
  `);

  await pool.query(
    `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
    ["0004_auth_phase_11b.sql"],
  );
}

export async function isAuthSchemaReady(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'totp_enabled'
     ) AS exists`,
  );

  return Boolean(result.rows[0]?.exists);
}

export async function getDatabaseStatus(): Promise<{
  connected: boolean;
  tables: number;
  weekflowTables: string[];
  authSchemaReady: boolean;
  appliedMigrations: string[];
}> {
  const pool = getPool();
  if (!pool) {
    return {
      connected: false,
      tables: 0,
      weekflowTables: [],
      authSchemaReady: false,
      appliedMigrations: [],
    };
  }

  await pool.query("SELECT 1");

  const migrationsResult = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations ORDER BY filename",
  ).catch(() => ({ rows: [] as Array<{ filename: string }> }));

  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );

  const tableNames = result.rows.map((row) => row.table_name);
  const weekflowTables = WEEKFLOW_TABLES.filter((name) => tableNames.includes(name));

  const authSchemaReady = await isAuthSchemaReady();

  return {
    connected: true,
    tables: tableNames.length,
    weekflowTables,
    authSchemaReady,
    appliedMigrations: migrationsResult.rows.map((row) => row.filename),
  };
}

