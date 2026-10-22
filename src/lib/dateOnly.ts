// src/lib/dateOnly.ts
// Rental dates are calendar days ('YYYY-MM-DD', Postgres `date`), not instants.
// `new Date('2026-10-22')` parses as UTC midnight, which in Aruba (UTC-4) is
// Oct 21 20:00 local, so every local read (toLocaleDateString, getDay, format,
// isSameDay) lands one day early. Parse and print them through these helpers.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local-midnight Date for a 'YYYY-MM-DD' string; other strings parse as instants. */
export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = DATE_ONLY.exec(value);
  if (!m) return new Date(value);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 'YYYY-MM-DD' for the local calendar day of `date`. */
export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's local calendar day as 'YYYY-MM-DD'. */
export function todayDateOnly(now: Date = new Date()): string {
  return toDateOnly(now);
}

/** Display a rental date in the viewer's locale without shifting the day. */
export function formatDateOnly(
  value: string | Date,
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions,
): string {
  return parseDateOnly(value).toLocaleDateString(locales, options);
}

/** Whole days between two 'YYYY-MM-DD' strings (end - start), DST-safe. */
export function daysBetween(start: string, end: string): number {
  const a = parseDateOnly(start);
  const b = parseDateOnly(end);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  );
}

export function isSundayDateOnly(value: string): boolean {
  return parseDateOnly(value).getDay() === 0;
}
