import { describe, it, expect } from 'vitest';
import {
  PENDING_HOLD_KEY,
  clearPendingHold,
  getPendingHold,
  isPendingHoldActive,
  savePendingHold,
  type PendingHoldInput,
} from '@/lib/pending-hold';
import type { TicketStorage } from '@/lib/ticket-wallet';

class MemoryStorage implements TicketStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

class QuotaStorage extends MemoryStorage {
  setItem(): void {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  }
}

const hold = (overrides: Partial<PendingHoldInput> = {}): PendingHoldInput => ({
  holdId: 'abbc01c4-b3b6-404d-8c8e-994ead676eb9',
  expiresAt: '2026-08-20T02:00:00.000Z',
  showId: '11111111-1111-4111-8111-111111111111',
  showTitle: 'The Last Bus Home',
  venueName: 'The Spiegeltent',
  venueCity: 'Sydney',
  timezone: 'Australia/Sydney',
  startsAt: '2026-08-19T10:00:00.000Z',
  items: [
    { label: 'Full Price', quantity: 1 },
    { label: 'Concession', quantity: 1 },
  ],
  totalMinor: 4426,
  savedAt: '2026-08-20T01:50:00.000Z',
  ...overrides,
});

describe('pending hold', () => {
  it('saves and reads an active hold', () => {
    const storage = new MemoryStorage();
    savePendingHold(hold(), storage);
    const now = Date.parse('2026-08-20T01:55:00.000Z');
    expect(getPendingHold(storage, now)?.showTitle).toBe('The Last Bus Home');
  });

  it('saves seeded show ids that are not RFC 4122 UUIDs', () => {
    const storage = new MemoryStorage();
    const result = savePendingHold(
      hold({ showId: '20000000-0000-0000-0000-000000000001' }),
      storage,
    );
    expect(result).toEqual({ ok: true });
    const now = Date.parse('2026-08-20T01:55:00.000Z');
    expect(getPendingHold(storage, now)?.showId).toBe('20000000-0000-0000-0000-000000000001');
  });

  it('replaces a previous hold instead of stacking', () => {
    const storage = new MemoryStorage();
    savePendingHold(hold(), storage);
    savePendingHold(
      hold({
        holdId: '22222222-2222-4222-8222-222222222222',
        showTitle: 'Midnight Raga',
      }),
      storage,
    );

    const now = Date.parse('2026-08-20T01:55:00.000Z');
    const pending = getPendingHold(storage, now);
    expect(pending?.holdId).toBe('22222222-2222-4222-8222-222222222222');
    expect(pending?.showTitle).toBe('Midnight Raga');
  });

  it('hides a hold once the timer has elapsed', () => {
    const storage = new MemoryStorage();
    savePendingHold(hold({ expiresAt: '2026-08-20T02:00:00.000Z' }), storage);

    expect(getPendingHold(storage, Date.parse('2026-08-20T01:59:59.000Z'))).not.toBeNull();
    expect(getPendingHold(storage, Date.parse('2026-08-20T02:00:00.000Z'))).toBeNull();
  });

  it('clears only the matching hold id', () => {
    const storage = new MemoryStorage();
    savePendingHold(hold(), storage);

    clearPendingHold('00000000-0000-4000-8000-000000000000', storage);
    const now = Date.parse('2026-08-20T01:55:00.000Z');
    expect(getPendingHold(storage, now)?.holdId).toBe(hold().holdId);

    clearPendingHold(hold().holdId, storage);
    expect(getPendingHold(storage, now)).toBeNull();
  });

  it('ignores corrupt stored JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(PENDING_HOLD_KEY, '{not json');
    expect(getPendingHold(storage, Date.parse('2026-08-20T01:55:00.000Z'))).toBeNull();
  });

  it('reports quota failures without throwing', () => {
    expect(savePendingHold(hold(), new QuotaStorage())).toEqual({ ok: false, error: 'quota' });
  });

  it('classifies active vs expired holds', () => {
    const pending = {
      ...hold(),
      v: 1 as const,
      savedAt: '2026-08-20T01:50:00.000Z',
    };
    expect(isPendingHoldActive(pending, Date.parse('2026-08-20T01:59:00.000Z'))).toBe(true);
    expect(isPendingHoldActive(pending, Date.parse('2026-08-20T02:00:00.000Z'))).toBe(false);
  });
});
