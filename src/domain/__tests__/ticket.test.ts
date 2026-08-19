import { describe, it, expect } from 'vitest';
import { decodeTicketQr, encodeTicketQr, isTicketReference } from '@/domain/ticket';

const BOOKING_ID = 'e613c5e3-adec-4497-9195-f9d25c1fb362';

describe('ticket QR payload', () => {
  it('accepts festival booking references', () => {
    expect(isTicketReference('FRG-45A717')).toBe(true);
    expect(isTicketReference('FRG-45a717')).toBe(false);
    expect(isTicketReference('ABC-45A717')).toBe(false);
  });

  it('encodes a compact versioned payload', () => {
    expect(encodeTicketQr({ reference: 'FRG-45A717', bookingId: BOOKING_ID })).toBe(
      `FRINGE:1:FRG-45A717:${BOOKING_ID}`,
    );
  });

  it('normalises booking ids to lowercase', () => {
    const payload = encodeTicketQr({
      reference: 'FRG-45A717',
      bookingId: BOOKING_ID.toUpperCase(),
    });
    expect(payload.endsWith(BOOKING_ID)).toBe(true);
  });

  it('round-trips encode and decode', () => {
    const payload = encodeTicketQr({ reference: 'FRG-45A717', bookingId: BOOKING_ID });
    expect(decodeTicketQr(payload)).toEqual({
      version: 1,
      reference: 'FRG-45A717',
      bookingId: BOOKING_ID,
    });
  });

  it('rejects malformed payloads', () => {
    expect(decodeTicketQr('FRINGE:1:FRG-45A717')).toBeNull();
    expect(decodeTicketQr('OTHER:1:FRG-45A717:' + BOOKING_ID)).toBeNull();
    expect(decodeTicketQr('not-a-qr')).toBeNull();
  });

  it('rejects invalid inputs on encode', () => {
    expect(() => encodeTicketQr({ reference: 'bad', bookingId: BOOKING_ID })).toThrow(
      'INVALID_REFERENCE',
    );
    expect(() => encodeTicketQr({ reference: 'FRG-45A717', bookingId: 'not-a-uuid' })).toThrow(
      'INVALID_BOOKING_ID',
    );
  });
});
