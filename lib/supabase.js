import { createClient } from '@supabase/supabase-js';

// Server-only database client. The service role key never reaches the browser
// because this file is only imported by API routes and server components.
let client;
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
