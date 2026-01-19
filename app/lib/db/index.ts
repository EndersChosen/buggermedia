import { drizzle } from 'drizzle-orm/vercel-postgres';
import { createPool } from '@vercel/postgres';
import type { VercelPool } from '@vercel/postgres';
import * as schema from './schema';

let pool: VercelPool | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

function resolvePostgresConnectionString(): string | undefined {
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE;
  const port = process.env.POSTGRES_PORT;

  if (!host || !user || !password || !database) return undefined;

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const encodedDatabase = encodeURIComponent(database);
  const encodedHost = host.includes(':') ? `[${host}]` : host;
  const resolvedPort = port ? `:${port}` : '';

  // Default to sslmode=require since Vercel Postgres expects TLS; local Postgres can set POSTGRES_SSLMODE=disable.
  const sslmode = process.env.POSTGRES_SSLMODE;
  const query = sslmode ? `?sslmode=${encodeURIComponent(sslmode)}` : '';

  return `postgres://${encodedUser}:${encodedPassword}@${encodedHost}${resolvedPort}/${encodedDatabase}${query}`;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(resolvePostgresConnectionString());
}

export function getDb() {
  if (dbInstance) return dbInstance;

  const connectionString = resolvePostgresConnectionString();
  if (!connectionString) {
    throw new Error(
      "Database not configured. Set POSTGRES_URL (Vercel) or DATABASE_URL, or POSTGRES_HOST/POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DATABASE."
    );
  }

  pool = createPool({ connectionString });
  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

// Export schema for convenience
export { schema };

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    if (!pool) {
      // Ensure pool is created even if getDb() hasn't been called yet
      const connectionString = resolvePostgresConnectionString();
      if (!connectionString) return false;
      pool = createPool({ connectionString });
    }

    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
