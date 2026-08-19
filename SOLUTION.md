# SOLUTION.md — Fringe

## What was built

- Paginated show browse (10 per page, real totals) with city / availability filters and start-time sort
- Distinct loading (skeleton), empty, and error (`error.tsx`) states
- 10-minute holds, countdown, confirm-to-booking, inventory returned on expiry without a sweeper
- Organiser login (seeded auth users), create/edit own shows, own bookings
- RLS so organiser A cannot read or update organiser B's shows/bookings **even if the query is unfiltered**
- Typed `find_available_shows` using the same `get_show_availability` RPC as the UI
- Tests: fee arithmetic, timezones/DST, concurrent oversell, unswept expired holds, concierge tool
- Integrity guard that actually exercises oversell, expiry, IANA/`timestamptz`, and RLS
- CI: `.github/workflows/ci.yml` runs `npm run verify`

## Where logic lives

| Concern             | Authority                                                                          |
| ------------------- | ---------------------------------------------------------------------------------- |
| Inventory           | Postgres RPCs + `SELECT … FOR UPDATE` on the show row                              |
| Expiry              | `expires_at > now()` in every inventory count; confirm checks inside the lock      |
| Money               | Integer minor units; `round()` once per division in SQL and `Math.round` in domain |
| Time                | `timestamptz` stored UTC; display via `Intl` with the venue IANA zone              |
| Organiser isolation | RLS (`organiser_id = auth.uid()`), not a repository `.eq()`                        |

The UI is informational. A customer can be told a seat is free and still lose the race; the RPC decides.

## Inventory

```
sold (booking_items) + active non-expired holds ≤ venue.capacity
```

`create_hold` and `confirm_hold` both lock the **show** row. Two concurrent last-seat holds: one `success`, one `INSUFFICIENT_INVENTORY`. Confirming a hold does not free a seat (held → sold, same count).

Direct `INSERT` on `holds` / `bookings` is revoked for `anon` and `authenticated`. The only public mutation path is the RPC. That is what "can't be raced around" means.

Expired holds with `status = 'active'` are excluded by `expires_at > now()`. No cron required for correctness.

Sold-out: `sold >= capacity`. Temporarily unavailable: remaining seats are in other baskets. The badge copy is different; "Get tickets" is disabled for both, with different reasons.

## Money

- `tierPrice = round(base * pct / 100)`
- `fee = min(round(subtotal * 6 / 100), 900)`
- `total = subtotal + fee` (also a table `CHECK`)
- Card "From" is the cheapest tier (under-26 at 50%), not the base price
- Confirmation lines + fee = total; the number persisted is the SQL one

## Timezones

Venues use IANA ids (`Australia/Sydney`, `Europe/London`, `America/New_York`, `Asia/Singapore`, …). August 2026 seed offsets match those zones (AEST, BST, EDT). DST is covered by tests on Sydney summer vs winter. Organiser create/edit interprets `datetime-local` in the **venue** zone, not the browser's.

## RLS

- `anon`: read venues, tiers, all shows (public catalogue). No write on holds/bookings.
- `authenticated`: `SELECT/INSERT/UPDATE` shows where `organiser_id = auth.uid()`. `SELECT` bookings where `organiser_id = auth.uid()`.
- Public pages use the anon key **without** the organiser JWT, so a logged-in organiser still sees the full festival on `/`.
- Organiser dashboard queries are **unfiltered**. Forgetting `.eq('organiser_id', me)` still cannot leak.
- Checkout reads a hold/booking by UUID through `SECURITY DEFINER` RPCs (the UUID is the capability). Organisers cannot enumerate the tables via PostgREST.

Organiser ids are the auth user ids. Seeded passwords: `fringe-demo-2026`.

## Pagination

`list_shows` filters by availability **before** `LIMIT`, so "sold out" page 1 is not "the first 10 shows, then drop the ones that aren't sold out." Totals are the filtered population.

## Concierge tool

`findAvailableShows({ city, onDate, maxPriceMinor, minSeats })`

- Zod input
- Same `get_show_availability` as the cards
- Skips sold out **and** temporarily unavailable (`isGenuinelyBookable`)
- `maxPriceMinor` compares the cheapest tier, which is what "under $30" means

## What was cut (on purpose)

| Cut                   | Why                                                                   |
| --------------------- | --------------------------------------------------------------------- |
| Waitlist              | Nice-to-have; core inventory was not done until RLS + races were real |
| Optimistic hold UI    | Rollback path is easy to fake; the RPC is the product                 |
| Deploy                | Local `supabase start` is enough for the reviewer                     |
| Playwright            | Vitest against live RPCs pins the concurrent path cheaper             |
| Real email / payments | Out of scope                                                          |

## What I would do next

1. Email magic-link instead of a shared demo password
2. Materialize availability to kill the remaining per-show RPC on the organiser dashboard
3. A tiny waitlist that subscribes to `expires_at` rather than polling
4. Constraint / trigger as a second line of defence on `holds` quantity vs capacity (the lock is the first)

## Trade-offs I would defend

1. **Shows are publicly readable to anon, privately scoped to authenticated organisers.** The festival catalogue is public; the _management_ API is not. That matches "even if an API route forgets to filter" for organiser routes.
2. **No hold sweeper.** Correctness is `now()` in the query. A cron would only tidy row status.
3. **Service role is not used for organiser or hold paths.** It remains for the integrity guard's fixture setup. Using it in the app would make RLS theatre.
