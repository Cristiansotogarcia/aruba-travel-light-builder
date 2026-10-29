// Pure validation for the counter's "refund via credit note" action. Mirrors
// create_credit_note's server-side limit (contract: "a booking can never be
// credited past its total across multiple notes" —
// 20260704120000_w5_invoicing_accounting.sql, widened to Booker/StoreStaff by
// 20261029200000_pos_phase2_counter_ops.sql). The RPC re-checks this under an
// advisory lock and is authoritative; this only blocks an obviously invalid
// amount before the round trip.
const EPSILON = 0.005;
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface RefundValidationResult {
  valid: boolean;
  error: string | null;
  /** bookingTotal - alreadyCredited, floored at 0. */
  remaining: number;
}

export function validateRefundAmount(
  amount: number,
  bookingTotal: number,
  alreadyCredited: number,
  reason: string,
): RefundValidationResult {
  const remaining = Math.max(0, round2(bookingTotal - alreadyCredited));

  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'Enter a refund amount greater than zero.', remaining };
  }

  if (!reason.trim()) {
    return { valid: false, error: 'A reason is required.', remaining };
  }

  if (amount > remaining + EPSILON) {
    return {
      valid: false,
      error: `Refund amount exceeds the remaining creditable amount ($${remaining.toFixed(2)}).`,
      remaining,
    };
  }

  return { valid: true, error: null, remaining };
}
