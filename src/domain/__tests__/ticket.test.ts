import { describe, it, expect } from 'vitest';
import { decodeTicketQr, encodeTicketQr, isTicketReference } from '@/domain/ticket';

const BOOKING_ID = 'e613c5e3-adec-4497-9195-f9d25c1fb362';
const ORIGIN = 'https://fringe.example';

describe('ticket QR payload', () => {
  it('accepts festival booking references', () => {
    expect(isTicketReference('FRG-45A717')).toBe(true);
    expect(isTicketReference('FRG-45a717')).toBe(false);
    expect(isTicketReference('ABC-45A717')).toBe(false);
  });

  it('encodes a booking URL cameras can open', () => {
    expect(encodeTicketQr({ origin: ORIGIN, bookingId: BOOKING_ID })).toBe(
      `${ORIGIN}/booking/${BOOKING_ID}`,
    );
  });

  it('normalises booking ids to lowercase and strips a trailing slash', () => {
    expect(
      encodeTicketQr({
        origin: `${ORIGIN}/`,
        bookingId: BOOKING_ID.toUpperCase(),
      }),
    ).toBe(`${ORIGIN}/booking/${BOOKING_ID}`);
  });

  it('round-trips encode and decode', () => {
    const payload = encodeTicketQr({ origin: ORIGIN, bookingId: BOOKING_ID });
    expect(decodeTicketQr(payload)).toEqual({
      version: 1,
      origin: ORIGIN,
      bookingId: BOOKING_ID,
    });
  });

  it('still reads the legacy compact payload', () => {
    expect(decodeTicketQr(`FRINGE:1:FRG-45A717:${BOOKING_ID}`)).toEqual({
      version: 1,
      reference: 'FRG-45A717',
      bookingId: BOOKING_ID,
    });
  });

  it('rejects malformed payloads', () => {
    expect(decodeTicketQr(`${ORIGIN}/booking/`)).toBeNull();
    expect(decodeTicketQr('not-a-qr')).toBeNull();
  });

  it('rejects invalid inputs on encode', () => {
    expect(() => encodeTicketQr({ origin: 'fringe.example', bookingId: BOOKING_ID })).toThrow(
      'INVALID_ORIGIN',
    );
    expect(() => encodeTicketQr({ origin: ORIGIN, bookingId: 'not-a-uuid' })).toThrow(
      'INVALID_BOOKING_ID',
    );
  });
});
