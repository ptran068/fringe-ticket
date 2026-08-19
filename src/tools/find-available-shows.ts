import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ShowAvailability } from '@/types/domain';

/**
 * find_available_shows — Typed concierge tool.
 *
 * Uses the SAME availability logic as the UI (get_show_availability RPC).
 * Does NOT duplicate business rules.
 *
 * Returns only genuinely bookable shows:
 * - Active status
 * - Available inventory (not sold out)
 * - Respects active holds
 * - Filters by city, date, max price, minimum seats
 */

export const FindAvailableShowsInput = z.object({
  city: z.string().optional(),
  onDate: z.string().optional(), // YYYY-MM-DD
  maxPriceMinor: z.number().int().nonnegative().optional(),
  minSeats: z.number().int().positive().optional(),
});

export type FindAvailableShowsParams = z.infer<typeof FindAvailableShowsInput>;

export interface AvailableShowResult {
  id: string;
  title: string;
  venue: string;
  city: string;
  startsAt: string;
  timezone: string;
  basePriceMinor: number;
  available: number;
  capacity: number;
}

export async function findAvailableShows(
  params: FindAvailableShowsParams,
): Promise<AvailableShowResult[]> {
  // Validate input
  const input = FindAvailableShowsInput.parse(params);

  const supabase = createAdminClient();

  // Fetch active shows with venues
  let query = supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('status', 'active')
    .order('starts_at', { ascending: true });

  // Max price filter
  if (input.maxPriceMinor !== undefined) {
    query = query.lte('base_price_minor', input.maxPriceMinor);
  }

  const { data: shows, error } = await query;
  if (error) throw new Error(`Failed to fetch shows: ${error.message}`);

  // Fetch availability for each show using the same RPC as the UI
  const results: AvailableShowResult[] = [];

  for (const show of shows ?? []) {
    const venue = show.venues;

    // City filter
    if (input.city && venue.city.toLowerCase() !== input.city.toLowerCase()) {
      continue;
    }

    // Date filter (compare in venue timezone)
    if (input.onDate) {
      const showDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: venue.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(show.starts_at));

      if (showDate !== input.onDate) continue;
    }

    // Fetch availability using the same RPC
    const { data: avail, error: availError } = await supabase.rpc(
      'get_show_availability',
      { p_show_id: show.id },
    );

    if (availError) continue;

    const availability = avail as ShowAvailability;

    // Skip sold out or unavailable
    if (availability.status === 'sold_out') continue;

    // Min seats filter
    if (input.minSeats && availability.available < input.minSeats) continue;

    results.push({
      id: show.id,
      title: show.title,
      venue: venue.name,
      city: venue.city,
      startsAt: show.starts_at,
      timezone: venue.timezone,
      basePriceMinor: show.base_price_minor,
      available: availability.available,
      capacity: availability.capacity,
    });
  }

  return results;
}
