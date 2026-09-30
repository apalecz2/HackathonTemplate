import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../.env') });

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a URL'),
  SUPABASE_JWT_SECRET: z.string().optional(),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
});

// Tests set SKIP_ENV_CHECK so they can run without real credentials.
const source =
  process.env.SKIP_ENV_CHECK === '1'
    ? { DATABASE_URL: 'postgres://test', SUPABASE_URL: 'https://test.supabase.co', ...process.env }
    : process.env;

const parsed = schema.safeParse(source);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`Missing or invalid environment variables:\n${lines.join('\n')}\nSee .env.example`);
  process.exit(1);
}

export const env = parsed.data;
