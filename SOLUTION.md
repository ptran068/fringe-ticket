# SOLUTION.md — Fringe

## What was built

- Paginated show browse (10 per page, real totals) with city / availability filters, start-time sort, and optional price sort
- Distinct loading (skeleton), empty, and error (`error.tsx`) states
- 10-minute holds, countdown, confirm-to-booking, inventory returned on expiry without a sweeper
- Organiser login (seeded auth users), create/edit own shows, own bookings
- RLS so organiser A cannot read or update organiser B's shows/bookings **even if the query is unfiltered**
- Typed `find_available_shows` using the same `get_show_availability` RPC as the UI
- Door QR that encodes the booking URL (`/booking/{id}`) so a camera opens the ticket
- Device-local "My Tickets" wallet (versioned localStorage) so the QR can be shown later on the same browser
- Tests: fee arithmetic, timezones/DST, venue `datetime-local` round-trips, locale-safe calendar days, concurrent oversell, unswept expired holds, concierge tool, QR encode/decode, wallet retention
- Integrity guard that actually exercises oversell, expiry, IANA/`timestamptz`, and RLS
- CI: `.github/workflows/ci.yml` runs `npm run verify` after `supabase start`

## Where logic lives

| Concern             | Authority                                                                          |
| ------------------- | ---------------------------------------------------------------------------------- |
| Inventory           | Postgres RPCs + `SELECT … FOR UPDATE` on the show row                              |
| Expiry              | `expires_at > now()` in every inventory count; confirm checks inside the lock      |
| Money               | Integer minor units; `round()` once per division in SQL and `Math.round` in domain |
| Time                | `timestamptz` stored UTC; display via `Intl` with the venue IANA zone              |
| Organiser isolation | RLS (`organiser_id = auth.uid()`), not a repository `.eq()`                        |
| Checkout read       | `get_hold_public` / `get_booking_public` — UUID in the URL is the capability       |
| Ticket QR           | Domain encodes a URL; rendering is SVG. Wallet is not the booking of record        |

The UI is informational. A customer can be told a seat is free and still lose the race; the RPC decides.

Public catalogue uses the **anon** client (no organiser JWT). Organiser routes use the **cookie** client so RLS sees `auth.uid()`. Service role is not used on either path.

## Inventory

```
sold (booking_items) + active non-expired holds ≤ venue.capacity
```

`create_hold` and `confirm_hold` both lock the **show** row. Two concurrent last-seat holds: one `success`, one `INSUFFICIENT_INVENTORY`. Confirming a hold does not free a seat (held → sold, same count).

Direct `INSERT` on `holds` / `bookings` is revoked for `anon` and `authenticated`. The only public mutation path is the RPC. That is what "can't be raced around" means.

Expired holds with `status = 'active'` are excluded by `expires_at > now()`. No cron required for correctness.

Sold-out: `sold >= capacity`. Temporarily unavailable: remaining seats are in other baskets. Badge copy is different. Catalogue cards still link through (the card is navigation); the show-page selector is where both states refuse a hold, with different reasons. A full house of *other people's baskets* is not sold out.

## Money

- Tiers are integer percentages: full 100, concession 67, under-26 50
- `tierPrice = round(base * pct / 100)`
- `fee = min(round(subtotal * 6 / 100), 900)`
- `total = subtotal + fee` (also a table `CHECK`)
- Card "From" is the cheapest tier (under-26 at 50%), not the base price
- Confirmation lines + fee = total; the number persisted is the SQL one. Checkout previews the same formula in JS so the customer is not surprised.

## Timezones

Venues use IANA ids (`Australia/Sydney`, `Europe/London`, `America/New_York`, `Asia/Singapore`, `Pacific/Auckland`, …). August 2026 seed offsets match those zones (AEST, BST, EDT). DST is covered by tests on Sydney summer vs winter. Organiser create/edit interprets `datetime-local` in the **venue** zone, not the browser's.

Calendar-day math uses `Intl` `formatToParts`, not locale `format()` strings. Alpine / ICU-lite images often format `en-CA` as `M/D/YYYY`; parsing that and calling `toISOString()` throws `RangeError`. The Docker image installs `icu-data-full` as belt-and-braces; the domain code does not depend on it.

