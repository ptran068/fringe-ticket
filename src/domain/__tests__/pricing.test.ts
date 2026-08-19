import { describe, it, expect } from 'vitest';
import {
  tierPrice,
  lineTotal,
  bookingFee,
  calculateOrder,
  formatPrice,
  priceFrom,
  TicketTier,
} from '@/domain/pricing';

describe('Pricing Module', () => {
  describe('tierPrice', () => {
    it('calculates exact percentages (100%, 67%, 50%)', () => {
      expect(tierPrice(2000, 100)).toBe(2000);
      expect(tierPrice(3000, 67)).toBe(2010);
      expect(tierPrice(2000, 50)).toBe(1000);
    });

    it('rounds fractional cents correctly', () => {
      // 1000 * 67 / 100 = 670 (exact)
      expect(tierPrice(1000, 67)).toBe(670);
      // 1500 * 67 / 100 = 1005 (exact)
      expect(tierPrice(1500, 67)).toBe(1005);
      // 2500 * 67 / 100 = 1675 (exact)
      expect(tierPrice(2500, 67)).toBe(1675);
      // 999 * 50 / 100 = 499.5 -> 500 (round half-up)
      expect(tierPrice(999, 50)).toBe(500);
      // 2001 * 50 / 100 = 1000.5 -> 1001
      expect(tierPrice(2001, 50)).toBe(1001);
    });

    it('handles edge cases', () => {
      expect(tierPrice(0, 100)).toBe(0);
      expect(tierPrice(1, 100)).toBe(1);
      expect(tierPrice(1, 49)).toBe(0); // 0.49 -> 0
      expect(tierPrice(1, 50)).toBe(1); // 0.50 -> 1
    });
  });

  describe('lineTotal', () => {
    it('calculates basic multiplication', () => {
      expect(lineTotal(2000, 2)).toBe(4000);
    });

    it('handles zero quantity', () => {
      expect(lineTotal(2000, 0)).toBe(0);
    });
  });

  describe('bookingFee', () => {
    it('calculates 6% fee', () => {
      expect(bookingFee(10000)).toBe(600);
    });

    it('rounds correctly', () => {
      // 1000 * 6% = 60
      expect(bookingFee(1000)).toBe(60);
      // 1050 * 6% = 63
      expect(bookingFee(1050)).toBe(63);
      // 1090 * 6% = 65.4 -> 65
      expect(bookingFee(1090)).toBe(65);
    });

    it('caps at 900 (subtotal > $150)', () => {
      expect(bookingFee(20000)).toBe(900); // 6% of 20000 = 1200 -> cap 900
    });

    it('handles exactly at cap boundary', () => {
      expect(bookingFee(15000)).toBe(900); // 6% of 15000 = 900
    });

    it('handles zero subtotal', () => {
      expect(bookingFee(0)).toBe(0);
    });
  });

  describe('calculateOrder', () => {
    const tiers: TicketTier[] = [
      { id: 'full', label: 'Full Price', percentage: 100 },
      { id: 'conc', label: 'Concession', percentage: 67 },
    ];

    it('calculates order with multiple tiers', () => {
      const order = calculateOrder(2000, tiers, { full: 2, conc: 1 });
      expect(order.lineItems).toHaveLength(2);
      expect(order.lineItems[0].lineTotalMinor).toBe(4000); // 2000 * 2
      expect(order.lineItems[1].lineTotalMinor).toBe(1340); // 1340 * 1
      expect(order.subtotalMinor).toBe(5340);
      expect(order.feeMinor).toBe(320); // 6% of 5340 = 320.4 -> 320
      expect(order.totalMinor).toBe(5660);
    });

    it('handles empty selections', () => {
      const order = calculateOrder(2000, tiers, {});
      expect(order.lineItems).toHaveLength(0);
      expect(order.subtotalMinor).toBe(0);
      expect(order.feeMinor).toBe(0);
      expect(order.totalMinor).toBe(0);
    });

    it('calculates single tier correctly', () => {
      const order = calculateOrder(2000, tiers, { full: 1, conc: 0 });
      expect(order.lineItems).toHaveLength(1);
      expect(order.subtotalMinor).toBe(2000);
      expect(order.feeMinor).toBe(120);
      expect(order.totalMinor).toBe(2120);
    });

    it('maintains total = subtotal + fee invariant', () => {
      const order = calculateOrder(3500, tiers, { full: 3, conc: 2 });
      expect(order.totalMinor).toBe(order.subtotalMinor + order.feeMinor);
    });
  });

  describe('priceFrom', () => {
    it('returns the cheapest tier price', () => {
      expect(priceFrom(2000, [100, 67, 50])).toBe(1000);
      expect(priceFrom(2500, [100, 67, 50])).toBe(1250);
    });

    it('falls back to base when no percentages given', () => {
      expect(priceFrom(2000, [])).toBe(2000);
    });
  });

  describe('formatPrice', () => {
    it('formats various values including 0, negative, large numbers', () => {
      expect(formatPrice(2000)).toBe('$20.00');
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(50)).toBe('$0.50');
      expect(formatPrice(5)).toBe('$0.05');
      expect(formatPrice(-1500)).toBe('-$15.00');
      expect(formatPrice(123456)).toBe('$1234.56');
    });
  });
});
