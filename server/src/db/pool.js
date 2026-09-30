import pg from 'pg';
import { env } from '../env.js';

// Supabase requires SSL; local Postgres usually doesn't.
const useSsl = !/localhost|127\.0\.0\.1/.test(env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  // Each serverless instance holds its own pool, so keep it small on Vercel to stay under
  // Supabase's pooler connection limit.
  max: process.env.VERCEL ? 2 : 5,
});

export const query = (text, params) => pool.query(text, params);

/** Run fn inside a transaction; rolls back on error. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
