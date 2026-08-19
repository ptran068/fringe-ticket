import { z } from 'zod';
import { isTicketReference } from '@/domain/ticket';

export const TICKET_WALLET_KEY = 'fringe.tickets.v1';
export const TICKET_WALLET_LIMIT = 50;

const isoTimestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid timestamp',
});

const walletTicketSchema = z.object({
  v: z.literal(1),
  bookingId: z.string().uuid(),
  reference: z.string().refine(isTicketReference),
  showTitle: z.string().min(1),
  venueName: z.string().min(1),
  venueCity: z.string().min(1),
  timezone: z.string().min(1),
  startsAt: isoTimestamp,
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  totalMinor: z.number().int().nonnegative(),
  savedAt: isoTimestamp,
});

const walletEnvelopeSchema = z.object({
  v: z.literal(1),
  tickets: z.array(walletTicketSchema),
});

export type WalletTicket = z.infer<typeof walletTicketSchema>;

export type WalletTicketInput = Omit<WalletTicket, 'v' | 'savedAt'> & {
  savedAt?: string;
};

export interface TicketStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type WalletWriteResult = { ok: true } | { ok: false; error: 'unavailable' | 'quota' };

function browserStorage(): TicketStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readEnvelope(storage: TicketStorage): { v: 1; tickets: WalletTicket[] } {
  const raw = storage.getItem(TICKET_WALLET_KEY);
  if (!raw) return { v: 1, tickets: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    const envelope = walletEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) return { v: 1, tickets: [] };
    return envelope.data;
  } catch {
    return { v: 1, tickets: [] };
  }
}

function writeEnvelope(storage: TicketStorage, tickets: WalletTicket[]): WalletWriteResult {
  try {
    storage.setItem(TICKET_WALLET_KEY, JSON.stringify({ v: 1, tickets }));
    notifyIfBrowser(storage);
    return { ok: true };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return { ok: false, error: 'quota' };
    }
    return { ok: false, error: 'unavailable' };
  }
}

const EMPTY_TICKETS: WalletTicket[] = [];
const walletListeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedTickets: WalletTicket[] = EMPTY_TICKETS;
let storageListening = false;

let lastWrite: { bookingId: string; result: WalletWriteResult } | null = null;

function notifyWalletListeners() {
  cachedRaw = null;
  queueMicrotask(() => {
    walletListeners.forEach((listener) => listener());
  });
}

function recordWrite(bookingId: string, result: WalletWriteResult) {
  lastWrite = { bookingId, result };
  if (!result.ok) notifyWalletListeners();
}

function notifyIfBrowser(storage: TicketStorage) {
  if (typeof window !== 'undefined' && storage === window.localStorage) {
    notifyWalletListeners();
  }
}

function ensureStorageListener() {
  if (storageListening || typeof window === 'undefined') return;
  storageListening = true;
  window.addEventListener('storage', (event) => {
    if (event.key === TICKET_WALLET_KEY || event.key === null) {
      notifyWalletListeners();
    }
  });
}

export function subscribeWallet(onStoreChange: () => void) {
  ensureStorageListener();
  walletListeners.add(onStoreChange);
  return () => {
    walletListeners.delete(onStoreChange);
  };
}

export function getWalletSnapshot(): WalletTicket[] {
  const storage = browserStorage();
  if (!storage) return EMPTY_TICKETS;
  const raw = storage.getItem(TICKET_WALLET_KEY) ?? '';
  if (raw === cachedRaw) return cachedTickets;
  cachedRaw = raw;
  cachedTickets = listWalletTickets(storage);
  return cachedTickets;
}

export function getServerWalletSnapshot(): WalletTicket[] {
  return EMPTY_TICKETS;
}

export function getWalletWriteSnapshot(): { bookingId: string; result: WalletWriteResult } | null {
  return lastWrite;
}

export function getServerWalletWriteSnapshot(): null {
  return null;
}

export function subscribeHydration() {
  return () => {};
}

export function getClientHydrationSnapshot() {
  return false;
}

export function getServerHydrationSnapshot() {
  return true;
}

function sortTickets(tickets: WalletTicket[]): WalletTicket[] {
  return [...tickets].sort((a, b) => {
    const startDiff = Date.parse(a.startsAt) - Date.parse(b.startsAt);
    if (startDiff !== 0) return startDiff;
    return Date.parse(b.savedAt) - Date.parse(a.savedAt);
  });
}

export function listWalletTickets(
  storage: TicketStorage | null = browserStorage(),
): WalletTicket[] {
  if (!storage) return [];
  return sortTickets(readEnvelope(storage).tickets);
}

export function getWalletTicket(
  bookingId: string,
  storage: TicketStorage | null = browserStorage(),
): WalletTicket | null {
  if (!storage) return null;
  return readEnvelope(storage).tickets.find((ticket) => ticket.bookingId === bookingId) ?? null;
}

export function saveWalletTicket(
  input: WalletTicketInput,
  storage: TicketStorage | null = browserStorage(),
  now: () => string = () => new Date().toISOString(),
): WalletWriteResult {
  if (!storage) {
    const result = { ok: false, error: 'unavailable' } as const;
    recordWrite(input.bookingId, result);
    return result;
  }

  const parsed = walletTicketSchema.safeParse({
    ...input,
    v: 1,
    savedAt: input.savedAt ?? now(),
  });
  if (!parsed.success) {
    const result = { ok: false, error: 'unavailable' } as const;
    recordWrite(input.bookingId, result);
    return result;
  }
  const ticket = parsed.data;

  const existing = readEnvelope(storage).tickets.filter(
    (item) => item.bookingId !== ticket.bookingId,
  );
  const merged = [ticket, ...existing];
  let result: WalletWriteResult;
  if (merged.length > TICKET_WALLET_LIMIT) {
    const dropCount = merged.length - TICKET_WALLET_LIMIT;
    const dropIds = new Set(
      merged
        .slice(1)
        .sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt))
        .slice(0, dropCount)
        .map((item) => item.bookingId),
    );
    result = writeEnvelope(
      storage,
      sortTickets(merged.filter((item) => !dropIds.has(item.bookingId))),
    );
  } else {
    result = writeEnvelope(storage, sortTickets(merged));
  }
  recordWrite(ticket.bookingId, result);
  return result;
}

export function removeWalletTicket(
  bookingId: string,
  storage: TicketStorage | null = browserStorage(),
): WalletWriteResult {
  if (!storage) return { ok: false, error: 'unavailable' };
  const tickets = readEnvelope(storage).tickets.filter((ticket) => ticket.bookingId !== bookingId);
  return writeEnvelope(storage, tickets);
}

export function isUpcomingTicket(ticket: WalletTicket, now = Date.now()): boolean {
  return Date.parse(ticket.startsAt) >= now;
}
