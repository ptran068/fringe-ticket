# SOLUTION.md — Fringe Festival Ticketing System

## What Was Built

A full-stack festival ticketing platform with:

- **Show browsing** — Paginated, filterable show discovery with city/availability/sort controls
- **Ticket selection** — Multi-tier ticket selector with real-time order calculation
- **Hold system** — 10-minute expiring ticket holds with countdown timer
- **Booking confirmation** — Atomic hold-to-booking conversion with reference codes
- **Organiser dashboard** — Show management and booking visibility per organiser
- **Typed concierge tool** — `find_available_shows` with Zod validation
- **35 unit tests** — Pricing, timezone, and availability domain logic

---

## Architecture

```
src/
  domain/           Pure business logic (no DB, no framework)
    pricing.ts       Integer minor-unit math, fee calculation
    availability.ts  Available/held/sold-out state machine
    time.ts          Timezone-aware formatting via Intl
  server/
    repositories/    Database reads (admin client)
    actions/         Mutations (atomic RPC calls)
  components/
    ui/              Design system primitives
    shows/           Show browsing components
    checkout/        Ticket selection + countdown
    organiser/       Dashboard components
  tools/             Typed concierge tool
  types/             Shared TypeScript types
  lib/supabase/      Client helpers (browser/server/admin)
```

**Key principle**: UI is informational. The database transaction is authoritative.

---

## Inventory / Concurrency Strategy

### The Invariant

```
confirmed_bookings + active_holds ≤ venue.capacity
```

### How It's Enforced

Both `create_hold` and `confirm_hold` are **Postgres RPC functions** that use `SELECT ... FOR UPDATE` on the show row:

```sql
SELECT v.capacity, s.base_price_minor
FROM public.shows s
JOIN public.venues v ON v.id = s.venue_id
WHERE s.id = p_show_id AND s.status = 'active'
FOR UPDATE OF s;  -- Serializes concurrent access
```

This means:
1. **Two concurrent holds**: The second transaction waits for the first to commit, then recalculates availability
2. **Capacity=1, two users**: Exactly one succeeds, one gets `INSUFFICIENT_INVENTORY`
3. **Hold + confirm race**: Both lock the show row, serialized deterministically
4. **Expired hold + new hold**: `expires_at > now()` excludes expired holds from inventory count

### Why This Can't Oversell

The `FOR UPDATE` lock on the show row creates a **serialization point**. Within the locked transaction:
1. Count confirmed (status='confirmed')
2. Count active non-expired (status='active' AND expires_at > now())
3. Calculate available = capacity - confirmed - active
4. If available < requested → fail
5. If available >= requested → insert hold

Steps 1-5 execute atomically. No concurrent transaction can modify the counts between steps 1 and 5.

---

## Hold Expiration Strategy

### No background job required for correctness

Every availability query includes:
```sql
AND status = 'active' AND expires_at > now()
```

Expired holds are **automatically excluded** from inventory calculations regardless of whether any cleanup process has run.

### Client-side countdown

1. Server returns `expires_at` (UTC timestamp) with the hold
2. Client calculates `remaining = expires_at - Date.now()` 
3. `setInterval` updates the countdown every second
4. When countdown reaches 0 → UI shows expired state, disables confirm
5. Confirm action still validates server-side (DB is authoritative)

### The race: hold expires at exact moment of confirmation

The `confirm_hold` RPC checks `expires_at <= now()` inside the locked transaction. If expired, the hold is marked 'expired' and the confirmation fails. The DB timestamp is the sole authority.

---

## Pricing / Rounding Strategy

- **All money**: Integer minor units (cents). `$20.00 = 2000`
- **Tier price**: `Math.round(basePriceMinor * percentage / 100)`
- **Line total**: `unitPrice * quantity` (no rounding needed)
- **Booking fee**: `Math.min(Math.round(subtotal * 6 / 100), 900)`
- **Total**: `subtotal + fee`
- **Rounding policy**: `Math.round` applied exactly once per division
- **Display**: `formatPrice(2000)` → `"$20.00"`

The same calculation runs in:
1. Client-side ticket selector (preview)
2. Postgres `confirm_hold` RPC (authoritative)

The client total is informational. The DB total is persisted.

---

## Timezone Strategy

