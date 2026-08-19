// ──────────────────────────────────────────────────────────
// Domain types — shared between server and client
// ──────────────────────────────────────────────────────────

/** Venue */
export interface Venue {
  id: string;
  name: string;
  city: string;
  timezone: string;
  capacity: number;
}

/** Organiser */
export interface Organiser {
  id: string;
  name: string;
  email: string;
}

export const DEMO_ORGANISERS = [
  { email: 'hello@fringemavericks.com', name: 'Fringe Mavericks' },
  { email: 'contact@undergroundarts.org', name: 'Underground Arts' },
] as const;

export const DEMO_ORGANISER_PASSWORD = 'fringe-demo-2026';

/** Show status */
export type ShowStatus = 'active' | 'inactive';

/** Show with venue data */
export interface Show {
  id: string;
  venue_id: string;
  organiser_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  base_price_minor: number;
  status: ShowStatus;
  created_at: string;
  venues: Venue;
}

/** Ticket tier */
export interface TicketTier {
  id: string;
  label: string;
  percentage: number;
  sort_order: number;
}

/** Availability status */
export type AvailabilityStatus = 'available' | 'temporarily_unavailable' | 'sold_out';

/** Availability info for a show */
export interface ShowAvailability {
  capacity: number;
  sold: number;
  held: number;
  available: number;
  status: AvailabilityStatus;
}

/** Show with availability (for browsing) */
export interface ShowWithAvailability extends Show {
  availability: ShowAvailability;
  price_from_minor?: number;
}

/** Hold status */
export type HoldStatus = 'active' | 'expired' | 'confirmed' | 'cancelled';

/** Hold */
export interface Hold {
  id: string;
  show_id: string;
  customer_name: string | null;
  customer_email: string | null;
  quantity: number;
  status: HoldStatus;
  created_at: string;
  expires_at: string;
}

/** Hold item (line item per tier) */
export interface HoldItem {
  id: string;
  hold_id: string;
  tier_id: string;
  quantity: number;
  unit_price_minor: number;
}

/** Hold with items and show data */
export interface HoldWithDetails extends Hold {
  hold_items: (HoldItem & { ticket_tiers: TicketTier })[];
  shows: Show;
}

/** Booking */
export interface Booking {
  id: string;
  reference: string;
  show_id: string;
  hold_id: string;
  organiser_id: string;
  customer_name: string | null;
  customer_email: string | null;
  subtotal_minor: number;
  fee_minor: number;
  total_minor: number;
  created_at: string;
}

/** Booking item */
export interface BookingItem {
  id: string;
  booking_id: string;
  tier_id: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
}

/** Booking with full details */
export interface BookingWithDetails extends Booking {
  booking_items: (BookingItem & { ticket_tiers: TicketTier })[];
  shows: Show;
}

/** Create hold result from RPC */
export interface CreateHoldResult {
  success: boolean;
  hold_id?: string;
  expires_at?: string;
  quantity?: number;
  error?: string;
  available?: number;
  requested?: number;
}

/** Confirm hold result from RPC */
export interface ConfirmHoldResult {
  success: boolean;
  booking_id?: string;
  reference?: string;
  subtotal_minor?: number;
  fee_minor?: number;
  total_minor?: number;
  error?: string;
}

/** Pagination */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Show filter params */
export interface ShowFilters {
  city?: string;
  availability?: AvailabilityStatus | 'all';
  sort?: 'starts_at' | 'price_asc' | 'price_desc';
  page?: number;
  pageSize?: number;
}
