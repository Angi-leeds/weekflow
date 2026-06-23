import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    pool.on("error", (err) => {
      console.error("Database pool error:", err);
    });
  }

  return pool;
}

export function getDb() {
  const activePool = getPool();
  if (!activePool) {
    return null;
  }

  if (!db) {
    db = drizzle(activePool, { schema });
  }

  return db;
}

export async function testDatabaseConnection(): Promise<boolean> {
  const activePool = getPool();
  if (!activePool) {
    return false;
  }

  await activePool.query("SELECT 1");
  return true;
}

export { schema };
