import { describe, it, expect } from 'vitest';
import {
  TICKET_WALLET_KEY,
  TICKET_WALLET_LIMIT,
  getWalletTicket,
  isUpcomingTicket,
  listWalletTickets,
  removeWalletTicket,
  saveWalletTicket,
  type TicketStorage,
  type WalletTicketInput,
} from '@/lib/ticket-wallet';

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

const ticket = (overrides: Partial<WalletTicketInput> = {}): WalletTicketInput => ({
  bookingId: 'e613c5e3-adec-4497-9195-f9d25c1fb362',
  reference: 'FRG-45A717',
  showTitle: 'Midnight Raga',
  venueName: 'Basement Theatre',
  venueCity: 'Sydney',
  timezone: 'Australia/Sydney',
  startsAt: '2026-08-20T11:00:00.000Z',
  items: [
    { label: 'Full Price', quantity: 1 },
    { label: 'Concession', quantity: 1 },
  ],
  totalMinor: 2655,
  savedAt: '2026-08-19T12:00:00.000Z',
  ...overrides,
});

describe('ticket wallet', () => {
  it('saves and lists tickets in show order', () => {
    const storage = new MemoryStorage();
    saveWalletTicket(
      ticket({
        startsAt: '2026-08-22T11:00:00.000Z',
        bookingId: '11111111-1111-4111-8111-111111111111',
        reference: 'FRG-AAAAAA',
      }),
      storage,
    );
    saveWalletTicket(ticket({ startsAt: '2026-08-20T11:00:00.000Z' }), storage);

    const listed = listWalletTickets(storage);
    expect(listed.map((item) => item.reference)).toEqual(['FRG-45A717', 'FRG-AAAAAA']);
  });

  it('upserts by booking id without duplicating', () => {
    const storage = new MemoryStorage();
    saveWalletTicket(ticket({ showTitle: 'Midnight Raga' }), storage);
    saveWalletTicket(ticket({ showTitle: 'Midnight Raga (updated)' }), storage);

    const listed = listWalletTickets(storage);
    expect(listed).toHaveLength(1);
    expect(listed[0].showTitle).toBe('Midnight Raga (updated)');
  });

  it('reads a single ticket and removes it from this device', () => {
    const storage = new MemoryStorage();
    saveWalletTicket(ticket(), storage);

    expect(getWalletTicket(ticket().bookingId, storage)?.reference).toBe('FRG-45A717');
    removeWalletTicket(ticket().bookingId, storage);
    expect(listWalletTickets(storage)).toEqual([]);
  });

  it('ignores corrupt stored JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(TICKET_WALLET_KEY, '{not json');
    expect(listWalletTickets(storage)).toEqual([]);
  });

  it('caps the wallet at the retention limit', () => {
    const storage = new MemoryStorage();
    for (let i = 0; i < TICKET_WALLET_LIMIT + 5; i += 1) {
      const suffix = i.toString(16).padStart(12, '0');
      saveWalletTicket(
        ticket({
          bookingId: `00000000-0000-4000-8000-${suffix}`,
          reference: `FRG-${i.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`,
          startsAt: new Date(Date.UTC(2026, 7, 20, i)).toISOString(),
        }),
        storage,
      );
    }
    expect(listWalletTickets(storage)).toHaveLength(TICKET_WALLET_LIMIT);
    expect(
      getWalletTicket(
        `00000000-0000-4000-8000-${(TICKET_WALLET_LIMIT + 4).toString(16).padStart(12, '0')}`,
        storage,
      ),
    ).not.toBeNull();
  });

  it('reports quota failures without throwing', () => {
    const result = saveWalletTicket(ticket(), new QuotaStorage());
    expect(result).toEqual({ ok: false, error: 'quota' });
  });

  it('classifies upcoming vs past tickets', () => {
    const now = Date.parse('2026-08-20T10:00:00.000Z');
    const upcoming = {
      ...ticket({ startsAt: '2026-08-20T11:00:00.000Z' }),
      v: 1 as const,
      savedAt: '2026-08-19T12:00:00.000Z',
    };
    const past = {
      ...ticket({ startsAt: '2026-08-19T11:00:00.000Z' }),
      v: 1 as const,
      savedAt: '2026-08-19T12:00:00.000Z',
    };
    expect(isUpcomingTicket(upcoming, now)).toBe(true);
    expect(isUpcomingTicket(past, now)).toBe(false);
  });
});
