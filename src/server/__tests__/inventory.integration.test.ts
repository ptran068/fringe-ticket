import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  adminClient,
  anonClient,
  cleanupShow,
  createCapacityOneShow,
  dbAvailable,
} from '@/test/supabase';
import { findAvailableShows, FindAvailableShowsInput } from '@/tools/find-available-shows';

const hasDb = await dbAvailable();

describe('find_available_shows input', () => {
  it('rejects invalid input via Zod', () => {
    expect(() => FindAvailableShowsInput.parse({ minSeats: -1 })).toThrow();
    expect(() => FindAvailableShowsInput.parse({ maxPriceMinor: 1.5 })).toThrow();
    expect(FindAvailableShowsInput.parse({ city: 'Singapore', minSeats: 2 })).toEqual({
      city: 'Singapore',
      minSeats: 2,
    });
  });
});

describe.skipIf(!hasDb)('inventory RPCs (live Postgres)', () => {
  let supabase: ReturnType<typeof adminClient>;
  let publicClient: ReturnType<typeof anonClient>;
  let venueId = '';
  let showId = '';

  beforeAll(async () => {
    supabase = adminClient();
    publicClient = anonClient();
    const fixture = await createCapacityOneShow(supabase);
    venueId = fixture.venueId;
    showId = fixture.showId;
  });

  afterAll(async () => {
    if (venueId && showId) await cleanupShow(supabase, venueId, showId);
  });

  it('does not oversell when two customers grab the last seat at once', async () => {
    const payload = [{ tier_id: 'full_price', quantity: 1 }];
    const [a, b] = await Promise.all([
      publicClient.rpc('create_hold', { p_show_id: showId, p_items: payload }),
      publicClient.rpc('create_hold', { p_show_id: showId, p_items: payload }),
    ]);

    const outcomes = [a.data, b.data] as Array<{ success?: boolean } | null>;
    const successes = outcomes.filter((o) => o?.success).length;
    expect(successes).toBe(1);

    const { data: avail } = await publicClient.rpc('get_show_availability', { p_show_id: showId });
    const availability = avail as { sold: number; held: number; capacity: number };
    expect(availability.sold + availability.held).toBeLessThanOrEqual(availability.capacity);
  });
});

describe.skipIf(!hasDb)('hold expiry (live Postgres)', () => {
  it('does not count an unswept expired hold against capacity', async () => {
    const supabase = adminClient();
    const publicClient = anonClient();
    const { venueId, showId } = await createCapacityOneShow(supabase);
    try {
      await supabase.from('holds').insert({
        show_id: showId,
        quantity: 1,
        status: 'active',
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      });

      const { data: avail } = await publicClient.rpc('get_show_availability', {
        p_show_id: showId,
      });
      const availability = avail as { held: number; available: number; status: string };
      expect(availability.held).toBe(0);
      expect(availability.available).toBe(1);
      expect(availability.status).toBe('available');

      const { data: hold } = await publicClient.rpc('create_hold', {
        p_show_id: showId,
        p_items: [{ tier_id: 'full_price', quantity: 1 }],
      });
      expect((hold as { success?: boolean }).success).toBe(true);
    } finally {
      await cleanupShow(supabase, venueId, showId);
    }
  });
});

describe.skipIf(!hasDb)('find_available_shows', () => {
  it('returns only genuinely bookable shows using the same availability RPC', async () => {
    const results = await findAvailableShows({ city: 'Singapore', minSeats: 1 });
    expect(results.length).toBeGreaterThan(0);
    for (const show of results) {
      expect(show.city).toBe('Singapore');
      expect(show.available).toBeGreaterThanOrEqual(1);
    }
  });

  it('excludes temporarily held inventory from bookable results', async () => {
    const supabase = adminClient();
    const { venueId, showId } = await createCapacityOneShow(supabase);
    try {
      await anonClient().rpc('create_hold', {
        p_show_id: showId,
        p_items: [{ tier_id: 'full_price', quantity: 1 }],
      });
      const results = await findAvailableShows({ city: 'IntegrityCity', minSeats: 1 });
      expect(results.find((s) => s.id === showId)).toBeUndefined();
    } finally {
      await cleanupShow(supabase, venueId, showId);
    }
  });
});
