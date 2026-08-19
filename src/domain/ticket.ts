/**
 * Door-scan QR payload. Keep it short so the code stays easy to read
 * from a phone at a few metres.
 *
 * Format: FRINGE:1:{reference}:{bookingId}
 * Example: FRINGE:1:FRG-45A717:e613c5e3-adec-4497-9195-f9d25c1fb362
 */

export const TICKET_QR_PREFIX = 'FRINGE';
export const TICKET_QR_VERSION = 1 as const;

const REFERENCE_PATTERN = /^FRG-[A-Z0-9]{6}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TicketQrPayload {
  version: typeof TICKET_QR_VERSION;
  reference: string;
  bookingId: string;
}

export function isTicketReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value);
}

export function encodeTicketQr(input: { reference: string; bookingId: string }): string {
  if (!isTicketReference(input.reference)) {
    throw new Error('INVALID_REFERENCE');
  }
  if (!UUID_PATTERN.test(input.bookingId)) {
    throw new Error('INVALID_BOOKING_ID');
  }
  return `${TICKET_QR_PREFIX}:${TICKET_QR_VERSION}:${input.reference}:${input.bookingId.toLowerCase()}`;
}

export function decodeTicketQr(payload: string): TicketQrPayload | null {
  const match = /^FRINGE:1:(FRG-[A-Z0-9]{6}):([0-9a-f-]{36})$/i.exec(payload.trim());
  if (!match) return null;

  const reference = match[1];
  const bookingId = match[2].toLowerCase();
  if (!UUID_PATTERN.test(bookingId)) return null;

  return { version: TICKET_QR_VERSION, reference, bookingId };
}
