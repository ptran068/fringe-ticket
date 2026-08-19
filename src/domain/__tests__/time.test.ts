import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatShowTime,
  formatShowTimeOnly,
  relativeShowDay,
  formatCountdown,
  isOnDate,
  addCalendarDay,
  fromVenueDatetimeLocal,
  toVenueDatetimeLocal,
} from '@/domain/time';

describe('Time Module', () => {
  describe('formatShowTime', () => {
    const fixedDate = new Date('2026-08-15T12:00:00Z');

    it('formats time in Singapore timezone (Asia/Singapore, no DST)', () => {
      // UTC+8, so 12:00 UTC = 20:00 (8:00 PM) SGT
      expect(formatShowTime(fixedDate, 'Asia/Singapore')).toBe('Sat, 15 Aug, 8:00 pm');
    });

    it('formats time in New York timezone (America/New_York, has DST)', () => {
      // Aug is EDT (UTC-4), so 12:00 UTC = 08:00 AM EDT
      expect(formatShowTime(fixedDate, 'America/New_York')).toBe('Sat, 15 Aug, 8:00 am');
    });

    it('formats time in Sydney timezone (Australia/Sydney, has DST)', () => {
      // Aug is AEST (UTC+10), so 12:00 UTC = 22:00 (10:00 PM) AEST
      expect(formatShowTime(fixedDate, 'Australia/Sydney')).toBe('Sat, 15 Aug, 10:00 pm');
    });

    it('formats time in London timezone (Europe/London, has DST)', () => {
      // Aug is BST (UTC+1), so 12:00 UTC = 13:00 (1:00 PM) BST
      expect(formatShowTime(fixedDate, 'Europe/London')).toBe('Sat, 15 Aug, 1:00 pm');
    });

    it('formats the same UTC time differently in different timezones', () => {
      const timeNewYork = formatShowTime(fixedDate, 'America/New_York');
      const timeSydney = formatShowTime(fixedDate, 'Australia/Sydney');
      expect(timeNewYork).not.toEqual(timeSydney);
    });
  });

  describe('DST tests', () => {
    it('shows different UTC offsets for Summer vs Winter in Sydney', () => {
      // Summer in Sydney (Dec/Jan = AEDT, UTC+11)
      const summerDate = new Date('2026-01-15T12:00:00Z'); // 23:00 AEDT
      // Winter in Sydney (Jun/Jul = AEST, UTC+10)
      const winterDate = new Date('2026-07-15T12:00:00Z'); // 22:00 AEST

      expect(formatShowTimeOnly(summerDate, 'Australia/Sydney')).toBe('11:00 pm');
      expect(formatShowTimeOnly(winterDate, 'Australia/Sydney')).toBe('10:00 pm');
    });
  });

  describe('relativeShowDay', () => {
    beforeEach(() => {
      // Mock new Date() to always return a fixed time for relative day tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns Tonight for same day in venue timezone', () => {
      // Current mock time is 20:00 SGT (Aug 15)
      // Show is at 22:00 SGT (Aug 15)
      const showDate = new Date('2026-08-15T14:00:00Z');
      expect(relativeShowDay(showDate, 'Asia/Singapore')).toBe('Tonight');
    });

    it('returns Tomorrow for next day in venue timezone', () => {
      // Current mock time is 20:00 SGT (Aug 15)
      // Show is at 10:00 SGT (Aug 16) = 02:00 UTC
      const showDate = new Date('2026-08-16T02:00:00Z');
      expect(relativeShowDay(showDate, 'Asia/Singapore')).toBe('Tomorrow');
    });

    it('returns formatted date for other days', () => {
      // Current mock time is 20:00 SGT (Aug 15)
      // Show is on Aug 20 SGT
      const showDate = new Date('2026-08-20T12:00:00Z');
      expect(relativeShowDay(showDate, 'Asia/Singapore')).toBe('Thu, 20 Aug');
    });
  });

  describe('formatCountdown', () => {
    it('formats various remaining times', () => {
      expect(formatCountdown(90000)).toBe('01:30'); // 90 secs
      expect(formatCountdown(3600000)).toBe('60:00'); // 1 hour
      expect(formatCountdown(582000)).toBe('09:42');
    });

    it('formats zero or negative remaining times as 00:00', () => {
      expect(formatCountdown(0)).toBe('00:00');
      expect(formatCountdown(-5000)).toBe('00:00');
    });
  });

  describe('addCalendarDay', () => {
    it('crosses month boundaries in UTC, not the host timezone', () => {
      expect(addCalendarDay('2026-08-31')).toBe('2026-09-01');
    });
  });

  describe('venue datetime-local round-trip', () => {
    it('interprets Sydney winter wall clock as UTC+10', () => {
      expect(fromVenueDatetimeLocal('2026-08-19T20:00', 'Australia/Sydney')).toBe(
        '2026-08-19T10:00:00.000Z',
      );
    });

    it('interprets New York summer wall clock as UTC-4', () => {
      expect(fromVenueDatetimeLocal('2026-08-23T20:00', 'America/New_York')).toBe(
        '2026-08-24T00:00:00.000Z',
      );
    });

    it('round-trips Sydney DST (AEDT, UTC+11)', () => {
      const iso = fromVenueDatetimeLocal('2026-01-15T20:00', 'Australia/Sydney');
      expect(iso).toBe('2026-01-15T09:00:00.000Z');
      expect(toVenueDatetimeLocal(iso, 'Australia/Sydney')).toBe('2026-01-15T20:00');
    });
  });

  describe('isOnDate', () => {
    it('matches correctly across timezone boundaries', () => {
      // 2026-08-15T23:00:00Z
      // In SGT (UTC+8): 2026-08-16 07:00:00
      // In NY (UTC-4): 2026-08-15 19:00:00
      const date = new Date('2026-08-15T23:00:00Z');

      expect(isOnDate(date, '2026-08-16', 'Asia/Singapore')).toBe(true);
      expect(isOnDate(date, '2026-08-15', 'Asia/Singapore')).toBe(false);

      expect(isOnDate(date, '2026-08-15', 'America/New_York')).toBe(true);
      expect(isOnDate(date, '2026-08-16', 'America/New_York')).toBe(false);
    });
  });
});
