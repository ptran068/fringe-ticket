import { createAnonClient } from '@/lib/supabase/anon';
import { createClient } from '@/lib/supabase/server';
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
const QUERY_MAX_LENGTH = 80;
const LIST_FETCH_SIZE = 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function catalogueQuery(value: string | undefined): string | null {
  const q = value?.trim().slice(0, QUERY_MAX_LENGTH);
  return q ? q : null;
}

function catalogueVenueId(value: string | undefined): string | null {
  return value && UUID_RE.test(value) ? value : null;
}

interface ListShowsRpc {
  data: ShowWithAvailability[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function applyNameVenueFilters(
  rows: ShowWithAvailability[],
  q: string | null,
  venueId: string | null,
): ShowWithAvailability[] {
  const needle = q?.toLowerCase();
  return rows.filter((show) => {
    if (needle && !show.title.toLowerCase().includes(needle)) return false;
    if (venueId && show.venue_id !== venueId) return false;
    return true;
  });
}

function toPage(
  rows: ShowWithAvailability[],
  page: number,
  pageSize: number,
): PaginatedResult<ShowWithAvailability> {
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

/** Public catalogue. Uses the anon key so RLS is the public-read policy. */
export async function getShows(
  filters: ShowFilters = {},
): Promise<PaginatedResult<ShowWithAvailability>> {
  const supabase = createAnonClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const q = catalogueQuery(filters.q);
  const venueId = catalogueVenueId(filters.venue);

  const rpcArgs = {
    p_city: !venueId && filters.city && filters.city !== 'all' ? filters.city : null,
    p_availability:
      filters.availability && filters.availability !== 'all' ? filters.availability : null,
    p_sort: filters.sort ?? 'starts_at',
    p_page: q || venueId ? 1 : page,
    p_page_size: q || venueId ? LIST_FETCH_SIZE : pageSize,
  };

  const { data, error } = await supabase.rpc('list_shows', rpcArgs);

  if (error) {
    throw new Error(`Failed to fetch shows: ${error.message}`);
  }

  const result = data as ListShowsRpc;
  const rows = result.data ?? [];

  if (q || venueId) {
    return toPage(applyNameVenueFilters(rows, q, venueId), page, pageSize);
  }

  return {
    data: rows,
    total: result.total,
    page: result.page,
    pageSize: result.page_size,
    totalPages: result.total_pages,
  };
}

export async function getShow(showId: string): Promise<Show | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('id', showId)
    .single();

  if (error) return null;
  return data as Show;
}

export async function getShowAvailability(showId: string): Promise<ShowAvailability> {
  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc('get_show_availability', {
    p_show_id: showId,
  });

  if (error) {
    throw new Error(`Failed to fetch availability: ${error.message}`);
  }

  return data as ShowAvailability;
}

export async function getTicketTiers(): Promise<TicketTier[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase.from('ticket_tiers').select('*').order('sort_order');

  if (error) throw new Error(`Failed to fetch tiers: ${error.message}`);
  return data as TicketTier[];
}

export async function getCities(): Promise<string[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase.from('venues').select('city').order('city');

  if (error) throw new Error(`Failed to fetch cities: ${error.message}`);

  return [...new Set((data as Venue[]).map((v) => v.city))];
}

export async function getVenues(): Promise<Venue[]> {
  const supabase = createAnonClient();
  const { data, error } = await supabase.from('venues').select('*').order('name');
  if (error) throw new Error(`Failed to fetch venues: ${error.message}`);
  return data as Venue[];
}

/**
 * Organiser catalogue. Deliberately unfiltered — RLS returns only
 * organiser_id = auth.uid() rows. A forgotten .eq() cannot leak.
 */
export async function getOrganiserShows(): Promise<ShowWithAvailability[]> {
  const supabase = await createClient();

  const { data: shows, error } = await supabase
    .from('shows')
    .select('*, venues(*)')
    .order('starts_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch organiser shows: ${error.message}`);

  return Promise.all(
    (shows as unknown as Show[]).map(async (show) => {
      const availability = await getShowAvailability(show.id);
      return { ...show, availability };
    }),
  );
}

export async function getOrganiserBookings() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('*, booking_items(*, ticket_tiers(*)), shows(*, venues(*))')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
  return data;
}

export async function getOrganiserShow(showId: string): Promise<Show | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('id', showId)
    .single();
  if (error) return null;
  return data as Show;
}

/** Checkout by hold UUID. Table SELECT is denied to anon; RPC is the capability. */
export async function getHold(holdId: string) {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc('get_hold_public', { p_hold_id: holdId });
  if (error || !data) return null;
  return data as {
    id: string;
    status: string;
    expires_at: string;
    quantity: number;
    shows: {
      id: string;
      title: string;
      starts_at: string;
      base_price_minor: number;
      venues: {
        name: string;
        city: string;
        timezone: string;
      };
    };
    hold_items: {
      id: string;
      tier_id: string;
      quantity: number;
      unit_price_minor: number;
      ticket_tiers: {
        label: string;
        percentage: number;
      };
    }[];
  };
}

export async function getBooking(bookingId: string) {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc('get_booking_public', { p_booking_id: bookingId });
  if (error || !data) return null;
  return data as {
    id: string;
    reference: string;
    subtotal_minor: number;
    fee_minor: number;
    total_minor: number;
    shows: {
      id: string;
      title: string;
      starts_at: string;
      venues: { name: string; city: string; timezone: string };
    };
    booking_items: {
      tier_id: string;
      quantity: number;
      line_total_minor: number;
      ticket_tiers: { label: string };
    }[];
  };
}
