/**
 * Integrity Guard — Verifies database schema correctness.
 * Run: npx tsx scripts/integrity-guard.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

let allPassed = true;

function report(name: string, passed: boolean) {
  const icon = passed ? '✓' : '✗';
  console.log(`  ${icon} ${name}`);
  if (!passed) allPassed = false;
}

async function runChecks() {
  console.log('\n🔍 Fringe Integrity Guard\n');

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Table existence ──────────────────────────────────
  console.log('Tables:');
  const requiredTables = [
    'venues', 'organisers', 'shows', 'ticket_tiers',
    'holds', 'hold_items', 'bookings', 'booking_items',
  ];

  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('*').limit(0);
    report(`${table} exists`, !error);
  }

  // ── Critical columns ─────────────────────────────────
  console.log('\nCritical Columns:');

  const colChecks = [
    { table: 'shows', col: 'base_price_minor' },
    { table: 'shows', col: 'starts_at' },
    { table: 'venues', col: 'timezone' },
    { table: 'holds', col: 'expires_at' },
    { table: 'bookings', col: 'reference' },
    { table: 'bookings', col: 'subtotal_minor' },
    { table: 'bookings', col: 'fee_minor' },
    { table: 'bookings', col: 'total_minor' },
  ];

  for (const { table, col } of colChecks) {
    const { data } = await supabase.from(table).select(col).limit(0);
    report(`${table}.${col} exists`, data !== null);
  }

  // ── RPC Functions ────────────────────────────────────
  console.log('\nRPC Functions:');
  const requiredFuncs = ['create_hold', 'confirm_hold', 'get_show_availability'];

  for (const func of requiredFuncs) {
    const { error } = await supabase.rpc(func, {});
    const exists = !error || !error.message.includes('Could not find the function');
    report(`${func}() exists`, exists);
  }

  // ── Foreign Keys ─────────────────────────────────────
  console.log('\nReferential Integrity:');
  const { error: fkError } = await supabase
    .from('shows')
    .insert({
      venue_id: '99999999-9999-9999-9999-999999999999',
      organiser_id: '99999999-9999-9999-9999-999999999999',
      title: 'FK Test',
      starts_at: new Date().toISOString(),
      base_price_minor: 100,
    });
  const hasFk = fkError !== null && (fkError.message.includes('foreign key') || fkError.message.includes('violates') || fkError.code === '23503');
  report('shows.venue_id FK enforced', hasFk);

  // ── Seed data ────────────────────────────────────────
  console.log('\nSeed Data:');
  const { data: venues } = await supabase.from('venues').select('id');
  report(`Venues seeded (${venues?.length ?? 0})`, (venues?.length ?? 0) >= 5);

  const { data: shows } = await supabase.from('shows').select('id');
  report(`Shows seeded (${shows?.length ?? 0})`, (shows?.length ?? 0) >= 10);

  const { data: tiers } = await supabase.from('ticket_tiers').select('id');
  report(`Ticket tiers seeded (${tiers?.length ?? 0})`, (tiers?.length ?? 0) === 3);

  const { data: orgs } = await supabase.from('organisers').select('id');
  report(`Organisers seeded (${orgs?.length ?? 0})`, (orgs?.length ?? 0) >= 2);

  // ── Summary ──────────────────────────────────────────
  console.log('');
  if (allPassed) {
    console.log('✅ All integrity checks passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some integrity checks failed.\n');
    process.exit(1);
  }
}

runChecks().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
