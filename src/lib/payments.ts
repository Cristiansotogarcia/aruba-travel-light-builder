// Manual-payment reconciliation helpers (Workstream W4).
// Payments are recorded manually by admins (bank transfer, cash, payment link, etc.).
// This module holds the PURE derivation logic that mirrors the SECURITY DEFINER
// RPC `record_booking_payment` in migration 20260704110000, so the UI and the DB
// agree on how payment_status is computed.

export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface BookingPayment {
  id: string;
  booking_id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
}

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'payment_link', label: 'Payment link' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

/** Sum of an arbitrary list of payment amounts, guarding against NaN/undefined. */
export const sumPayments = (payments: Array<Pick<BookingPayment, 'amount'>>): number =>
  payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

/**
 * Derive the booking payment_status from the total paid vs the booking total.
 * Mirrors the SQL in `record_booking_payment`:
 *   'paid'    when sum(payments) >= total_amount (and total > 0)
 *   'partial' when 0 < sum < total_amount
 *   'pending' otherwise (nothing paid, or total is 0/unknown)
 *
 * Uses a small epsilon so floating-point rounding never leaves a fully-paid
 * booking stuck on 'partial'.
 */
export const derivePaymentStatus = (
  totalPaid: number,
  totalAmount: number,
): PaymentStatus => {
  const paid = Number(totalPaid) || 0;
  const total = Number(totalAmount) || 0;
  const EPSILON = 0.005;

  if (paid <= 0) return 'pending';
  if (total > 0 && paid >= total - EPSILON) return 'paid';
  return 'partial';
};

/** Outstanding balance (never negative — overpayment shows as 0 owed). */
export const outstandingBalance = (totalPaid: number, totalAmount: number): number => {
  const balance = (Number(totalAmount) || 0) - (Number(totalPaid) || 0);
  return balance > 0 ? Math.round(balance * 100) / 100 : 0;
};
