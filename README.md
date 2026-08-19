# Fringe — festival ticketing

Take-home: tiny venues, 10-minute holds, integer money, and a hard rule that two people never own the same seat.

```
confirmed bookings + live holds  ≤  venue.capacity
```

Enforced in Postgres (`SELECT … FOR UPDATE` inside `create_hold` / `confirm_hold`). Expired holds stop blocking inventory even if nobody has swept their status.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Supabase (Postgres + RLS) · Vitest

## Setup

```bash
cp .env.example .env.local   # local demo keys for `supabase start`
npm install
npx supabase start           # requires Docker Desktop
npm run db:reset
npm run verify               # needs the database from the previous two steps
npm run dev
```

`npm run verify` talks to whatever is in `.env.local`. If that file points at a hosted project, apply this repo's migrations there (`npx supabase db push` plus seed) or switch `.env.local` to the local keys in `.env.example`. A `fetch failed` / `ECONNREFUSED` error means Postgres is not running, not that the schema is wrong.

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

Password for both: `fringe-demo-2026`

| Organiser        | Email                       |
| ---------------- | --------------------------- |
| Fringe Mavericks | hello@fringemavericks.com   |
| Underground Arts | contact@undergroundarts.org |

Sign in at `/organiser/login`. Each organiser can create and edit **their** shows. The other organiser's rows are hidden by RLS even if a query forgets to filter.

## What to try

1. Browse shows (10 per page). Filter by city / availability. Times are in the **venue** timezone (Sydney, Edinburgh, New York, Singapore, …), not the browser's.
2. Hold tickets, watch the 10-minute countdown, confirm — or wait it out and see inventory come back.
3. Sold out vs temporarily held: a full house of _other people's baskets_ is not sold out.
4. Sign in as Mavericks, note a show id, sign in as Underground, open `/organiser/shows/<that-id>/edit` — you should get 404. The database refused the read.

## Commands

```bash
npm run dev          # Next.js
npm run test         # Vitest (domain + live inventory tests if Supabase is up)
npm run typecheck
npm run lint
npm run integrity    # Oversell, expiry, timezone, RLS
npm run verify       # lint + types + format + test + integrity
npm run db:reset     # migrations + seed
```

CI runs `npm run verify` after `supabase start`. Do not delete `scripts/integrity-guard.ts` to go green.

## Layout

```
src/domain/       Pure pricing, availability, timezone (no DB)
src/server/       Repositories + actions
src/tools/        find_available_shows (Zod, same availability RPC as the UI)
src/app/          App Router
supabase/         Schema, RPCs, seed, RLS
```

See `SOLUTION.md` for inventory, money, and what was cut. See `AI_USAGE.md` for how the assistant was driven.
