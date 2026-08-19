-- =============================================================
-- create_hold: Atomically creates a hold if capacity allows
-- =============================================================
create or replace function public.create_hold(
  p_show_id uuid,
  p_items jsonb, -- [{"tier_id": "full_price", "quantity": 2}, ...]
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
  -- Calculate total requested quantity
  select coalesce(sum((item->>'quantity')::int), 0)
  into v_total_quantity
  from jsonb_array_elements(p_items) as item;

  if v_total_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  -- Lock the show row to serialize concurrent holds
  select v.capacity, s.base_price_minor
  into v_capacity, v_base_price
  from public.shows s
  join public.venues v on v.id = s.venue_id
  where s.id = p_show_id
    and s.status = 'active'
  for update of s;

  if not found then
    raise exception 'SHOW_NOT_FOUND';
  end if;

  -- Count confirmed bookings
  select coalesce(sum(h.quantity), 0) into v_sold
  from public.holds h
  where h.show_id = p_show_id
    and h.status = 'confirmed';

  -- Count active (non-expired) holds
  select coalesce(sum(h.quantity), 0) into v_held
  from public.holds h
  where h.show_id = p_show_id
    and h.status = 'active'
    and h.expires_at > now();

  v_available := v_capacity - v_sold - v_held;

  if v_available < v_total_quantity then
    return jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_INVENTORY',
      'available', v_available,
      'requested', v_total_quantity
    );
  end if;

  -- Create the hold
  v_expires_at := now() + interval '10 minutes';
  
  insert into public.holds (show_id, customer_name, customer_email, quantity, status, expires_at)
  values (p_show_id, p_customer_name, p_customer_email, v_total_quantity, 'active', v_expires_at)
  returning id into v_hold_id;

  -- Create hold items for each tier
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- Validate tier exists
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
  v_item record;
begin
  -- Lock the hold row
  select h.*, s.organiser_id as show_organiser_id
  into v_hold
  from public.holds h
  join public.shows s on s.id = h.show_id
  where h.id = p_hold_id
  for update of h;

  if not found then
    return jsonb_build_object('success', false, 'error', 'HOLD_NOT_FOUND');
  end if;

  if v_hold.status != 'active' then
    return jsonb_build_object('success', false, 'error', 'HOLD_NOT_ACTIVE');
  end if;

  -- Check expiry — DB timestamp is authoritative
  if v_hold.expires_at <= now() then
    update public.holds set status = 'expired' where id = p_hold_id;
    return jsonb_build_object('success', false, 'error', 'HOLD_EXPIRED');
  end if;

  v_organiser_id := v_hold.show_organiser_id;

  -- Calculate subtotal from hold items
  select coalesce(sum(hi.unit_price_minor * hi.quantity), 0)
  into v_subtotal
  from public.hold_items hi
  where hi.hold_id = p_hold_id;

  -- Booking fee: 6% capped at $9.00 (900 minor units)
  v_fee := least(round(v_subtotal * 6 / 100.0), 900);
  v_total := v_subtotal + v_fee;

  -- Generate booking reference
  v_reference := 'FRG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  -- Create the booking
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

  -- Copy hold items to booking items
  insert into public.booking_items (booking_id, tier_id, quantity, unit_price_minor, line_total_minor)
  select v_booking_id, hi.tier_id, hi.quantity, hi.unit_price_minor, hi.unit_price_minor * hi.quantity
  from public.hold_items hi
  where hi.hold_id = p_hold_id;

  -- Mark hold as confirmed
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
-- get_show_availability: Returns availability info for a show
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
  select v.capacity into v_capacity
  from public.shows s
  join public.venues v on v.id = s.venue_id
  where s.id = p_show_id;

  if not found then
    return jsonb_build_object('error', 'SHOW_NOT_FOUND');
  end if;

  -- Confirmed
  select coalesce(sum(h.quantity), 0) into v_sold
  from public.holds h
  where h.show_id = p_show_id
    and h.status = 'confirmed';

  -- Active non-expired holds
  select coalesce(sum(h.quantity), 0) into v_held
  from public.holds h
  where h.show_id = p_show_id
    and h.status = 'active'
    and h.expires_at > now();

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