## RLS

- `anon`: read venues, tiers, all shows (public catalogue). No write on holds/bookings.
- `authenticated`: `SELECT/INSERT/UPDATE` shows where `organiser_id = auth.uid()`. `SELECT` bookings where `organiser_id = auth.uid()`.
- Public pages use the anon key **without** the organiser JWT, so a logged-in organiser still sees the full festival on `/`.
- Organiser dashboard queries are **unfiltered**. Forgetting `.eq('organiser_id', me)` still cannot leak.
- Checkout reads a hold/booking by UUID through `SECURITY DEFINER` RPCs. Organisers cannot enumerate the tables via PostgREST.

Organiser ids are the auth user ids. Seeded passwords: `fringe-demo-2026`. Next.js 16 `src/proxy.ts` redirects unsigned `/organiser/*` to login; that is UX, not the security boundary.

## Pagination

`list_shows` filters by availability **before** `LIMIT`, so "sold out" page 1 is not "the first 10 shows, then drop the ones that aren't sold out." Totals are the filtered population. Price sort orders by `price_from_minor` (cheapest tier), which is the same number the cards show.

## Concierge tool

`findAvailableShows({ city, onDate, maxPriceMinor, minSeats })`

- Zod input
- Same `get_show_availability` as the cards
- Skips sold out **and** temporarily unavailable (`isGenuinelyBookable`)
- `maxPriceMinor` compares the cheapest tier, which is what "under $30" means
- `onDate` is a calendar day in the venue zone, not UTC midnight

## Tickets

The QR is a URL because phone cameras only open a page when the value is a URL. Payload: `{origin}/booking/{bookingId}`. Origin comes from `NEXT_PUBLIC_APP_URL` or the request host; a phone cannot reach `localhost` on a laptop.

`/tickets` lists bookings saved on **this browser**. It is a convenience cache (Zod-validated envelope, cap 50, upsert by booking id). Clearing site data removes the list; it does not cancel the booking. The booking of record is Postgres.

## What was cut (on purpose)

| Cut                   | Why                                                                   |
| --------------------- | --------------------------------------------------------------------- |
| Waitlist              | Nice-to-have; core inventory was not done until RLS + races were real |
| Optimistic hold UI    | Rollback path is easy to fake; the RPC is the product                 |
| Hosted deploy         | Local `supabase start` is what the brief asks to review. `Dockerfile` + `output: 'standalone'` exist as packaging, not a public URL |
| Playwright            | Vitest against live RPCs pins the concurrent path cheaper             |
| Real email / payments | Out of scope                                                          |
| Account-backed wallet | Device-local is enough to show a QR at the door in a demo. A logged-in customer list would be a second auth model |

## What I would do next

1. Email magic-link instead of a shared demo password
2. Materialize availability to kill the remaining per-show RPC on the organiser dashboard
3. A tiny waitlist that subscribes to `expires_at` rather than polling
4. Constraint / trigger as a second line of defence on `holds` quantity vs capacity (the lock is the first)
5. A reachable origin for QR (`NEXT_PUBLIC_APP_URL`) so a phone can scan a laptop demo

## Trade-offs I would defend

1. **Shows are publicly readable to anon, privately scoped to authenticated organisers.** The festival catalogue is public; the _management_ API is not. That matches "even if an API route forgets to filter" for organiser routes.
2. **No hold sweeper.** Correctness is `now()` in the query. A cron would only tidy row status.
3. **Service role is not used for organiser or hold paths.** `src/lib/supabase/admin.ts` exists and is unused on purpose. Integrity/tests construct their own service-role client for fixtures. Using it in the app would make RLS theatre.
4. **QR is a URL, not an opaque door token.** Cameras have to open something. The booking UUID is already the checkout capability; encoding it again as `FRINGE:1:…` looked clever and failed the "scan with a phone" test.
5. **Wallet is localStorage, not a table.** The brief does not ask for customer accounts. Inventing them to store tickets would have looked like scope, and would have been the wrong place to spend the last hour.
