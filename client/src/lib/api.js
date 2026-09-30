import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL || '';

/** fetch wrapper: attaches the Supabase JWT, parses JSON, throws Error(message) on failure. */
export async function api(path, { method = 'GET', body, form } = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = {};
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new Error('Cannot reach the API. If it is hosted on a free tier it may be waking up; retry in 30s.');
  }
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
