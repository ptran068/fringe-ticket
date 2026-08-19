'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  Show,
  ShowWithAvailability,
  ShowAvailability,
  TicketTier,
  PaginatedResult,
  ShowFilters,
  Venue,
} from '@/types/domain';

const PAGE_SIZE = 10;

/** Fetch paginated shows with availability */
export async function getShows(filters: ShowFilters = {}): Promise<PaginatedResult<ShowWithAvailability>> {
  const supabase = createAdminClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  // Base query for shows with venues
  let query = supabase
    .from('shows')
    .select('*, venues(*)', { count: 'exact' })
    .eq('status', 'active')
    .order('starts_at', { ascending: true });

  // City filter via venue join
  if (filters.city && filters.city !== 'all') {
    // We need to filter by venue city — use a subquery approach
    const { data: venueIds } = await supabase
      .from('venues')
      .select('id')
      .eq('city', filters.city);

    if (venueIds && venueIds.length > 0) {
      query = query.in('venue_id', venueIds.map((v) => v.id));
    } else {
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }
  }

  // Sort
  if (filters.sort === 'price_asc') {
    query = query.order('base_price_minor', { ascending: true });
  } else if (filters.sort === 'price_desc') {
    query = query.order('base_price_minor', { ascending: false });
  }

  // Pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data: shows, count, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch shows: ${error.message}`);
  }

  // Fetch availability for each show
  const showsWithAvailability: ShowWithAvailability[] = await Promise.all(
    (shows as Show[]).map(async (show) => {
      const availability = await getShowAvailability(show.id);
      return { ...show, availability };
    }),
  );

  // Filter by availability status if specified
  let filtered = showsWithAvailability;
  if (filters.availability && filters.availability !== 'all') {
    filtered = showsWithAvailability.filter((s) => s.availability.status === filters.availability);
  }

  const total = filters.availability && filters.availability !== 'all'
    ? filtered.length
    : (count ?? 0);

  return {
    data: filtered,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Fetch a single show with venue */
export async function getShow(showId: string): Promise<Show | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('id', showId)
    .single();

  if (error) return null;
  return data as Show;
}

/** Fetch show availability via RPC */
export async function getShowAvailability(showId: string): Promise<ShowAvailability> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_show_availability', {
    p_show_id: showId,
  });

  if (error) {
    throw new Error(`Failed to fetch availability: ${error.message}`);
  }

  return data as ShowAvailability;
}

/** Get all ticket tiers */
export async function getTicketTiers(): Promise<TicketTier[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ticket_tiers')
    .select('*')
    .order('sort_order');

  if (error) throw new Error(`Failed to fetch tiers: ${error.message}`);
  return data as TicketTier[];
}

/** Get all distinct cities from venues */
export async function getCities(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('venues')
    .select('city')
    .order('city');

  if (error) throw new Error(`Failed to fetch cities: ${error.message}`);

  // Deduplicate
  const cities = [...new Set((data as Venue[]).map((v) => v.city))];
  return cities;
}

/** Fetch shows for an organiser */
export async function getOrganiserShows(organiserId: string): Promise<ShowWithAvailability[]> {
  const supabase = createAdminClient();

  const { data: shows, error } = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('organiser_id', organiserId)
    .order('starts_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch organiser shows: ${error.message}`);

  return Promise.all(
    (shows as Show[]).map(async (show) => {
      const availability = await getShowAvailability(show.id);
      return { ...show, availability };
    }),
  );
}

/** Fetch bookings for an organiser's shows */
export async function getOrganiserBookings(organiserId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('*, booking_items(*, ticket_tiers(*)), shows(*, venues(*))')
    .eq('organiser_id', organiserId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
  return data;
}

/** Fetch a single booking by ID */
export async function getBooking(bookingId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('*, booking_items(*, ticket_tiers(*)), shows(*, venues(*))')
    .eq('id', bookingId)
    .single();

  if (error) return null;
  return data;
}

/** Fetch a hold with its items and show data */
export async function getHold(holdId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('holds')
    .select('*, hold_items(*, ticket_tiers(*)), shows(*, venues(*))')
    .eq('id', holdId)
    .single();

  if (error) return null;
  return data;
}

/** Get all organisers */
export async function getOrganisers() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('organisers').select('*');
  if (error) throw new Error(`Failed to fetch organisers: ${error.message}`);
  return data;
}

/** Get all venues */
export async function getVenues() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('venues').select('*').order('name');
  if (error) throw new Error(`Failed to fetch venues: ${error.message}`);
  return data;
}
