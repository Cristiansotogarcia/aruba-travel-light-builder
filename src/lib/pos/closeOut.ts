// Pure POS cash close-out logic: expected cash, variance, and close-button
// enablement. Mirrors the server-side rules in migration
// 20261029220000_pos_phase3_close_out.sql (pos_close_drawer) so the UI and
// the RPC always agree on what counts as closeable:
//   * expected_cash = opening float + cash sales since the drawer opened.
//   * variance = counted cash - expected cash.
//   * a non-zero variance needs a note; zero variance needs none.
// No network/Supabase imports here on purpose, same pattern as posPayments.ts.

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** expected_cash = opening float + cash sales since open, rounded to cents.
 * Mirrors pos_close_drawer / pos_drawer_cash_so_far. */
export function computeExpectedCash(openingFloat: number, cashSales: number): number {
  return round2(openingFloat + cashSales);
}

/** variance = counted cash - expected cash, rounded to cents. Mirrors pos_close_drawer. */
export function computeVariance(counted: number, expected: number): number {
  return round2(counted - expected);
}

export interface CanCloseDrawerInput {
  /** Counted cash entered by staff. Must be a finite number >= 0. */
  counted: number;
  /** computeVariance(counted, expected) — passed in rather than recomputed so
   * callers share one source of truth with the live display. */
  variance: number;
  /** Required only when variance is non-zero. */
  note: string;
}

/**
 * "Close drawer" is enabled only when counted cash is a valid non-negative
 * number and, if the variance is non-zero, a note has been entered.
 */
export function canCloseDrawer({ counted, variance, note }: CanCloseDrawerInput): boolean {
  if (!Number.isFinite(counted) || counted < 0) return false;
  if (variance !== 0 && note.trim().length === 0) return false;
  return true;
}
