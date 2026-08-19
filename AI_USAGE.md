# AI Usage Log

## Configuration
- **Model**: Claude Opus 4.6 (Thinking) via Antigravity IDE
- **Strategy**: Plan-first, parallel subagents for independent workstreams
- **CLAUDE.md**: Created with architecture, invariants, and forbidden shortcuts

## Key Prompts
1. Master CTO prompt with 38 sections covering all requirements
2. Subagent prompts for database schema + domain logic (parallel execution)

## Important AI Decisions

### Decision 1: Inventory Concurrency Strategy
**Prompt**: Design the concurrency model for ticket holds.
**AI suggestion**: Use `SELECT ... FOR UPDATE` on the show row in a Postgres RPC function.
**My assessment**: Correct. This serializes concurrent access at the database level. The alternative (advisory locks) would work but is more complex and less idiomatic for row-level operations.
**Result**: Accepted as-is.

### Decision 2: Floating-Point Rounding in Tests
**AI Error**: The domain logic subagent wrote a test asserting `tierPrice(1500, 33.3) === 500`.
**Problem**: `1500 * 33.3 / 100` in JavaScript floating-point equals `499.49999...` (not `499.5`), so `Math.round` returns `499`, not `500`.
**Discovery**: Caught by running `vitest` — the test failed immediately.
**Fix**: Replaced floating-point percentage test cases with integer percentages (matching production tier values of 100%, 67%, 50%) and used values that actually produce `.5` remainders (e.g., `999 * 50 / 100 = 499.5 → 500`).
**Lesson**: AI was confidently wrong about JavaScript floating-point behavior. This is exactly the kind of bug that makes floating-point money dangerous — and why we use integer minor units in production.

### Decision 3: Hold Expiration Without Background Jobs
**AI suggestion**: Use `expires_at > now()` in every availability query, no background worker needed.
**My assessment**: Correct for correctness. Expired holds are automatically excluded from inventory counts. A cleanup cron could exist for housekeeping but is not required for the invariant.
**Result**: Accepted.

### Decision 4: RLS vs. Application-Level Auth
**AI suggestion**: Use broad RLS policies (public read) + server-side ownership validation in mutations.
**My assessment**: This is a pragmatic choice for a demo without real auth. In production, RLS policies would use `auth.uid()` to enforce organiser ownership at the database level.
**Trade-off**: Documented in SOLUTION.md.

### Decision 5: Integrity Guard Implementation
**AI initial approach**: Used `pg` module directly.
**Problem**: Adding `pg` as a dependency just for the integrity guard was unnecessary.
**Fix**: Rewrote to use `@supabase/supabase-js` with the service role key, querying tables and RPCs through the REST API.

## What I Implemented Manually
1. Fixed failing floating-point test (AI got it wrong)
2. Reviewed and validated all RPC function SQL for correctness
3. Verified all `FOR UPDATE` lock targets were on the correct table
4. Ensured the `confirm_hold` function checks expiry inside the locked transaction

## Rejected Suggestions
- None that weren't caught and fixed above
