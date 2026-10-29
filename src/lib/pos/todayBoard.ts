// POS phase 2 (counter ops) Today board. Plan:
// PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md lines 49-62: "today board (Store
// Pickups / Store Returns due, Deliveries / Collections out)".
//
// Data comes from the get_pos_today_board RPC (migration
// 20261029210000_pos_phase2_counter_ops.sql), which returns every active
// booking across BOTH fulfillment methods with its outbound/return task
// completion flags. The grouping into the four buckets happens here, in pure
// TS, against an explicit reference date — never `new Date()` directly — so
// it is unit-testable without depending on the real calendar day and without
// the UTC-midnight-vs-Aruba-local pitfall documented in src/lib/dateOnly.ts.
//
// No network/Supabase imports here on purpose, same pattern as
// src/lib/pos/posPayments.ts.

export type FulfillmentMethod = 'pickup' | 'delivery';

export interface TodayBoardItem {
  equipment_name: string;
  quantity: number;
}

export interface TodayBoardBooking {
  booking_id: string;
  pickup_code: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  start_date: string;
  end_date: string;
  status: string;
  fulfillment_method: FulfillmentMethod;
  total_amount: number;
  items: TodayBoardItem[];
  /** Outbound leg (task_type 'delivery') completed — hand-over done or driver delivered. */
  outbound_done: boolean;
  /** Return leg (task_type 'pickup') completed — return checked in or driver collected. */
  return_done: boolean;
}

export type TodayBoardBucketId = 'storePickups' | 'storeReturns' | 'deliveriesOut' | 'collectionsIn';

export interface TodayBoard {
  storePickups: TodayBoardBooking[];
  storeReturns: TodayBoardBooking[];
  deliveriesOut: TodayBoardBooking[];
  collectionsIn: TodayBoardBooking[];
}

/** Fulfillment labels per the plan: "Store Pickup / Store Return / Delivery / Collection". */
export const TODAY_BOARD_BUCKET_LABELS: Record<TodayBoardBucketId, string> = {
  storePickups: 'Store Pickups',
  storeReturns: 'Store Returns',
  deliveriesOut: 'Deliveries',
  collectionsIn: 'Collections',
};

const EMPTY_BOARD = (): TodayBoard => ({
  storePickups: [],
  storeReturns: [],
  deliveriesOut: [],
  collectionsIn: [],
});

/**
 * Groups bookings into the four counter-ops buckets for a given reference
 * date ('YYYY-MM-DD'):
 *   - storePickups:   fulfillment_method 'pickup',   start_date = today, outbound not done.
 *   - storeReturns:   fulfillment_method 'pickup',   end_date   = today, return not done.
 *   - deliveriesOut:  fulfillment_method 'delivery', start_date = today, outbound not done.
 *   - collectionsIn:  fulfillment_method 'delivery', end_date   = today, return not done.
 * A same-day rental (start_date === end_date === today) can land in both its
 * outbound and return bucket — the two legs are independent counter actions.
 * A booking whose leg is already done drops off the board for that leg.
 */
export function groupTodayBoard(bookings: TodayBoardBooking[], todayIso: string): TodayBoard {
  const board = EMPTY_BOARD();

  for (const booking of bookings) {
    const isPickup = booking.fulfillment_method === 'pickup';
    const isDelivery = booking.fulfillment_method === 'delivery';

    if (booking.start_date === todayIso && !booking.outbound_done) {
      if (isPickup) board.storePickups.push(booking);
      else if (isDelivery) board.deliveriesOut.push(booking);
    }

    if (booking.end_date === todayIso && !booking.return_done) {
      if (isPickup) board.storeReturns.push(booking);
      else if (isDelivery) board.collectionsIn.push(booking);
    }
  }

  return board;
}

export type TodayBoardAction = 'handover' | 'return' | 'extend' | 'refund';

/**
 * Which row actions apply in a given bucket. Hand-over/return are the
 * counter's own actions and only make sense in the Store Pickup/Return
 * buckets (Deliveries/Collections are driver-executed — complete_delivery_task
 * / complete_collection_task, not this board). Extend and refund are
 * counter-initiated and independent of which leg is due, so they are offered
 * in every bucket.
 */
export function availableActions(bucket: TodayBoardBucketId): TodayBoardAction[] {
  switch (bucket) {
    case 'storePickups':
      return ['handover', 'extend', 'refund'];
    case 'storeReturns':
      return ['return', 'extend', 'refund'];
    case 'deliveriesOut':
    case 'collectionsIn':
      return ['extend', 'refund'];
    default:
      return [];
  }
}
