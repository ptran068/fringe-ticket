/**
 * Timezone-aware time formatting.
 * Always uses the venue's IANA timezone — never the browser's local timezone.
 * DST is handled automatically by Intl.DateTimeFormat.
 */

/** Format a show's start time in the venue's timezone */
export function formatShowTime(startsAt: string | Date, timezone: string): string {
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;

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
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;

  return new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Format the date portion only */
export function formatShowDate(startsAt: string | Date, timezone: string): string {
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;

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
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  const now = new Date();

  // Format both dates in the venue timezone to compare days
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const showDay = formatter.format(date);
  const today = formatter.format(now);
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
  const [year, month, day] = isoDate.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

/** Wall-clock datetime-local value in the venue timezone: "2026-08-19T20:00" */
export function toVenueDatetimeLocal(startsAt: string | Date, timezone: string): string {
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
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
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(ms));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  };

  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let utc = wanted;
  utc -= asVenueUtc(utc) - wanted;
  utc -= asVenueUtc(utc) - wanted;
  return new Date(utc).toISOString();
}

/** Format a timestamp (booking created_at, etc.) in a venue timezone. */
export function formatInTimeZone(iso: string | Date, timezone: string): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Check if a date string is on a given date (in a timezone) */
export function isOnDate(startsAt: string | Date, dateStr: string, timezone: string): boolean {
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date) === dateStr;
}
