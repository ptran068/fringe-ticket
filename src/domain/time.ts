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

  // Calculate tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = formatter.format(tomorrow);

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
