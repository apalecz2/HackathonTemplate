import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// Placeholder values keep the app from crashing before .env is filled in; App shows a setup notice.
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing');
