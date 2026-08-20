import { loadEnvFiles } from '../../scripts/load-env';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

loadEnvFiles(['.env.local', '.env.example']);

/** Bracket access so Vite does not inline empty NEXT_PUBLIC_* values in CI. */
function env(name: string): string {
  return process.env[name] ?? '';
}

export const ORG_A = '00000000-0000-0000-0000-000000000001';

export function adminClient(): SupabaseClient {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function dbAvailable(): Promise<boolean> {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key },
    });
    return res.ok || res.status === 401;
  } catch {
    return false;
  }
}

export async function createCapacityOneShow(supabase: SupabaseClient) {
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .insert({
      name: `Test ${Date.now()}`,
      city: 'IntegrityCity',
      timezone: 'Asia/Singapore',
      capacity: 1,
    })
    .select('id')
    .single();
  if (venueError || !venue) throw new Error(venueError?.message ?? 'venue insert failed');

  const { data: show, error: showError } = await supabase
    .from('shows')
    .insert({
      venue_id: venue.id,
      organiser_id: ORG_A,
      title: 'One seat',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      base_price_minor: 1000,
      status: 'active',
    })
    .select('id')
    .single();
  if (showError || !show) throw new Error(showError?.message ?? 'show insert failed');

  return { venueId: venue.id as string, showId: show.id as string };
}

export async function cleanupShow(supabase: SupabaseClient, venueId: string, showId: string) {
  const { data: bookings } = await supabase.from('bookings').select('id').eq('show_id', showId);
  if (bookings) {
    for (const b of bookings) {
      await supabase.from('booking_items').delete().eq('booking_id', b.id);
    }
  }
  await supabase.from('bookings').delete().eq('show_id', showId);
  const { data: holds } = await supabase.from('holds').select('id').eq('show_id', showId);
  if (holds) {
    for (const h of holds) {
      await supabase.from('hold_items').delete().eq('hold_id', h.id);
    }
  }
  await supabase.from('holds').delete().eq('show_id', showId);
  await supabase.from('shows').delete().eq('id', showId);
  await supabase.from('venues').delete().eq('id', venueId);
}
