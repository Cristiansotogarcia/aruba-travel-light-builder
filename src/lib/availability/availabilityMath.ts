// src/lib/availability/availabilityMath.ts

// Booking statuses that consume inventory while active.
export const COMMITTED_STATUSES = [
  'pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit', 'delivered',
] as const;

// Only a fresh unconfirmed request ('pending_admin_review') is a transient hold that auto-expires.
// 'pending' = admin-approved / awaiting payment — a committed hold that must NOT auto-expire.
const PENDING_STATUSES = new Set(['pending_admin_review']);

export interface CommittingBooking {
  id: string;
  status: string; // intentionally wide — avoids a UI-type import; validated at runtime via COMMITTED_STATUSES
  start_date: string; // 'YYYY-MM-DD'
  end_date: string;   // 'YYYY-MM-DD'
  hold_expires_at?: string | null;
  quantity: number;   // quantity of the equipment in question
}

const MS_PER_DAY = 86_400_000;

// Parse a 'YYYY-MM-DD' date as a UTC midnight epoch to avoid timezone drift.
function dayEpoch(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function consumesInventory(
  booking: { status: string; hold_expires_at?: string | null },
  now: Date,
): boolean {
  if (!COMMITTED_STATUSES.includes(booking.status as (typeof COMMITTED_STATUSES)[number])) return false;
  if (PENDING_STATUSES.has(booking.status)) {
    if (!booking.hold_expires_at) return true; // safety: treat as held if no expiry recorded
    return now.getTime() < new Date(booking.hold_expires_at).getTime();
  }
  return true;
}

export interface AvailabilityParams {
  stock: number;
  bufferDays: number;
  reqStart: string; // 'YYYY-MM-DD'
  reqEnd: string;   // 'YYYY-MM-DD'
  committed: CommittingBooking[];
  now?: Date;
  excludeBookingId?: string;
}

// available = stock - peak committed quantity over the requested occupancy window [reqStart, reqEnd + buffer].
// Precondition: reqStart <= reqEnd (callers validate dates first).
export function computeAvailableUnits(params: AvailabilityParams): number {
  const now = params.now ?? new Date();
  const windowStart = dayEpoch(params.reqStart);
  const windowEnd = dayEpoch(params.reqEnd) + params.bufferDays * MS_PER_DAY;

  const active = params.committed.filter(
    (cb) => cb.id !== params.excludeBookingId && consumesInventory(cb, now),
  );

  const activeWithRange = active.map((cb) => ({
    quantity: cb.quantity,
    occStart: dayEpoch(cb.start_date),
    // Both the scan window and each booking's occupancy extend bufferDays past end_date:
    // a unit stays unavailable for bufferDays after return (turnaround gap).
    occEnd: dayEpoch(cb.end_date) + params.bufferDays * MS_PER_DAY,
  }));

  let peak = 0;
  for (let day = windowStart; day <= windowEnd; day += MS_PER_DAY) {
    let onDay = 0;
    for (const r of activeWithRange) {
      if (day >= r.occStart && day <= r.occEnd) onDay += r.quantity;
    }
    if (onDay > peak) peak = onDay;
  }

  return Math.max(0, params.stock - peak);
}
