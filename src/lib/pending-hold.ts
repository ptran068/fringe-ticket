import { z } from 'zod';
import type { TicketStorage } from '@/lib/ticket-wallet';

export const PENDING_HOLD_KEY = 'fringe.pending.v1';

const isoTimestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid timestamp',
});

/** Postgres uuid values (including seeded 0000-version ids) — not RFC 4122. */
const postgresUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid id');

const pendingHoldSchema = z.object({
  v: z.literal(1),
  holdId: postgresUuid,
  expiresAt: isoTimestamp,
  showId: postgresUuid,
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

export type PendingHold = z.infer<typeof pendingHoldSchema>;

export type PendingHoldInput = Omit<PendingHold, 'v' | 'savedAt'> & {
  savedAt?: string;
};

export type PendingHoldWriteResult = { ok: true } | { ok: false; error: 'unavailable' | 'quota' };

function browserStorage(): TicketStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readPending(storage: TicketStorage): PendingHold | null {
  const raw = storage.getItem(PENDING_HOLD_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    const hold = pendingHoldSchema.safeParse(parsed);
    if (!hold.success) return null;
    return hold.data;
  } catch {
    return null;
  }
}

function writePending(storage: TicketStorage, hold: PendingHold): PendingHoldWriteResult {
  try {
    storage.setItem(PENDING_HOLD_KEY, JSON.stringify(hold));
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

const pendingListeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedHold: PendingHold | null = null;
let storageListening = false;

function notifyPendingListeners() {
  cachedRaw = null;
  queueMicrotask(() => {
    pendingListeners.forEach((listener) => listener());
  });
}

function notifyIfBrowser(storage: TicketStorage) {
  if (typeof window !== 'undefined' && storage === window.localStorage) {
    notifyPendingListeners();
  }
}

function ensureStorageListener() {
  if (storageListening || typeof window === 'undefined') return;
  storageListening = true;
  window.addEventListener('storage', (event) => {
    if (event.key === PENDING_HOLD_KEY || event.key === null) {
      notifyPendingListeners();
    }
  });
}

export function subscribePendingHold(onStoreChange: () => void) {
  ensureStorageListener();
  pendingListeners.add(onStoreChange);
  return () => {
    pendingListeners.delete(onStoreChange);
  };
}

export function isPendingHoldActive(hold: PendingHold, now = Date.now()): boolean {
  return Date.parse(hold.expiresAt) > now;
}

export function getPendingHold(
  storage: TicketStorage | null = browserStorage(),
  now = Date.now(),
): PendingHold | null {
  if (!storage) return null;
  const hold = readPending(storage);
  if (!hold || !isPendingHoldActive(hold, now)) return null;
  return hold;
}

export function getPendingHoldSnapshot(): PendingHold | null {
  const storage = browserStorage();
  if (!storage) return null;
  const raw = storage.getItem(PENDING_HOLD_KEY) ?? '';
  if (raw === cachedRaw) {
    if (!cachedHold) return null;
    return isPendingHoldActive(cachedHold) ? cachedHold : null;
  }
  cachedRaw = raw;
  cachedHold = readPending(storage);
  if (!cachedHold || !isPendingHoldActive(cachedHold)) return null;
  return cachedHold;
}

export function getServerPendingHoldSnapshot(): PendingHold | null {
  return null;
}

export function savePendingHold(
  input: PendingHoldInput,
  storage: TicketStorage | null = browserStorage(),
  now: () => string = () => new Date().toISOString(),
): PendingHoldWriteResult {
  if (!storage) return { ok: false, error: 'unavailable' };

  const parsed = pendingHoldSchema.safeParse({
    ...input,
    v: 1,
    savedAt: input.savedAt ?? now(),
  });
  if (!parsed.success) return { ok: false, error: 'unavailable' };

  return writePending(storage, parsed.data);
}

export function clearPendingHold(
  holdId?: string,
  storage: TicketStorage | null = browserStorage(),
): PendingHoldWriteResult {
  if (!storage) return { ok: false, error: 'unavailable' };
  const current = readPending(storage);
  if (!current) return { ok: true };
  if (holdId && current.holdId !== holdId) return { ok: true };

  try {
    storage.removeItem(PENDING_HOLD_KEY);
    notifyIfBrowser(storage);
    return { ok: true };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

export function checkoutPath(holdId: string): string {
  return `/checkout/${holdId}`;
}
