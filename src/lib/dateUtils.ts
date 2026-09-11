/**
 * Date & Time utilities configured strictly for Asia/Kolkata (IST, UTC+05:30).
 * Every user action timestamp (booking, QR scanning, pickup, tracking, reports)
 * displays the exact moment in Indian Standard Time (IST).
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current timestamp as an ISO string.
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formats a Date or ISO string into a full IST display string:
 * e.g., "10 Sep 2026, 11:42 PM IST"
 */
export function formatISTDateTime(dateOrIso?: string | Date | number | null): string {
  if (!dateOrIso) return 'Just now';
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return String(dateOrIso);

  const options: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const formatted = new Intl.DateTimeFormat('en-IN', options).format(d);
  return `${formatted} IST`;
}

/**
 * Formats a Date or ISO string into a time-only IST display string:
 * e.g., "11:45 PM IST"
 */
export function formatISTTime(dateOrIso?: string | Date | number | null): string {
  if (!dateOrIso) return 'Just now';
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return String(dateOrIso);

  const options: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const formatted = new Intl.DateTimeFormat('en-IN', options).format(d);
  return `${formatted} IST`;
}

/**
 * Formats a Date or ISO string into a date-only IST display string:
 * e.g., "10 Sep 2026"
 */
export function formatISTDate(dateOrIso?: string | Date | number | null): string {
  if (!dateOrIso) return '';
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return String(dateOrIso);

  const options: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  return new Intl.DateTimeFormat('en-IN', options).format(d);
}

/**
 * Checks if a given timestamp falls on "Today" under IST calendar boundaries.
 */
export function isTodayIST(dateOrIso?: string | Date | number | null): boolean {
  if (!dateOrIso) return false;
  const target = new Date(dateOrIso);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };

  const todayStr = new Intl.DateTimeFormat('en-CA', formatOptions).format(now);
  const targetStr = new Intl.DateTimeFormat('en-CA', formatOptions).format(target);

  return todayStr === targetStr;
}

/**
 * Checks if a given timestamp falls within the last N days in IST.
 */
export function isWithinDaysIST(dateOrIso: string | Date | number | null, days: number): boolean {
  if (!dateOrIso) return false;
  const target = new Date(dateOrIso);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}
