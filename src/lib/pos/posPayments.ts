// Pure POS payment logic: change due, per-line validity, and pay-button
// enablement. Mirrors the server-side rules in migration
// 20261029203000_pos_phase1_counter_sale.sql (pos_create_sale) so the UI and
// the RPC always agree on what counts as a valid payment set:
//   * card requires a reference (last 4 or terminal slip no.).
//   * tendered is cash-only and must be >= the applied amount; change_due =
//     tendered - amount (never negative).
//   * sum(applied amounts) may be < total (partial) but never > it — a cash
//     overpay comes back as change_due, which is never part of the applied
//     amount or the running sum.
// No network/Supabase imports here on purpose: this module is unit-tested in
// isolation (posPayments.test.ts).

export type PosPaymentMethod = 'cash' | 'card' | 'other';

export interface PosPaymentLine {
  method: PosPaymentMethod;
  /** Amount applied toward the total — never the raw cash handed over. */
  amount: number;
  reference?: string;
  /** Cash only: physical cash handed over. Must be >= amount. */
  tendered?: number | null;
}

const EPSILON = 0.005;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** change_due = tendered - amount, rounded to cents, never negative. Mirrors the RPC. */
export function changeDue(amount: number, tendered: number | null | undefined): number {
  if (tendered == null || !Number.isFinite(tendered)) return 0;
  const due = tendered - amount;
  return due > 0 ? round2(due) : 0;
}

/** Validates ONE payment line in isolation. Returns null when valid. */
export function validatePaymentLine(line: PosPaymentLine): string | null {
  if (!Number.isFinite(line.amount) || line.amount <= 0) {
    return 'Enter an amount greater than zero.';
  }
  if (line.method === 'card' && !line.reference?.trim()) {
    return 'Card payments need a reference (last 4 or terminal slip no.).';
  }
  if (line.tendered != null) {
    if (line.method !== 'cash') {
      return 'Tendered cash only applies to the cash method.';
    }
    if (!Number.isFinite(line.tendered) || (line.tendered as number) < line.amount) {
      return 'Tendered must be at least the amount applied.';
    }
  }
  return null;
}

export interface PaymentLineError {
  index: number;
  message: string;
}

export interface PaymentSetValidation {
  valid: boolean;
  errors: PaymentLineError[];
  /** Sum of applied amounts, rounded to cents. */
  totalApplied: number;
  /** total - totalApplied, floored at 0. */
  remaining: number;
  overpaid: boolean;
}

/** Validates the whole set of payment lines against the booking total. */
export function validatePaymentSet(lines: PosPaymentLine[], total: number): PaymentSetValidation {
  const errors: PaymentLineError[] = [];
  lines.forEach((line, index) => {
    const message = validatePaymentLine(line);
    if (message) errors.push({ index, message });
  });

  const totalApplied = round2(
    lines.reduce((sum, l) => sum + (Number.isFinite(l.amount) ? l.amount : 0), 0),
  );
  const overpaid = totalApplied > total + EPSILON;
  const remaining = Math.max(0, round2(total - totalApplied));

  return {
    valid: errors.length === 0 && !overpaid,
    errors,
    totalApplied,
    remaining,
    overpaid,
  };
}

/**
 * "Pay now" is enabled only when there is at least one payment line and the
 * whole set validates clean (no per-line errors, no overpay).
 */
export function isPayNowEnabled(lines: PosPaymentLine[], total: number): boolean {
  if (lines.length === 0) return false;
  if (!Number.isFinite(total) || total <= 0) return false;
  return validatePaymentSet(lines, total).valid;
}

/**
 * "Pay later" submits the sale with zero payment lines (payment_status
 * lands on 'pending'). It never goes through the payment-set gate above —
 * it is always available once the rest of the sale (dates, items, customer)
 * is valid, which the caller checks separately.
 */
export function isPayLaterEnabled(): boolean {
  return true;
}
