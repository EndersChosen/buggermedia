import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql as vercelSql } from '@vercel/postgres';
import * as schema from './schema';

// Create the drizzle instance
export const db = drizzle(vercelSql, { schema });

// Export schema for convenience
export { schema };

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await vercelSql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
