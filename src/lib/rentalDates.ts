// src/lib/rentalDates.ts
export const MIN_NIGHTS = 3; // mirrors the booking minimum in useBooking.ts

export interface RentalRange {
  startDate: string | null; // 'YYYY-MM-DD'
  endDate: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function dayEpoch(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function parseRangeFromParams(params: URLSearchParams): RentalRange {
  const start = params.get('start');
  const end = params.get('end');
  return {
    startDate: start && isRealIsoDate(start) ? start : null,
    endDate: end && isRealIsoDate(end) ? end : null,
  };
}

export function isValidRange(
  startDate: string | null,
  endDate: string | null,
  now: Date = new Date(),
): boolean {
  if (!startDate || !endDate || !isRealIsoDate(startDate) || !isRealIsoDate(endDate)) return false;
  const start = dayEpoch(startDate);
  const end = dayEpoch(endDate);
  const todayEpoch = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (start < todayEpoch) return false;
  const nights = (end - start) / 86_400_000;
  return nights >= MIN_NIGHTS;
}
