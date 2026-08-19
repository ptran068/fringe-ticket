# CLAUDE.md — Fringe Festival Ticketing System

## Project Overview

Fringe festival ticket booking system built with Next.js 16 + React 19 + Supabase + Tailwind v4.

This Next.js has breaking APIs versus training data. Read `node_modules/next/dist/docs/` before changing routing, `error.tsx`, or middleware. Auth gating lives in `src/proxy.ts` (not `middleware.ts`). `params` and `searchParams` are Promises. `error.tsx` receives `retry`, not `reset`.

## Architecture

- **Domain** (`src/domain/`): Pure pricing, availability, timezone, ticket QR URLs. No DB or framework deps.
- **Server** (`src/server/`): Repositories (reads) and actions (mutations).
- **UI** (`src/app/`, `src/components/`): App Router RSC + client components.
- **Tools** (`src/tools/`): `findAvailableShows` — Zod input, same `get_show_availability` RPC as the UI.
- **Lib** (`src/lib/`): Ticket wallet (versioned localStorage), QR SVG, request origin.

### Clients — pick the right one

| Client            | File                         | Use for                                                                                  |
| ----------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| Anon (no cookies) | `src/lib/supabase/anon.ts`   | Public catalogue, holds, checkout/booking by UUID                                        |
| Cookie            | `src/lib/supabase/server.ts` | Organiser reads/writes so RLS sees `auth.uid()`                                          |
| Service role      | `src/lib/supabase/admin.ts`  | **Do not import in app routes.** Tests and `scripts/integrity-guard.ts` build their own. |

Public pages must use the anon client **without** the organiser JWT. A logged-in organiser's cookie client only passes RLS for their own shows, so `/` would otherwise hide the rest of the festival.

Do not invent a second availability function. Cards, show pages, the concierge tool, and integrity checks all go through `get_show_availability` / `show_counts` / `calculateAvailability`.

## Critical Invariant

```
confirmed booking_items + active non-expired holds <= venue.capacity
```

Enforced by Postgres RPC with `SELECT … FOR UPDATE` on the **show** row (`create_hold` and `confirm_hold` share that lock). Direct `INSERT` on holds/bookings is revoked for `anon`/`authenticated`. Confirming a hold does not free a seat (held → sold, same count).

Expired holds with `status = 'active'` are excluded by `expires_at > now()`. No sweeper is required for correctness.

## Commands

```bash
npm run dev          # Start dev server
npm run test         # Vitest (domain + live inventory tests if Supabase is up)
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run format:check # Prettier
npm run verify       # typecheck + lint + format:check + test + integrity
npm run db:reset     # Reset Supabase DB with migrations + seed
npm run integrity    # Oversell, expiry, timezone, RLS
```

`npm run verify` talks to whatever is in `.env.local`. Local demo keys are in `.env.example`.

## Database Rules

- All timestamps: `TIMESTAMPTZ` (stored as UTC)
- All money: `INT` (minor units / cents) — NEVER float for storage or display
- All tables: RLS enabled
- Inventory mutations: Postgres RPC only (`create_hold`, `confirm_hold`)
- Concurrency: `SELECT … FOR UPDATE` on the show row
- Organiser isolation: `organiser_id = auth.uid()` (organiser ids **are** auth user ids)
- `createShow` sets `organiser_id` from `user.id`. Never take it from the form.
- Organiser dashboard queries are **unfiltered**. RLS is the gate; do not add a repository `.eq('organiser_id', me)` and call that security.
- Checkout/confirmation: UUID in the URL is the capability (`get_hold_public` / `get_booking_public`). Do not grant table SELECT on holds/bookings to anon.
- `list_shows` filters by city/availability **before** `LIMIT`. Totals are the filtered population. Catalogue name and venue filters are applied on that result set.

## Money Rules

Tiers are integer percentages: full 100, concession 67, under-26 50.

- `tierPrice(base, pct) = Math.round(base * pct / 100)` (SQL: `round(base * pct / 100.0)`)
- `bookingFee(subtotal) = min(Math.round(subtotal * 6 / 100), 900)`
- `total = subtotal + fee` (also a table `CHECK`)
- Card "From" = cheapest tier, not base
- Checkout UI may preview the fee in JS; the number persisted is the SQL one
- Organiser dollar input converts once at the boundary: `Math.round(dollars * 100)`
- NEVER use floating point for money display or storage after that boundary

## Timezone Rules

- Store: `TIMESTAMPTZ` in Postgres (always UTC)
- Display: `Intl.DateTimeFormat` with the venue's IANA zone
- Organiser forms: `datetime-local` interpreted in the **venue** zone via `fromVenueDatetimeLocal` / `toVenueDatetimeLocal`
- Calendar-day math (`isOnDate`, `relativeShowDay`, `zonedYmd`): `formatToParts`, never locale `format()` strings. Alpine/ICU-lite often formats `en-CA` as `M/D/YYYY`; parsing that throws `RangeError: Invalid time value`
- NEVER use the browser timezone for show times
- Seeded venues include DST zones (`Australia/Sydney`, `Europe/London`, `America/New_York`) and non-DST (`Asia/Singapore`)

## RLS Rules

- Public (`anon`): read venues, tiers, organisers, all shows. No write on holds/bookings.
- Authenticated: `SELECT/INSERT/UPDATE` shows where `organiser_id = auth.uid()`. `SELECT` bookings where `organiser_id = auth.uid()`.
- Holds/hold_items: no policies for anon/authenticated → default deny.
- Service role key: NEVER exposed to the browser; not used for organiser or hold paths.

## Tickets (QR + wallet)

- QR payload is a URL: `{origin}/booking/{bookingId}` (`encodeTicketQr`). Phone cameras only open a page when the value is a URL.
- Origin: `NEXT_PUBLIC_APP_URL` if set, else request `Host` / `X-Forwarded-*`. A phone cannot reach `localhost` on a laptop.
- `/tickets` is a **device-local** wallet (`fringe.tickets.v1` in localStorage, cap 50). Clearing site data removes the list; it does not cancel the booking. Do not treat the wallet as inventory or as the booking of record.
- Legacy compact payloads (`FRINGE:1:FRG-…:uuid`) are still decoded, not encoded.

## Availability (UI is informational)

- `sold_out`: `sold >= capacity`
- `temporarily_unavailable`: remaining seats are in other baskets
- `available`: otherwise
- `isGenuinelyBookable` skips both sold-out **and** temporarily held
- Show-page selector disables both unavailable states with different copy. Catalogue cards still link through; the RPC decides the race.
- Do not make client-side availability authoritative.

## Forbidden Shortcuts

- No `any` types
- No `@ts-ignore` without a comment explaining the trade-off
- No client-side availability decisions that skip the RPC
- No floating-point money after the organiser dollar boundary
- No browser-timezone for shows
- No locale date-string parsing for calendar days
- No second copy of availability logic in the concierge tool
- No cookie client on the public catalogue
- No service-role client in app routes
- No deleting/weakening `scripts/integrity-guard.ts`
- No disabling tests to make the build pass
- No `USING (true)` on organiser writes
- No granting direct INSERT on holds/bookings to anon/authenticated
