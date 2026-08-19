import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnvFiles } from './load-env';

loadEnvFiles(['.env.local', '.env.example']);

/**
 * Integrity Guard — fails if the schema cannot hold the line on
 * oversell, timezones, or row-level security.
 *
 * Run: npx tsx scripts/integrity-guard.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const ORG_A = '00000000-0000-0000-0000-000000000001';
const ORG_B = '00000000-0000-0000-0000-000000000002';

let allPassed = true;

function report(name: string, passed: boolean, detail = '') {
  const icon = passed ? '✓' : '✗';
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!passed) allPassed = false;
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function anon(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function asOrganiser(email: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: 'fringe-demo-2026',
  });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

function isReachableError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return /fetch failed|Failed to fetch|ECONNREFUSED|ENOTFOUND|network/i.test(message);
}

async function assertDatabaseReachable() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SERVICE_ROLE_KEY },
    });
    if (response.ok || response.status === 401 || response.status === 200) {
      return;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (err) {
    const hint =
      SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost')
        ? 'Local Postgres is not running. Start it, apply schema, then re-run:\n    npx supabase start\n    npm run db:reset\n    npm run verify'
        : `Cannot reach ${SUPABASE_URL}. Check the URL in .env.local, that the project is not paused, and that migrations have been applied.`;
    console.error(
      `\nIntegrity guard: database unreachable (${err instanceof Error ? err.message : String(err)}).\n${hint}\n`,
    );
    process.exit(1);
  }
}

async function createCapacityOneShow(supabase: SupabaseClient) {
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .insert({
      name: `Integrity ${Date.now()}`,
      city: 'IntegrityCity',
      timezone: 'Asia/Singapore',
      capacity: 1,
    })
    .select('id')
    .single();
  if (venueError || !venue) throw new Error(venueError?.message ?? 'venue insert failed');

  const { data: show, error: showError } = await supabase
    .from('shows')
    .insert({
      venue_id: venue.id,
      organiser_id: ORG_A,
      title: 'Integrity one-seat',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      base_price_minor: 1000,
      status: 'active',
    })
    .select('id')
    .single();
  if (showError || !show) throw new Error(showError?.message ?? 'show insert failed');

  return { venueId: venue.id as string, showId: show.id as string };
}

async function cleanup(supabase: SupabaseClient, venueId: string, showId: string) {
  const { data: bookings } = await supabase.from('bookings').select('id').eq('show_id', showId);
  if (bookings) {
    for (const b of bookings) {
      await supabase.from('booking_items').delete().eq('booking_id', b.id);
    }
  }
  await supabase.from('bookings').delete().eq('show_id', showId);
  const { data: holds } = await supabase.from('holds').select('id').eq('show_id', showId);
  if (holds) {
    for (const h of holds) {
      await supabase.from('hold_items').delete().eq('hold_id', h.id);
    }
  }
  await supabase.from('holds').delete().eq('show_id', showId);
  await supabase.from('shows').delete().eq('id', showId);
  await supabase.from('venues').delete().eq('id', venueId);
}

async function runChecks() {
  console.log('\nFringe Integrity Guard\n');
  console.log(`Target: ${SUPABASE_URL}\n`);
  await assertDatabaseReachable();

  const supabase = admin();
  const publicClient = anon();

  console.log('Schema:');
  const { data: reportJson, error: reportError } = await supabase.rpc('integrity_schema_report');
  report('integrity_schema_report()', !reportError, reportError?.message ?? '');
  const schema = reportJson as {
    starts_at_udt?: string;
    expires_at_udt?: string;
    rls_shows?: boolean;
    rls_bookings?: boolean;
    rls_holds?: boolean;
  } | null;
  report('shows.starts_at is timestamptz', schema?.starts_at_udt === 'timestamptz');
  report('holds.expires_at is timestamptz', schema?.expires_at_udt === 'timestamptz');
  report('RLS enabled on shows', schema?.rls_shows === true);
  report('RLS enabled on bookings', schema?.rls_bookings === true);
  report('RLS enabled on holds', schema?.rls_holds === true);

  const { data: venues, error: venueTzError } = await supabase.from('venues').select('timezone');
  const iana =
    !venueTzError &&
    (venues?.length ?? 0) > 0 &&
    (venues ?? []).every((v: { timezone: string }) => v.timezone.includes('/'));
  report(
    'venue timezones are IANA (contain /)',
    iana,
    venueTzError?.message ?? `${venues?.length ?? 0} venues`,
  );

  console.log('\nOversell:');
  let fixture: { venueId: string; showId: string } | null = null;
  try {
    fixture = await createCapacityOneShow(supabase);
    const holdPayload = [{ tier_id: 'full_price', quantity: 1 }];
    const [a, b] = await Promise.all([
      publicClient.rpc('create_hold', { p_show_id: fixture.showId, p_items: holdPayload }),
      publicClient.rpc('create_hold', { p_show_id: fixture.showId, p_items: holdPayload }),
    ]);
    const results = [a.data, b.data] as Array<{ success?: boolean; error?: string } | null>;
    const successes = results.filter((r) => r?.success).length;
    const failures = results.filter((r) => r && r.success === false).length;
    report(
      'capacity=1, two concurrent holds → exactly one succeeds',
      successes === 1 && failures === 1,
      `successes=${successes} failures=${failures}`,
    );

    const { data: avail } = await publicClient.rpc('get_show_availability', {
      p_show_id: fixture.showId,
    });
    const availability = avail as { sold: number; held: number; capacity: number };
    report(
      'sold + held ≤ capacity after the race',
      availability.sold + availability.held <= availability.capacity,
      `sold=${availability.sold} held=${availability.held} cap=${availability.capacity}`,
    );
  } catch (err) {
    report('oversell race ran', false, err instanceof Error ? err.message : String(err));
  } finally {
    if (fixture) await cleanup(supabase, fixture.venueId, fixture.showId);
  }

  console.log('\nHold expiry:');
  fixture = null;
  try {
    fixture = await createCapacityOneShow(supabase);
    await supabase.from('holds').insert({
      show_id: fixture.showId,
      quantity: 1,
      status: 'active',
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const { data: avail } = await publicClient.rpc('get_show_availability', {
      p_show_id: fixture.showId,
    });
    const availability = avail as { held: number; available: number };
    report(
      'unswept expired hold does not block inventory',
      availability.held === 0 && availability.available === 1,
      `held=${availability.held} available=${availability.available}`,
    );

    const { data: holdResult } = await publicClient.rpc('create_hold', {
      p_show_id: fixture.showId,
      p_items: [{ tier_id: 'full_price', quantity: 1 }],
    });
    report(
      'new hold succeeds after expiry',
      (holdResult as { success?: boolean })?.success === true,
    );
  } catch (err) {
    report('expiry check ran', false, err instanceof Error ? err.message : String(err));
  } finally {
    if (fixture) await cleanup(supabase, fixture.venueId, fixture.showId);
  }

  console.log('\nRow-level security:');
  const { error: holdInsertError } = await publicClient.from('holds').insert({
    show_id: '20000000-0000-0000-0000-000000000001',
    quantity: 1,
    status: 'active',
  });
  report(
    'anon cannot INSERT holds (must use create_hold RPC)',
    holdInsertError !== null && !isReachableError(holdInsertError),
    holdInsertError?.message ?? 'insert succeeded — BAD',
  );

  const { error: bookingInsertError } = await publicClient.from('bookings').insert({
    reference: 'FRG-HACK',
    show_id: '20000000-0000-0000-0000-000000000001',
    hold_id: '00000000-0000-0000-0000-000000000099',
    organiser_id: ORG_A,
    subtotal_minor: 100,
    fee_minor: 6,
    total_minor: 106,
  });
  report(
    'anon cannot INSERT bookings',
    bookingInsertError !== null && !isReachableError(bookingInsertError),
    bookingInsertError?.message ?? 'insert succeeded — BAD',
  );

  try {
    const orgA = await asOrganiser('hello@fringemavericks.com');
    const orgB = await asOrganiser('contact@undergroundarts.org');

    const { data: aShows } = await orgA.from('shows').select('organiser_id');
    const aOnlyOwn = (aShows ?? []).every(
      (s: { organiser_id: string }) => s.organiser_id === ORG_A,
    );
    report(
      'organiser A SELECT shows returns only own rows (unfiltered)',
      aOnlyOwn && (aShows?.length ?? 0) > 0,
      `${aShows?.length ?? 0} rows`,
    );

    const { data: bShows } = await orgB.from('shows').select('id').eq('organiser_id', ORG_A);
    report(
      "organiser B cannot read A's shows even with .eq(organiser_id, A)",
      (bShows?.length ?? 0) === 0,
      `${bShows?.length ?? 0} leaked`,
    );

    const { data: aBookings } = await orgA.from('bookings').select('organiser_id');
    const bookingsOwn = (aBookings ?? []).every(
      (row: { organiser_id: string }) => row.organiser_id === ORG_A,
    );
    report('organiser A SELECT bookings returns only own rows', bookingsOwn);

    const { data: bBookings } = await orgB.from('bookings').select('id').eq('organiser_id', ORG_A);
    report(
      "organiser B cannot read A's bookings even if the query forgets nothing",
      (bBookings?.length ?? 0) === 0,
    );

    const { data: bShow } = await supabase
      .from('shows')
      .select('id, title')
      .eq('organiser_id', ORG_B)
      .limit(1)
      .single();

    if (bShow) {
      const { data: updated } = await orgA
        .from('shows')
        .update({ title: 'Hacked by A' })
        .eq('id', bShow.id)
        .select();
      report("organiser A cannot UPDATE organiser B's show", (updated?.length ?? 0) === 0);
      const { data: after } = await supabase
        .from('shows')
        .select('title')
        .eq('id', bShow.id)
        .single();
      report("B's title unchanged", after?.title === bShow.title);
    } else {
      report('organiser B has a show to attempt hijacking', false);
    }
  } catch (err) {
    report(
      'organiser auth / RLS checks ran',
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  console.log('\nSeed:');
  const { data: venueRows } = await supabase.from('venues').select('id');
  report(`venues seeded (${venueRows?.length ?? 0})`, (venueRows?.length ?? 0) >= 5);
  const { data: showRows } = await supabase.from('shows').select('id');
  report(`shows seeded (${showRows?.length ?? 0})`, (showRows?.length ?? 0) >= 10);
  const { data: tierRows } = await supabase.from('ticket_tiers').select('id');
  report(`ticket tiers (${tierRows?.length ?? 0})`, (tierRows?.length ?? 0) === 3);

  console.log('');
  if (allPassed) {
    console.log('All integrity checks passed.\n');
    process.exit(0);
  } else {
    console.log('Some integrity checks failed.\n');
    process.exit(1);
  }
}

runChecks().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
