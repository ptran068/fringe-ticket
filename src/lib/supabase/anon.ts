import { createClient } from '@supabase/supabase-js';

/**
 * Anonymous Data API client. No session cookies.
 *
 * Public catalogue reads MUST use this, not the cookie client: an
 * authenticated organiser's JWT only passes RLS for their own shows.
 */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase anon credentials');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
