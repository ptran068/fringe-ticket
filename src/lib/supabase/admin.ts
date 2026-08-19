import { createClient } from '@supabase/supabase-js';

/**
 * Admin/service-role Supabase client.
 * NEVER import this in client components or expose to the browser.
 * Used only in server actions and server-side code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
