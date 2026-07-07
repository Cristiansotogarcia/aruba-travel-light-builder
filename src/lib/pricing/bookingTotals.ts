// Single source of truth for rental pricing. Consumed by BOTH the public booking
// flow (useBooking) and the staff Order Wizard so their totals can never drift.
//
// Pricing rules (extracted verbatim from the original inline logic in
// useBooking.calculateTotal):
//   * Billable days = calendar days between start and end, PLUS one extra day when
//     delivery is in the morning and pickup is in the afternoon (equipment is out
//     for an extra half-rotation).
//   * Per item:
//       1-4 days  -> daily rate x quantity x days
//       5-7 days  -> flat weekly rate x quantity   (weekly rate = price_per_week,
//                    or price_per_day x 5 when no weekly rate is set)
//       8+ days   -> full weeks at the weekly rate, plus the remainder billed as
//                    1-4 days = daily, 5+ = another weekly.
//   * Delivery fee comes from computeDeliveryFee (pickup is always $0).
import { computeDeliveryFee, type FulfillmentMethod } from './deliveryFee';

export interface PricedItem {
  price_per_day: number;
  price_per_week?: number | null;
  quantity: number;
}

export type TimeSlot = 'morning' | 'afternoon';

/** Raw calendar days between two ISO dates (end - start). */
export function rentalDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

/** Days actually billed, applying the morning-delivery + afternoon-pickup +1 rule. */
export function billableDays(
  startDate: string,
  endDate: string,
  deliverySlot?: TimeSlot,
  pickupSlot?: TimeSlot,
): number {
  const days = rentalDays(startDate, endDate);
  if (days <= 0) return 0;
  if (deliverySlot === 'morning' && pickupSlot === 'afternoon') return days + 1;
  return days;
}

/** Cost of a single line item for a given number of billable days. */
export function itemTotal(item: PricedItem, days: number): number {
  if (days <= 0) return 0;
  const perDay = item.price_per_day;
  const weekly = item.price_per_week || perDay * 5;

  if (days <= 4) {
    return perDay * item.quantity * days;
  }
  if (days <= 7) {
    return weekly * item.quantity;
  }

  const fullWeeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  const weeksCost = fullWeeks * weekly * item.quantity;

  let remainingCost = 0;
  if (remainingDays >= 1 && remainingDays <= 4) {
    remainingCost = remainingDays * perDay * item.quantity;
  } else if (remainingDays >= 5) {
    remainingCost = weekly * item.quantity;
  }

  return weeksCost + remainingCost;
}

export interface BookingTotalsInput {
  items: PricedItem[];
  startDate: string;
  endDate: string;
  deliverySlot?: TimeSlot;
  pickupSlot?: TimeSlot;
  fulfillmentMethod?: FulfillmentMethod;
}

export interface BookingTotals {
  days: number;
  equipmentTotal: number;
  deliveryFee: number;
  total: number;
}

/** Full priced breakdown for a cart. Returns zeros when dates are missing. */
export function computeBookingTotals(input: BookingTotalsInput): BookingTotals {
  const { items, startDate, endDate, deliverySlot, pickupSlot, fulfillmentMethod } = input;
  if (!startDate || !endDate) {
    return { days: 0, equipmentTotal: 0, deliveryFee: 0, total: 0 };
  }
  const days = billableDays(startDate, endDate, deliverySlot, pickupSlot);
  const equipmentTotal = items.reduce((sum, item) => sum + itemTotal(item, days), 0);
  const deliveryFee = computeDeliveryFee(fulfillmentMethod ?? 'delivery', startDate, days);
  return { days, equipmentTotal, deliveryFee, total: equipmentTotal + deliveryFee };
}