- **Storage**: `TIMESTAMPTZ` in Postgres (always UTC internally)
- **Display**: `Intl.DateTimeFormat` with venue's IANA timezone
- **DST**: Handled automatically by the Intl API
- **Browser timezone**: Never used for show times

```typescript
new Intl.DateTimeFormat('en-AU', {
  timeZone: venue.timezone, // e.g. 'Australia/Sydney'
  // ...format options
}).format(date);
```

Seed data includes venues in 6 timezones: `Asia/Singapore`, `Australia/Sydney`, `Australia/Melbourne`, `Europe/London`, `America/New_York`, `Pacific/Auckland` — several of which observe DST.

---

## RLS / Authorization Strategy

- **All tables**: RLS enabled
- **Public read**: Shows, venues, ticket_tiers, organisers
- **Mutations**: Through `SECURITY DEFINER` RPC functions (bypass RLS, validate internally)
- **Organiser ownership**: Validated server-side in mutations before DB writes
- **Service role key**: Only used in server-side code (`src/lib/supabase/admin.ts`)
- **Browser**: Only has access to anon key

### Trade-off (documented)

In a production system with real auth, RLS policies would use `auth.uid()` to enforce organiser ownership at the DB level. For this demo without real auth, we validate ownership in server actions and use broad RLS policies.

---

## Testing Strategy

### 35 tests covering:

**Pricing (15 tests)**
- Tier price calculations for 100%, 67%, 50%
- Fractional cent rounding
- Edge cases (0 price, 1 cent)
- Booking fee at 6%, cap at $9.00
- Fee boundary conditions
- Order total invariant: `total = subtotal + fee`

**Timezone (12 tests)**
- Singapore (no DST)
- New York, Sydney, London (DST-observing)
- Same UTC time → different local displays
- Countdown formatting
- Date matching across timezone boundaries
- Tonight/Tomorrow relative labels

**Availability (8 tests)**
- All three states: available, temporarily_unavailable, sold_out
- Boundary conditions
- Label generation

### Concurrency testing note

True concurrency tests require a running Supabase instance with `Promise.all([createHold(...), createHold(...)])`. The RPC functions are designed to handle this via `SELECT ... FOR UPDATE`, but integration tests are omitted from the unit test suite (they require Docker).

---

## UI/UX Decisions

- **Design language**: Independent theatre + modern ticketing
- **Color palette**: Cream/charcoal/amber — warm, theatrical
- **Typography**: Display serif for show titles, Inter for body
- **States**: Distinct designs for loading (skeleton), empty, and error
- **Availability**: Color-coded badges (green/amber/red) with animated dot
- **Countdown**: Prominent, pulsing when < 2 minutes, mono font
- **Responsive**: Mobile-first, sticky ticket selector on desktop
- **Accessibility**: Keyboard navigation, ARIA labels, focus states, contrast

---

## What Was Deliberately Cut

| Feature | Why |
|---|---|
| Real auth (login/signup) | Not critical for demonstrating correctness |
| Organiser create/edit show forms | Scoped to read-only dashboard |
| Email notifications | Out of scope |
| Waitlist | P3 feature |
| Deployment | Local-only demo |
| End-to-end tests | Requires Playwright setup |
| Database concurrency integration tests | Requires running Supabase Docker |

---

## What I Would Build Next (With Another Day)

1. **Real auth** — Supabase Auth with organiser login, RLS using `auth.uid()`
2. **Concurrency integration tests** — `Promise.all` holds against real DB
3. **Organiser CRUD** — Create/edit/deactivate shows
4. **Optimistic UI** — Instant ticket selection feedback
5. **Waitlist** — Subscribe to sold-out shows
6. **Search** — Full-text show search
7. **Analytics** — Revenue and booking dashboards
8. **CI/CD** — GitHub Actions with Supabase CLI

---

## Known Trade-offs

1. **Admin client for reads**: Using service role for server reads instead of anon+RLS. Simpler for demo, but production should use per-user RLS.
2. **No real auth**: Organiser selector instead of login. Security relies on server-side validation.
3. **Availability N+1**: Each show card makes a separate RPC call for availability. In production, use a materialized view or batch query.
4. **Client-side countdown drift**: `setInterval` may drift slightly from real time. The server is always authoritative at confirmation time.
