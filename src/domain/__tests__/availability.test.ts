import { describe, it, expect } from 'vitest';
import { calculateAvailability, availabilityLabel } from '@/domain/availability';

describe('Availability Module', () => {
  describe('calculateAvailability', () => {
    it('calculates fully available status', () => {
      const result = calculateAvailability(100, 0, 0);
      expect(result).toEqual({
        capacity: 100,
        sold: 0,
        held: 0,
        available: 100,
        status: 'available',
      });
    });

    it('calculates partially sold status', () => {
      const result = calculateAvailability(100, 50, 10);
      expect(result).toEqual({
        capacity: 100,
        sold: 50,
        held: 10,
        available: 40,
        status: 'available',
      });
    });

    it('calculates temporarily unavailable (sold + held = capacity)', () => {
      const result = calculateAvailability(100, 90, 10);
      expect(result).toEqual({
        capacity: 100,
        sold: 90,
        held: 10,
        available: 0,
        status: 'temporarily_unavailable',
      });
    });

    it('calculates sold out (sold = capacity)', () => {
      const result = calculateAvailability(100, 100, 0);
      expect(result).toEqual({
        capacity: 100,
        sold: 100,
        held: 0,
        available: 0,
        status: 'sold_out',
      });
    });

    it('returns sold_out and available = 0 when sold > capacity', () => {
      const result = calculateAvailability(100, 105, 5);
      expect(result).toEqual({
        capacity: 100,
        sold: 105,
        held: 5,
        available: 0, // Math.max(0, ...)
        status: 'sold_out',
      });
    });
  });

  describe('availabilityLabel', () => {
    it('returns correct label for available', () => {
      expect(availabilityLabel({ status: 'available', available: 5, capacity: 100, sold: 95, held: 0 })).toBe('5 tickets left');
      expect(availabilityLabel({ status: 'available', available: 1, capacity: 100, sold: 99, held: 0 })).toBe('1 ticket left');
    });

    it('returns correct label for temporarily unavailable', () => {
      expect(availabilityLabel({ status: 'temporarily_unavailable', available: 0, capacity: 100, sold: 90, held: 10 })).toBe('Temporarily held — try again shortly');
    });

    it('returns correct label for sold out', () => {
      expect(availabilityLabel({ status: 'sold_out', available: 0, capacity: 100, sold: 100, held: 0 })).toBe('Sold out');
    });
  });
});
