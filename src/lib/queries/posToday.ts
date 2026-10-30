// POS phase 2 (counter ops) RPC wrappers. Contract:
// PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md lines 49-62. Pairs with
// supabase/migrations/20261029210000_pos_phase2_counter_ops.sql and the pure
// grouping/validation modules in src/lib/pos/{todayBoard,extendRental,refund}.ts.
import { supabase } from '@/integrations/supabase/client';
import type { TodayBoardBooking } from '@/lib/pos/todayBoard';

/** Today board: all active bookings across both fulfillment methods, with
 * outbound/return task completion flags. Grouping into the four buckets
 * happens client-side (groupTodayBoard). */
export async function fetchPosTodayBoard(): Promise<TodayBoardBooking[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_pos_today_board');
  if (error) throw error;
  return (data as TodayBoardBooking[]) ?? [];
}

export interface ExtendBookingRentalResult {
  bookingId: string;
  oldEndDate: string;
  newEndDate: string;
  oldTotal: number;
  newTotal: number;
  additionalAmount: number;
  paymentStatus: string;
}

interface ExtendBookingRentalRow {
  booking_id: string;
  old_end_date: string;
  new_end_date: string;
  old_total: number;
  new_total: number;
  additional_amount: number;
  payment_status: string;
}

/** Extends a booking's end date. No client price/total is ever sent — the
 * RPC re-checks stock and reprices server-side (see the migration; pricing
 * currently depends on public.price_booking, which does not exist on this
 * branch yet — same gap pos_create_sale already carries). */
export async function extendBookingRental(
  bookingId: string,
  newEndDate: string,
): Promise<ExtendBookingRentalResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('extend_booking_rental', {
    p_booking_id: bookingId,
    p_new_end_date: newEndDate,
  });
  if (error) throw error;
  const row = data as ExtendBookingRentalRow;
  return {
    bookingId: row.booking_id,
    oldEndDate: row.old_end_date,
    newEndDate: row.new_end_date,
    oldTotal: Number(row.old_total),
    newTotal: Number(row.new_total),
    additionalAmount: Number(row.additional_amount),
    paymentStatus: row.payment_status,
  };
}

export interface IssueCounterRefundResult {
  id: string;
  bookingId: string;
  creditNumber: string;
  amount: number;
  reason: string;
}

interface CreateCreditNoteRow {
  id: string;
  booking_id: string;
  credit_number: string;
  amount: number;
  reason: string;
}

/** Refund via credit note — reuses the existing create_credit_note RPC
 * (role gate widened to Booker/StoreStaff by the phase 2 migration). */
export async function issueCounterRefund(
  bookingId: string,
  amount: number,
  reason: string,
): Promise<IssueCounterRefundResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('create_credit_note', {
    p_booking_id: bookingId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw error;
  const row = data as CreateCreditNoteRow;
  return {
    id: row.id,
    bookingId: row.booking_id,
    creditNumber: row.credit_number,
    amount: Number(row.amount),
    reason: row.reason,
  };
}
