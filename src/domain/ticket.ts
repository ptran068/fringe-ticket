/**
 * Door-scan QR payload. Phone cameras only open a page when the value is a URL.
 *
 * Format: {origin}/booking/{bookingId}
 * Example: https://fringe.example/booking/e613c5e3-adec-4497-9195-f9d25c1fb362
 */

export const TICKET_QR_VERSION = 1 as const;

const REFERENCE_PATTERN = /^FRG-[A-Z0-9]{6}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGIN_PATTERN = /^https?:\/\/[^\s/]+$/i;
const TICKET_URL_PATTERN =
  /^(https?:\/\/[^\s/]+)\/booking\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i;
const LEGACY_PAYLOAD_PATTERN =
  /^FRINGE:1:(FRG-[A-Z0-9]{6}):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export interface TicketQrPayload {
  version: typeof TICKET_QR_VERSION;
  bookingId: string;
  origin?: string;
  reference?: string;
}

export function isTicketReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value);
}

export function encodeTicketQr(input: { origin: string; bookingId: string }): string {
  const origin = input.origin.replace(/\/$/, '');
  if (!ORIGIN_PATTERN.test(origin)) {
    throw new Error('INVALID_ORIGIN');
  }
  if (!UUID_PATTERN.test(input.bookingId)) {
    throw new Error('INVALID_BOOKING_ID');
  }
  return `${origin}/booking/${input.bookingId.toLowerCase()}`;
}

export function decodeTicketQr(payload: string): TicketQrPayload | null {
  const value = payload.trim();

  const urlMatch = TICKET_URL_PATTERN.exec(value);
  if (urlMatch) {
    return {
      version: TICKET_QR_VERSION,
      origin: urlMatch[1],
      bookingId: urlMatch[2].toLowerCase(),
    };
  }

  const legacy = LEGACY_PAYLOAD_PATTERN.exec(value);
  if (!legacy) return null;

  return {
    version: TICKET_QR_VERSION,
    reference: legacy[1],
    bookingId: legacy[2].toLowerCase(),
  };
}
