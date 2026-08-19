# AI_USAGE.md

Filled as the work changed shape — not reconstructed from memory at the end.

## How the tool was set up

- **CLAUDE.md** — architecture, the capacity invariant, money/timezone/RLS rules, forbidden shortcuts (no `any`, no weakening `integrity-guard.ts`).
- **`.claude/commands/verify.md`** — committed command a reviewer can run: `npm run verify`.
- **Plan then implement.** First pass: domain + RPC + UI. Second pass (after reading the brief as a grader): RLS, concurrent tests, organiser CRUD, pagination, error state — the must-haves that had been cut.
- **Cursor on top of the same repo is allowed** by the brief. Claude Code-style project files (`CLAUDE.md`, a committed command) stayed the source of truth so another assistant cannot invent a second availability function.

Actual files: `CLAUDE.md`, `.claude/commands/verify.md`, `scripts/integrity-guard.ts`, `supabase/migrations/`.

## Prompts that changed the shape of the work (verbatim)

**1. The brief, pasted in full**, ending with: _what we should change to pass that?_

That is the prompt that mattered. It forced a grader's reading instead of "keep shipping UI." The answer was not "add waitlist." It was: RLS is `USING (true)`, organiser create/edit was cut, tests never touch Postgres, the integrity guard only checks that tables exist, availability is filtered after pagination, `ErrorState` is dead code, `find_available_shows` returns temporarily held shows.

**2.** _yes, make it best for me_

Instruction to implement the must-haves in priority order rather than polish. Result: auth users whose `id` is `organisers.id`, revoke direct hold/booking inserts, `list_shows` that pages after filtering, live oversell/expiry tests, organiser forms that set `organiser_id` from `auth.uid()`.

**3. (first pass, summarised because it was a long scaffold)**  
_Build Fringe to the take-home: FOR UPDATE RPCs, integer money, venue timezones, 35 domain tests._

That prompt got a working demo and the wrong cuts. Keeping it here because it is why `SOLUTION.md` originally listed organiser CRUD and concurrency tests as optional.

## One place the assistant was confidently wrong

**Failure:** RLS policies `USING (true)` / `WITH CHECK (true)` on shows and bookings, plus the service-role client on every read. The model described this as a "pragmatic demo trade-off" and wrote it into `SOLUTION.md`.

That is the opposite of the brief: _an organiser must not be able to read or modify another organiser's shows or bookings, even if an API route forgets to filter. Enforce it in the database._

**How it was caught:** Reading the brief's must-have list against the schema, not against the UI. `SOLUTION.md` admitting the hole was the tell. A second hole came with it: `holds_public_insert` meant anyone with the anon key could insert holds and skip `FOR UPDATE`.

**What changed:**

- `anon` reads the public catalogue; `authenticated` SELECT on shows/bookings is `organiser_id = auth.uid()`.
- Organiser dashboard queries have **no** organiser_id filter.
- `GRANT`s revoke direct writes on holds/bookings; only RPCs mutate inventory.
- Integrity guard signs in as organiser A and tries to update B's show / select B's bookings.
- Public pages use an anon client **without** cookies so a logged-in organiser still sees everyone else's festival listings.

Related confident mistakes from the same pass, caught the same way (by running or by reading the brief, not by trusting the diff):

- Availability filter applied to one page of 10, then counted. Fixed in `list_shows`.
- `find_available_shows` skipped only `sold_out`. Temporarily held is not bookable.
- A domain test asserted `tierPrice(1500, 33.3) === 500`. In JS that product is `499.499…`, so `Math.round` is 499. Replaced with integer percentages that match production tiers.

Concurrency and timezone code looking right is exactly where this brief said to distrust fluency. The float test was the small version. The RLS `USING (true)` comment was the large one.

## What I rejected

- **Admin client for organiser reads** — "simpler without auth." Rejected: it makes RLS untestable and fails the "forgotten filter" requirement.
- **Waitlist, deploy, optimistic hold UI** — brief says only if the core is genuinely done. Core was not, until this pass.
- **Background job to expire holds** — unnecessary for correctness; `expires_at > now()` is the invariant. A sweeper would only tidy `status`.
- **Counting sold from `holds.status = 'confirmed'`** — replaced with `booking_items` so a booking is what "sold" means.
- **"It was great throughout"** as the AI log — the brief says that reads as "I didn't check."

## What I wrote / checked myself (not worth delegating blindly)

- The `FOR UPDATE OF s` / `FOR UPDATE OF h, s` targets, and that `show_counts` runs _after_ the lock.
- `expires_at > now()` in every inventory path, including the unswept-expired test.
- Organiser `createShow` sets `organiser_id: user.id` and never takes it from the form.
- `fromVenueDatetimeLocal` round-trip tests (Sydney winter +10, NY summer -4, Sydney DST +11).
- Integrity guard fixture cleanup scoped to the test show — an early draft deleted all `booking_items`.
- The decision to cut waitlist rather than RLS.

No penalty intended for heavy tool use. The penalty I was avoiding is code in this repo I cannot explain: the lock, the fee cap, why anon and authenticated see different show rows, and why an expired hold with `status = 'active'` must not look like a sold-out show.
