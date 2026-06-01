// src/lib/rentalDates.ts
export const MIN_NIGHTS = 3; // mirrors the booking minimum in useBooking.ts

export interface RentalRange {
  startDate: string | null; // 'YYYY-MM-DD'
  endDate: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dayEpoch(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function parseRangeFromParams(params: URLSearchParams): RentalRange {
  const start = params.get('start');
  const end = params.get('end');
  return {
    startDate: start && ISO_DATE.test(start) ? start : null,
    endDate: end && ISO_DATE.test(end) ? end : null,
  };
}

export function isValidRange(
  startDate: string | null,
  endDate: string | null,
  now: Date = new Date(),
): boolean {
  if (!startDate || !endDate || !ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) return false;
  const start = dayEpoch(startDate);
  const end = dayEpoch(endDate);
  const todayEpoch = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (start < todayEpoch) return false;
  const nights = (end - start) / 86_400_000;
  return nights >= MIN_NIGHTS;
}
