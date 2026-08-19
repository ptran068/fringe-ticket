import { z } from 'zod';
import { createAnonClient } from '@/lib/supabase/anon';
import { isGenuinelyBookable } from '@/domain/availability';
import { isOnDate } from '@/domain/time';
import { priceFrom } from '@/domain/pricing';
import type { ShowAvailability, TicketTier, Venue } from '@/types/domain';

/**
 * find_available_shows — typed concierge tool.
 *
 * Uses get_show_availability (same RPC as the UI). Does not duplicate
 * inventory rules. Returns only genuinely bookable shows.
 */

export const FindAvailableShowsInput = z.object({
  city: z.string().optional(),
  onDate: z.string().optional(),
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
  priceFromMinor: number;
  available: number;
  capacity: number;
}

interface ShowRow {
  id: string;
  title: string;
  starts_at: string;
  base_price_minor: number;
  status: string;
  venues: Venue;
}

export async function findAvailableShows(
  params: FindAvailableShowsParams,
): Promise<AvailableShowResult[]> {
  const input = FindAvailableShowsInput.parse(params);
  const supabase = createAnonClient();
  const minSeats = input.minSeats ?? 1;

  const { data: tiers, error: tierError } = await supabase
    .from('ticket_tiers')
    .select('percentage');
  if (tierError) throw new Error(`Failed to fetch tiers: ${tierError.message}`);
  const percentages = ((tiers as Pick<TicketTier, 'percentage'>[]) ?? []).map((t) => t.percentage);

  const { data: shows, error } = await supabase
    .from('shows')
    .select('id, title, starts_at, base_price_minor, status, venues(*)')
    .eq('status', 'active')
    .order('starts_at', { ascending: true });
  if (error) throw new Error(`Failed to fetch shows: ${error.message}`);

  const results: AvailableShowResult[] = [];

  for (const show of (shows ?? []) as unknown as ShowRow[]) {
    const venue = show.venues;
    if (input.city && venue.city.toLowerCase() !== input.city.toLowerCase()) {
      continue;
    }

    if (input.onDate && !isOnDate(show.starts_at, input.onDate, venue.timezone)) {
      continue;
    }

    const cheapest = priceFrom(show.base_price_minor, percentages);
    if (input.maxPriceMinor !== undefined && cheapest > input.maxPriceMinor) {
      continue;
    }

    const { data: avail, error: availError } = await supabase.rpc('get_show_availability', {
      p_show_id: show.id,
    });
    if (availError) continue;

    const availability = avail as ShowAvailability;
    if (!isGenuinelyBookable(availability, minSeats)) continue;

    results.push({
      id: show.id,
      title: show.title,
      venue: venue.name,
      city: venue.city,
      startsAt: show.starts_at,
      timezone: venue.timezone,
      basePriceMinor: show.base_price_minor,
      priceFromMinor: cheapest,
      available: availability.available,
      capacity: availability.capacity,
    });
  }

  return results;
}
