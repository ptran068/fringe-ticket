-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Venues
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  timezone text not null, -- IANA timezone e.g. 'America/New_York'
  capacity int not null check (capacity > 0),
  created_at timestamptz not null default now()
);

alter table public.venues enable row level security;
create policy "venues_public_read" on public.venues for select using (true);

-- Organisers
create table public.organisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.organisers enable row level security;
create policy "organisers_read" on public.organisers for select using (true);

-- Shows
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id),
  organiser_id uuid not null references public.organisers(id),
  title text not null,
  description text,
  starts_at timestamptz not null,
  base_price_minor int not null check (base_price_minor >= 0), -- cents
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.shows enable row level security;
create policy "shows_public_read" on public.shows for select using (true);
create policy "shows_organiser_insert" on public.shows for insert with check (true); -- We check org ownership in server actions
create policy "shows_organiser_update" on public.shows for update using (true);
create policy "shows_organiser_delete" on public.shows for delete using (true);

-- Ticket tiers (reference data)
create table public.ticket_tiers (
  id text primary key, -- 'full_price', 'concession', 'under_26'
  label text not null,
  percentage int not null check (percentage > 0 and percentage <= 100),
  sort_order int not null default 0
);

alter table public.ticket_tiers enable row level security;
create policy "tiers_public_read" on public.ticket_tiers for select using (true);

-- Holds
create table public.holds (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id),
  customer_name text,
  customer_email text,
  quantity int not null check (quantity > 0),
  status text not null default 'active' check (status in ('active', 'expired', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

alter table public.holds enable row level security;
create policy "holds_public_read" on public.holds for select using (true);
create policy "holds_public_insert" on public.holds for insert with check (true);
create policy "holds_public_update" on public.holds for update using (true);

-- Hold items (line items per tier)
create table public.hold_items (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null references public.holds(id) on delete cascade,
  tier_id text not null references public.ticket_tiers(id),
  quantity int not null check (quantity > 0),
  unit_price_minor int not null check (unit_price_minor >= 0)
);

alter table public.hold_items enable row level security;
create policy "hold_items_public_read" on public.hold_items for select using (true);
create policy "hold_items_public_insert" on public.hold_items for insert with check (true);

-- Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique, -- 'FRG-XXXXXX'
  show_id uuid not null references public.shows(id),
  hold_id uuid not null references public.holds(id) unique,
  organiser_id uuid not null references public.organisers(id),
  customer_name text,
  customer_email text,
  subtotal_minor int not null check (subtotal_minor >= 0),
  fee_minor int not null check (fee_minor >= 0),
  total_minor int not null check (total_minor >= 0),
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;
create policy "bookings_public_insert" on public.bookings for insert with check (true);
create policy "bookings_public_read" on public.bookings for select using (true);

-- Booking items
create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  tier_id text not null references public.ticket_tiers(id),
  quantity int not null check (quantity > 0),
  unit_price_minor int not null check (unit_price_minor >= 0),
  line_total_minor int not null check (line_total_minor >= 0)
);

alter table public.booking_items enable row level security;
create policy "booking_items_public_read" on public.booking_items for select using (true);
create policy "booking_items_public_insert" on public.booking_items for insert with check (true);
