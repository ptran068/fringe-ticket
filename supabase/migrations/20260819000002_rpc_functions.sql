-- Shared inventory counts. Sold comes from booking_items (confirmed purchases).
-- Held comes from active, non-expired holds. Expired holds are excluded even
-- if nobody has swept their status.
create or replace function public.show_counts(p_show_id uuid)
returns table (capacity int, sold int, held int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.capacity,
    coalesce((
      select sum(bi.quantity)::int
      from public.bookings b
      join public.booking_items bi on bi.booking_id = b.id
      where b.show_id = p_show_id
    ), 0),
    coalesce((
      select sum(h.quantity)::int
      from public.holds h
      where h.show_id = p_show_id
        and h.status = 'active'
        and h.expires_at > now()
    ), 0)
  from public.shows s
  join public.venues v on v.id = s.venue_id
  where s.id = p_show_id;
$$;

revoke all on function public.show_counts(uuid) from public, anon, authenticated;

-- =============================================================
-- create_hold: Atomically creates a hold if capacity allows
-- =============================================================
create or replace function public.create_hold(
  p_show_id uuid,
  p_items jsonb,
  p_customer_name text default null,
  p_customer_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity int;
  v_sold int;
  v_held int;
  v_total_quantity int;
  v_available int;
  v_hold_id uuid;
  v_expires_at timestamptz;
  v_item jsonb;
  v_tier_pct int;
  v_base_price int;
begin
  select coalesce(sum((item->>'quantity')::int), 0)
  into v_total_quantity
  from jsonb_array_elements(p_items) as item;

  if v_total_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  -- Serialize concurrent holds/confirms on this show.
  select s.base_price_minor
  into v_base_price
  from public.shows s
  where s.id = p_show_id
    and s.status = 'active'
  for update of s;

  if not found then
    raise exception 'SHOW_NOT_FOUND';
  end if;

  select sc.capacity, sc.sold, sc.held
  into v_capacity, v_sold, v_held
  from public.show_counts(p_show_id) sc;

  v_available := v_capacity - v_sold - v_held;

  if v_available < v_total_quantity then
    return jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_INVENTORY',
      'available', v_available,
      'requested', v_total_quantity
    );
  end if;

  v_expires_at := now() + interval '10 minutes';

  insert into public.holds (show_id, customer_name, customer_email, quantity, status, expires_at)
  values (p_show_id, p_customer_name, p_customer_email, v_total_quantity, 'active', v_expires_at)
  returning id into v_hold_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select percentage into v_tier_pct
    from public.ticket_tiers
    where id = v_item->>'tier_id';

    if not found then
      raise exception 'INVALID_TIER: %', v_item->>'tier_id';
    end if;

    insert into public.hold_items (hold_id, tier_id, quantity, unit_price_minor)
    values (
      v_hold_id,
      v_item->>'tier_id',
      (v_item->>'quantity')::int,
      round(v_base_price * v_tier_pct / 100.0)
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'hold_id', v_hold_id,
    'expires_at', v_expires_at,
    'quantity', v_total_quantity
  );
end;
$$;

-- =============================================================
-- confirm_hold: Atomically confirms a hold into a booking
-- =============================================================
create or replace function public.confirm_hold(
  p_hold_id uuid,
  p_customer_name text default null,
  p_customer_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold record;
  v_booking_id uuid;
  v_reference text;
  v_subtotal int;
  v_fee int;
  v_total int;
  v_organiser_id uuid;
begin
  -- Lock the show AND the hold so create_hold and confirm_hold share
  -- a single serialization point on the show row.
  select h.*, s.organiser_id as show_organiser_id
  into v_hold
  from public.holds h
  join public.shows s on s.id = h.show_id
  where h.id = p_hold_id
  for update of h, s;

  if not found then
    return jsonb_build_object('success', false, 'error', 'HOLD_NOT_FOUND');
  end if;

  if v_hold.status != 'active' then
    return jsonb_build_object('success', false, 'error', 'HOLD_NOT_ACTIVE');
  end if;

  if v_hold.expires_at <= now() then
    update public.holds set status = 'expired' where id = p_hold_id;
    return jsonb_build_object('success', false, 'error', 'HOLD_EXPIRED');
  end if;

  v_organiser_id := v_hold.show_organiser_id;

  select coalesce(sum(hi.unit_price_minor * hi.quantity), 0)
  into v_subtotal
  from public.hold_items hi
  where hi.hold_id = p_hold_id;

  -- 6% fee, round half-up, capped at $9.00
  v_fee := least(round(v_subtotal * 6 / 100.0), 900);
  v_total := v_subtotal + v_fee;

  v_reference := 'FRG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.bookings (
    reference, show_id, hold_id, organiser_id,
    customer_name, customer_email,
    subtotal_minor, fee_minor, total_minor
  )
  values (
    v_reference, v_hold.show_id, p_hold_id, v_organiser_id,
    coalesce(p_customer_name, v_hold.customer_name),
    coalesce(p_customer_email, v_hold.customer_email),
    v_subtotal, v_fee, v_total
  )
  returning id into v_booking_id;

  insert into public.booking_items (booking_id, tier_id, quantity, unit_price_minor, line_total_minor)
  select v_booking_id, hi.tier_id, hi.quantity, hi.unit_price_minor, hi.unit_price_minor * hi.quantity
  from public.hold_items hi
  where hi.hold_id = p_hold_id;

  update public.holds set status = 'confirmed' where id = p_hold_id;

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'reference', v_reference,
    'subtotal_minor', v_subtotal,
    'fee_minor', v_fee,
    'total_minor', v_total
  );
