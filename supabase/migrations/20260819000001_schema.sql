-- Enable UUID generation / password hashing
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────
-- Venues
-- ──────────────────────────────────────────────────────────
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  timezone text not null check (timezone like '%/%'), -- IANA, e.g. America/New_York
  capacity int not null check (capacity > 0),
  created_at timestamptz not null default now()
);

alter table public.venues enable row level security;

-- ──────────────────────────────────────────────────────────
-- Organisers (id matches auth.users.id)
-- ──────────────────────────────────────────────────────────
create table public.organisers (
  id uuid primary key, -- same as auth.uid()
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.organisers enable row level security;

-- ──────────────────────────────────────────────────────────
-- Shows
-- ──────────────────────────────────────────────────────────
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id),
  organiser_id uuid not null references public.organisers(id),
  title text not null,
  description text,
  starts_at timestamptz not null,
  base_price_minor int not null check (base_price_minor >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.shows enable row level security;

-- ──────────────────────────────────────────────────────────
-- Ticket tiers (reference data)
-- ──────────────────────────────────────────────────────────
create table public.ticket_tiers (
  id text primary key,
  label text not null,
  percentage int not null check (percentage > 0 and percentage <= 100),
  sort_order int not null default 0
);

alter table public.ticket_tiers enable row level security;

-- ──────────────────────────────────────────────────────────
-- Holds
-- ──────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────
-- Hold items
-- ──────────────────────────────────────────────────────────
create table public.hold_items (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null references public.holds(id) on delete cascade,
  tier_id text not null references public.ticket_tiers(id),
  quantity int not null check (quantity > 0),
  unit_price_minor int not null check (unit_price_minor >= 0)
);

alter table public.hold_items enable row level security;

-- ──────────────────────────────────────────────────────────
-- Bookings
-- ──────────────────────────────────────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  show_id uuid not null references public.shows(id),
  hold_id uuid not null references public.holds(id) unique,
  organiser_id uuid not null references public.organisers(id),
  customer_name text,
  customer_email text,
  subtotal_minor int not null check (subtotal_minor >= 0),
  fee_minor int not null check (fee_minor >= 0),
  total_minor int not null check (total_minor >= 0),
  created_at timestamptz not null default now(),
  constraint bookings_total_matches_parts check (total_minor = subtotal_minor + fee_minor)
);

alter table public.bookings enable row level security;

-- ──────────────────────────────────────────────────────────
-- Booking items
-- ──────────────────────────────────────────────────────────
create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  tier_id text not null references public.ticket_tiers(id),
  quantity int not null check (quantity > 0),
  unit_price_minor int not null check (unit_price_minor >= 0),
  line_total_minor int not null check (line_total_minor >= 0),
  constraint booking_items_line_matches check (line_total_minor = unit_price_minor * quantity)
);

alter table public.booking_items enable row level security;

-- ──────────────────────────────────────────────────────────
-- Grants
-- Direct writes to holds/bookings are NOT granted. Inventory mutations
-- go through SECURITY DEFINER RPCs so the capacity invariant cannot be
-- raced around by inserting rows on the Data API.
-- ──────────────────────────────────────────────────────────
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

grant select on public.venues to anon, authenticated;
grant select on public.ticket_tiers to anon, authenticated;
grant select on public.organisers to anon, authenticated;

-- Public catalogue (anon) can read every show.
-- An authenticated organiser's SELECT is scoped by RLS to their own rows,
-- so a forgotten .eq('organiser_id', …) still cannot leak another organiser.
grant select on public.shows to anon, authenticated;
grant insert, update on public.shows to authenticated;

-- Bookings are organiser-private. No anon read; RLS scopes authenticated.
grant select on public.bookings to authenticated;
grant select on public.booking_items to authenticated;

-- ──────────────────────────────────────────────────────────
-- RLS policies
-- ──────────────────────────────────────────────────────────
create policy "venues_public_read" on public.venues
  for select to anon, authenticated using (true);

create policy "tiers_public_read" on public.ticket_tiers
  for select to anon, authenticated using (true);

create policy "organisers_public_read" on public.organisers
  for select to anon, authenticated using (true);

create policy "shows_anon_read" on public.shows
  for select to anon using (true);

create policy "shows_organiser_read" on public.shows
  for select to authenticated using (organiser_id = auth.uid());

create policy "shows_organiser_insert" on public.shows
  for insert to authenticated with check (organiser_id = auth.uid());

create policy "shows_organiser_update" on public.shows
  for update to authenticated
  using (organiser_id = auth.uid())
  with check (organiser_id = auth.uid());

create policy "bookings_organiser_read" on public.bookings
  for select to authenticated using (organiser_id = auth.uid());

create policy "booking_items_organiser_read" on public.booking_items
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.organiser_id = auth.uid()
    )
  );

-- holds / hold_items: no policies for anon/authenticated → default deny.
-- service_role bypasses RLS (used only on the server for checkout-by-id).
