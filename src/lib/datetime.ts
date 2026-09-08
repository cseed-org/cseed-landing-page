/**
 * Date helpers shared by the event pages.
 *
 * Everything is pinned to an explicit time zone. Without it, formatting would use
 * whatever zone the *build machine* runs in — CI runs in UTC, so a 5:30pm Seattle
 * event would render as the next day.
 */

export const SITE_TIME_ZONE = 'America/Los_Angeles';

/** "Fri, Oct 2, 2026" */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

/** "5:30 PM" */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

/** Machine-readable value for the <time datetime="..."> attribute. */
export function isoDate(date: Date): string {
  return date.toISOString();
}

/** True when the event has not happened yet. */
export function isUpcoming(date: Date, now: Date = new Date()): boolean {
  return date.getTime() >= now.getTime();
}
