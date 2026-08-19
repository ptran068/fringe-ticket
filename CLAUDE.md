# CLAUDE.md — Fringe Festival Ticketing System

## Project Overview
Fringe festival ticket booking system built with Next.js 16 + Supabase + Tailwind v4.

## Architecture
- **Domain logic** (`src/domain/`): Pure functions, no DB/framework deps
- **Server layer** (`src/server/`): Repositories (reads) and Actions (mutations)
- **UI** (`src/app/`, `src/components/`): Next.js App Router with RSC + client components
- **Tools** (`src/tools/`): Typed concierge tool reusing same domain logic

## Critical Invariant
```
confirmed_bookings + active_holds <= venue.capacity
```
Enforced by Postgres RPC with `SELECT ... FOR UPDATE` row locking.

## Commands
```bash
npm run dev          # Start dev server
npm run test         # Run vitest
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run verify       # Full verification pipeline
npm run db:reset     # Reset Supabase DB with migrations + seed
npm run integrity    # Run integrity guard checks
```

## Database Rules
- All timestamps: `TIMESTAMPTZ` (stored as UTC)
- All money: `INT` (minor units / cents) — NEVER float
- All tables: RLS enabled
- Mutations: Through Postgres RPC functions only
- Concurrency: `SELECT ... FOR UPDATE` on show row

## Money Rules
- `tierPrice(base, pct) = Math.round(base * pct / 100)`
- `bookingFee(subtotal) = min(Math.round(subtotal * 6 / 100), 900)`
- `total = subtotal + fee`
- Rounding policy: `Math.round` (round half-up)
- NEVER use floating point for money display or storage

## Timezone Rules
- Store: `TIMESTAMPTZ` in Postgres (always UTC)
- Display: `Intl.DateTimeFormat` with venue's IANA timezone
- NEVER use browser timezone for show times
- DST: Handled automatically by Intl

## RLS Rules
- All tables have RLS enabled
- Public read on shows, venues, ticket_tiers
- Organiser ownership validated server-side in mutations
- Service role key: NEVER exposed to browser

## Forbidden Shortcuts
- No `any` types
- No `@ts-ignore` without justification
- No client-side availability decisions (UI is informational only)
- No floating-point money
- No browser-timezone for shows
- No deleting/weakening integrity-guard.ts
- No disabling tests to make the build pass