end;
$$;

-- =============================================================
-- get_show_availability
-- =============================================================
create or replace function public.get_show_availability(p_show_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_capacity int;
  v_sold int;
  v_held int;
  v_available int;
begin
  select sc.capacity, sc.sold, sc.held
  into v_capacity, v_sold, v_held
  from public.show_counts(p_show_id) sc;

  if not found then
    return jsonb_build_object('error', 'SHOW_NOT_FOUND');
  end if;

  v_available := v_capacity - v_sold - v_held;
  if v_available < 0 then v_available := 0; end if;

  return jsonb_build_object(
    'capacity', v_capacity,
    'sold', v_sold,
    'held', v_held,
    'available', v_available,
    'status', case
      when v_sold >= v_capacity then 'sold_out'
      when v_available = 0 then 'temporarily_unavailable'
      else 'available'
    end
  );
end;
$$;

-- =============================================================
-- list_shows: paginate AFTER availability filter (correct totals)
-- =============================================================
create or replace function public.list_shows(
  p_city text default null,
  p_availability text default null,
  p_sort text default 'starts_at',
  p_page int default 1,
  p_page_size int default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_size int := greatest(coalesce(p_page_size, 10), 1);
  v_offset int;
  v_total int;
  v_data jsonb;
begin
  v_offset := (v_page - 1) * v_size;

  -- CTEs are visible only to the immediately following statement, so count
  -- and page must be computed in one query.
  with inv as (
    select
      s.id,
      s.venue_id,
      s.organiser_id,
      s.title,
      s.description,
      s.starts_at,
      s.base_price_minor,
      s.status,
      s.created_at,
      v.name as venue_name,
      v.city as venue_city,
      v.timezone as venue_timezone,
      v.capacity as venue_capacity,
      coalesce(sold.qty, 0)::int as sold,
      coalesce(held.qty, 0)::int as held,
      greatest(v.capacity - coalesce(sold.qty, 0) - coalesce(held.qty, 0), 0)::int as available,
      case
        when coalesce(sold.qty, 0) >= v.capacity then 'sold_out'
        when v.capacity - coalesce(sold.qty, 0) - coalesce(held.qty, 0) <= 0 then 'temporarily_unavailable'
        else 'available'
      end as availability_status,
      (
        select min(round(s.base_price_minor * tt.percentage / 100.0))::int
        from public.ticket_tiers tt
      ) as price_from_minor
    from public.shows s
    join public.venues v on v.id = s.venue_id
    left join (
      select b.show_id, sum(bi.quantity) as qty
      from public.bookings b
      join public.booking_items bi on bi.booking_id = b.id
      group by b.show_id
    ) sold on sold.show_id = s.id
    left join (
      select h.show_id, sum(h.quantity) as qty
      from public.holds h
      where h.status = 'active' and h.expires_at > now()
      group by h.show_id
    ) held on held.show_id = s.id
    where s.status = 'active'
      and (p_city is null or p_city = 'all' or v.city = p_city)
  ),
  filtered as (
    select * from inv
    where p_availability is null
       or p_availability = 'all'
       or availability_status = p_availability
  ),
  numbered as (
    select
      f.*,
      count(*) over () as total,
      row_number() over (
        order by
          case when p_sort = 'price_asc' then f.price_from_minor end asc nulls last,
          case when p_sort = 'price_desc' then f.price_from_minor end desc nulls last,
          f.starts_at asc
      ) as rn
    from filtered f
  )
  select
    coalesce((select n.total from numbered n limit 1), 0),
    coalesce(
      (
        select jsonb_agg(q.row_obj order by q.rn)
        from (
          select
            jsonb_build_object(
              'id', n.id,
              'venue_id', n.venue_id,
              'organiser_id', n.organiser_id,
              'title', n.title,
              'description', n.description,
              'starts_at', n.starts_at,
              'base_price_minor', n.base_price_minor,
              'price_from_minor', n.price_from_minor,
              'status', n.status,
              'created_at', n.created_at,
              'venues', jsonb_build_object(
                'id', n.venue_id,
                'name', n.venue_name,
                'city', n.venue_city,
                'timezone', n.venue_timezone,
                'capacity', n.venue_capacity
              ),
              'availability', jsonb_build_object(
                'capacity', n.venue_capacity,
                'sold', n.sold,
                'held', n.held,
                'available', n.available,
                'status', n.availability_status
              )
            ) as row_obj,
            n.rn
          from numbered n
          where n.rn > v_offset and n.rn <= v_offset + v_size
        ) q
      ),
      '[]'::jsonb
    )
  into v_total, v_data;

  return jsonb_build_object(
    'data', v_data,
    'total', v_total,
    'page', v_page,
    'page_size', v_size,
    'total_pages', case when v_total = 0 then 0 else ceil(v_total::numeric / v_size) end
  );
end;
$$;

-- Checkout/confirmation: UUID in the URL is the capability. Not granted as
-- table SELECT to anon, so organisers cannot enumerate bookings via PostgREST.
create or replace function public.get_hold_public(p_hold_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hold jsonb;
begin
  select to_jsonb(h) || jsonb_build_object(
    'hold_items', coalesce((
      select jsonb_agg(
        to_jsonb(hi) || jsonb_build_object('ticket_tiers', to_jsonb(tt))
      )
      from public.hold_items hi
      join public.ticket_tiers tt on tt.id = hi.tier_id
      where hi.hold_id = h.id
    ), '[]'::jsonb),
    'shows', (
      select to_jsonb(s) || jsonb_build_object('venues', to_jsonb(v))
      from public.shows s
      join public.venues v on v.id = s.venue_id
      where s.id = h.show_id
    )
  )
  into v_hold
  from public.holds h
  where h.id = p_hold_id;

  if v_hold is null then
    return null;
  end if;

  return v_hold;
end;
$$;

create or replace function public.get_booking_public(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_booking jsonb;
begin
  select to_jsonb(b) || jsonb_build_object(
    'booking_items', coalesce((
      select jsonb_agg(
        to_jsonb(bi) || jsonb_build_object('ticket_tiers', to_jsonb(tt))
      )
      from public.booking_items bi
      join public.ticket_tiers tt on tt.id = bi.tier_id
      where bi.booking_id = b.id
    ), '[]'::jsonb),
    'shows', (
      select to_jsonb(s) || jsonb_build_object('venues', to_jsonb(v))
      from public.shows s
      join public.venues v on v.id = s.venue_id
      where s.id = b.show_id
    )
  )
  into v_booking
  from public.bookings b
  where b.id = p_booking_id;

  return v_booking;
end;
$$;

-- Schema facts for the integrity guard (service role only in practice).
create or replace function public.integrity_schema_report()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'starts_at_udt', (
      select c.udt_name from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'shows' and c.column_name = 'starts_at'
    ),
    'expires_at_udt', (
      select c.udt_name from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'holds' and c.column_name = 'expires_at'
    ),
    'rls_shows', (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = 'shows'),
    'rls_bookings', (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                     where n.nspname = 'public' and c.relname = 'bookings'),
    'rls_holds', (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = 'holds')
  );
$$;

grant execute on function public.create_hold(uuid, jsonb, text, text) to anon, authenticated;
grant execute on function public.confirm_hold(uuid, text, text) to anon, authenticated;
grant execute on function public.get_show_availability(uuid) to anon, authenticated;
grant execute on function public.list_shows(text, text, text, int, int) to anon, authenticated;
grant execute on function public.get_hold_public(uuid) to anon, authenticated;
grant execute on function public.get_booking_public(uuid) to anon, authenticated;

revoke all on function public.integrity_schema_report() from public, anon, authenticated;
grant execute on function public.integrity_schema_report() to service_role;
