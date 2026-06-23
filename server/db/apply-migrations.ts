import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { getPool } from "./index";

const migrationsDir = path.join(process.cwd(), "migrations");

/** Serializes concurrent migration runs on Replit autoscale. */
const LOCK_KEY = 847291;

const WEEKFLOW_TABLES = [
  "households",
  "household_members",
  "links",
  "item_shares",
  "board_pins",
  "attachments",
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

    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations directory found — skipping");
      return;
    }

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
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    lockClient.release();
  }
}

export async function getDatabaseStatus(): Promise<{
  connected: boolean;
  tables: number;
  weekflowTables: string[];
}> {
  const pool = getPool();
  if (!pool) {
    return { connected: false, tables: 0, weekflowTables: [] };
  }

  await pool.query("SELECT 1");

  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );

  const tableNames = result.rows.map((row) => row.table_name);
  const weekflowTables = WEEKFLOW_TABLES.filter((name) => tableNames.includes(name));

  return {
    connected: true,
    tables: tableNames.length,
    weekflowTables,
  };
}

/** CLI entry: npm run db:migrate */
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  applyPendingMigrations()
    .then(() => {
      console.log("Migrations complete.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
