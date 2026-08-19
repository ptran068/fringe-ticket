# CLAUDE.md — Fringe Festival Ticketing System

## Project Overview

Fringe festival ticket booking system built with Next.js 16 + Supabase + Tailwind v4.

## Architecture

- **Domain logic** (`src/domain/`): Pure functions, no DB/framework deps
- **Server layer** (`src/server/`): Repositories (reads) and Actions (mutations)
- **UI** (`src/app/`, `src/components/`): Next.js App Router with RSC + client components
- **Tools** (`src/tools/`): Typed concierge tool reusing same domain logic

Public catalogue uses the **anon** client (no JWT). Organiser routes use the **cookie** client so RLS sees `auth.uid()`. Do not use the service role in app code.

## Critical Invariant

```
confirmed booking_items + active non-expired holds <= venue.capacity
```

Enforced by Postgres RPC with `SELECT … FOR UPDATE` on the show row. Direct INSERT on holds/bookings is revoked for `anon`/`authenticated`.

## Commands

```bash
npm run dev          # Start dev server
npm run test         # Run vitest
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run verify       # Full verification pipeline
npm run db:reset     # Reset Supabase DB with migrations + seed
npm run integrity    # Oversell, expiry, timezone, RLS
```

## Database Rules

- All timestamps: `TIMESTAMPTZ` (stored as UTC)
- All money: `INT` (minor units / cents) — NEVER float
- All tables: RLS enabled
- Inventory mutations: Postgres RPC only
- Concurrency: `SELECT … FOR UPDATE` on show row
- Organiser isolation: `organiser_id = auth.uid()` (ids are auth user ids)

## Money Rules

- `tierPrice(base, pct) = Math.round(base * pct / 100)`
- `bookingFee(subtotal) = min(Math.round(subtotal * 6 / 100), 900)`
- `total = subtotal + fee`
- Card "price from" = cheapest tier, not base
- NEVER use floating point for money display or storage

## Timezone Rules

- Store: `TIMESTAMPTZ` in Postgres (always UTC)
- Display: `Intl.DateTimeFormat` with venue's IANA timezone
- Organiser forms: `datetime-local` interpreted in the venue zone
- NEVER use browser timezone for show times

## RLS Rules

- Public (`anon`): read shows, venues, ticket_tiers
- Authenticated: own shows (read/write) and own bookings (read)
- Holds/bookings: no direct writes from anon/authenticated
- Service role key: NEVER exposed to browser; not used for organiser or hold paths

## Forbidden Shortcuts

- No `any` types
- No `@ts-ignore` without justification
- No client-side availability decisions (UI is informational only)
- No floating-point money
- No browser-timezone for shows
- No deleting/weakening integrity-guard.ts
- No disabling tests to make the build pass
- No `USING (true)` on organiser writes
