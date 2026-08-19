/**
 * Timezone-aware time formatting.
 * Always uses the venue's IANA timezone — never the browser's local timezone.
 * DST is handled automatically by Intl.DateTimeFormat.
 *
 * Calendar-day math uses formatToParts, never locale `format()` strings.
 * Alpine/ICU-lite images often format `en-CA` as `M/D/YYYY`, and parsing
 * that with `new Date(...).toISOString()` throws RangeError: Invalid time value.
 */

function parseInstant(startsAt: string | Date): Date {
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid time value: ${String(startsAt)}`);
  }
  return date;
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string | undefined {
  return parts.find((entry) => entry.type === type)?.value;
}

/** YYYY-MM-DD in `timezone`, independent of host locale and ICU data. */
function zonedYmd(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = part(parts, 'year');
  const month = part(parts, 'month');
  const day = part(parts, 'day');
  if (!year || !month || !day) {
    throw new RangeError('Invalid time value');
  }
  return `${year}-${month}-${day}`;
}

function zonedDateTimeParts(date: Date, timezone: string): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
}

/** Format a show's start time in the venue's timezone */
export function formatShowTime(startsAt: string | Date, timezone: string): string {
  const date = parseInstant(startsAt);

  return new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Format just the time portion */
export function formatShowTimeOnly(startsAt: string | Date, timezone: string): string {
  const date = parseInstant(startsAt);

  return new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Format the date portion only */
export function formatShowDate(startsAt: string | Date, timezone: string): string {
  const date = parseInstant(startsAt);

  return new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Get relative day label: 'Tonight', 'Tomorrow', or formatted date */
export function relativeShowDay(startsAt: string | Date, timezone: string): string {
  const date = parseInstant(startsAt);
  const now = new Date();

  const showDay = zonedYmd(date, timezone);
  const today = zonedYmd(now, timezone);
  const tomorrowDay = addCalendarDay(today);

  if (showDay === today) return 'Tonight';
  if (showDay === tomorrowDay) return 'Tomorrow';

  return new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export interface ShowDateParts {
  weekday: string;
  day: string;
  month: string;
}

/** Calendar parts for poster-style dates, always in the venue timezone. */
export function showDateParts(startsAt: string | Date, timezone: string): ShowDateParts {
  const date = parseInstant(startsAt);
  return {
    weekday: new Intl.DateTimeFormat('en-AU', { timeZone: timezone, weekday: 'short' }).format(
      date,
    ),
    day: new Intl.DateTimeFormat('en-AU', { timeZone: timezone, day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat('en-AU', { timeZone: timezone, month: 'short' })
      .format(date)
      .toUpperCase(),
  };
}

/** Format a countdown from remaining milliseconds: "09:42" */
export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Add one calendar day to a YYYY-MM-DD string without using the host timezone. */
export function addCalendarDay(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new RangeError(`Invalid time value: ${isoDate}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Wall-clock datetime-local value in the venue timezone: "2026-08-19T20:00" */
export function toVenueDatetimeLocal(startsAt: string | Date, timezone: string): string {
  const date = parseInstant(startsAt);
  const parts = zonedDateTimeParts(date, timezone);
  const hourRaw = part(parts, 'hour') ?? '00';
  const hour = hourRaw === '24' ? '00' : hourRaw;
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}T${hour}:${part(parts, 'minute')}`;
}

/**
 * Interpret a datetime-local string as a wall clock in `timezone` and
 * return UTC ISO. Two-pass offset correction handles DST.
 */
export function fromVenueDatetimeLocal(local: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) {
    throw new Error('INVALID_DATETIME');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  const asVenueUtc = (ms: number) => {
    const parts = zonedDateTimeParts(new Date(ms), timezone);
    const hourRaw = part(parts, 'hour') ?? '00';
    const hourPart = Number(hourRaw === '24' ? '00' : hourRaw);
    return Date.UTC(
      Number(part(parts, 'year')),
      Number(part(parts, 'month')) - 1,
      Number(part(parts, 'day')),
      hourPart,
      Number(part(parts, 'minute')),
    );
  };

  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let utc = wanted;
  utc -= asVenueUtc(utc) - wanted;
  utc -= asVenueUtc(utc) - wanted;
  const result = new Date(utc);
  if (Number.isNaN(result.getTime())) {
    throw new Error('INVALID_DATETIME');
  }
  return result.toISOString();
}

/** Format a timestamp (booking created_at, etc.) in a venue timezone. */
export function formatInTimeZone(iso: string | Date, timezone: string): string {
  const date = parseInstant(iso);
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Check if a date string is on a given date (in a timezone) */
export function isOnDate(startsAt: string | Date, dateStr: string, timezone: string): boolean {
  return zonedYmd(parseInstant(startsAt), timezone) === dateStr;
}
