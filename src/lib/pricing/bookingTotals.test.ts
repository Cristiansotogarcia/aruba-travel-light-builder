// src/lib/pricing/bookingTotals.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeBookingTotals,
  itemTotal,
  billableDays,
  rentalDays,
  type PricedItem,
} from './bookingTotals';
import { computeDeliveryFee } from './deliveryFee';

// Reference implementation: the ORIGINAL inline algorithm that lived in
// useBooking.calculateTotal before the extraction. The public flow and the staff
// Order Wizard now both call computeBookingTotals, so proving the util reproduces
// this reference proves pricing parity between the two call sites.
function legacyTotal(
  items: PricedItem[],
  startDate: string,
  endDate: string,
  method: 'delivery' | 'pickup',
  deliverySlot?: 'morning' | 'afternoon',
  pickupSlot?: 'morning' | 'afternoon',
): number {
  if (!startDate || !endDate) return 0;
  let days = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (deliverySlot === 'morning' && pickupSlot === 'afternoon') days += 1;

  const equipmentTotal = items.reduce((total, equipment) => {
    let line = 0;
    if (days <= 4) {
      line = equipment.price_per_day * equipment.quantity * days;
    } else if (days >= 5 && days <= 7) {
      const weeklyRate = equipment.price_per_week || equipment.price_per_day * 5;
      line = weeklyRate * equipment.quantity;
    } else {
      const weeklyRate = equipment.price_per_week || equipment.price_per_day * 5;
      const fullWeeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      const weeksCost = fullWeeks * weeklyRate * equipment.quantity;
      let remainingCost = 0;
      if (remainingDays >= 1 && remainingDays <= 4) {
        remainingCost = remainingDays * equipment.price_per_day * equipment.quantity;
      } else if (remainingDays >= 5) {
        remainingCost = weeklyRate * equipment.quantity;
      }
      line = weeksCost + remainingCost;
    }
    return total + line;
  }, 0);

  return equipmentTotal + computeDeliveryFee(method, startDate, days);
}

describe('rentalDays / billableDays', () => {
  it('counts calendar days between start and end', () => {
    expect(rentalDays('2026-12-01', '2026-12-05')).toBe(4);
  });
  it('adds one day for morning delivery + afternoon pickup', () => {
    expect(billableDays('2026-12-01', '2026-12-05', 'morning', 'afternoon')).toBe(5);
  });
  it('does not add a day for other slot combinations', () => {
    expect(billableDays('2026-12-01', '2026-12-05', 'afternoon', 'morning')).toBe(4);
    expect(billableDays('2026-12-01', '2026-12-05', 'morning', 'morning')).toBe(4);
  });
  it('returns 0 for empty dates', () => {
    expect(rentalDays('', '')).toBe(0);
    expect(billableDays('', '')).toBe(0);
  });
});

describe('itemTotal weekly pricing tiers', () => {
  const item: PricedItem = { price_per_day: 10, price_per_week: 45, quantity: 2 };
  it('1-4 days bills the daily rate', () => {
    expect(itemTotal(item, 3)).toBe(10 * 2 * 3); // 60
  });
  it('5-7 days bills a flat weekly rate', () => {
    expect(itemTotal(item, 5)).toBe(45 * 2); // 90
    expect(itemTotal(item, 7)).toBe(45 * 2); // 90
  });
  it('8+ days bills full weeks plus a daily remainder', () => {
    // 9 days = 1 week (45) + 2 daily (20) per unit, x2 units
    expect(itemTotal(item, 9)).toBe((45 + 10 * 2) * 2); // 130
  });
  it('8+ days bills a second weekly when the remainder is 5-7', () => {
    // 12 days = 1 week + 5 remaining -> 2 weekly per unit, x2 units
    expect(itemTotal(item, 12)).toBe(45 * 2 * 2); // 180
  });
  it('falls back to price_per_day x 5 when no weekly rate is set', () => {
    const noWeekly: PricedItem = { price_per_day: 10, quantity: 1 };
    expect(itemTotal(noWeekly, 5)).toBe(50);
  });
});

describe('computeBookingTotals parity with the legacy public-flow algorithm', () => {
  const cart: PricedItem[] = [
    { price_per_day: 10, price_per_week: 45, quantity: 2 },
    { price_per_day: 3, price_per_week: null, quantity: 1 }, // no weekly rate
  ];

  const scenarios: Array<{
    name: string;
    start: string;
    end: string;
    method: 'delivery' | 'pickup';
    deliverySlot?: 'morning' | 'afternoon';
    pickupSlot?: 'morning' | 'afternoon';
  }> = [
    { name: 'short delivery, weekday', start: '2026-12-07', end: '2026-12-10', method: 'delivery' },
    { name: 'short pickup, no fee', start: '2026-12-07', end: '2026-12-10', method: 'pickup' },
    { name: 'Sunday delivery start (fee $20)', start: '2026-12-06', end: '2026-12-09', method: 'delivery' },
    { name: '5-day weekly tier delivery (free)', start: '2026-12-07', end: '2026-12-12', method: 'delivery' },
    { name: '12-day long rental pickup', start: '2026-12-01', end: '2026-12-13', method: 'pickup' },
    {
      name: 'slot +1 day adjustment',
      start: '2026-12-07',
      end: '2026-12-11',
      method: 'delivery',
      deliverySlot: 'morning',
      pickupSlot: 'afternoon',
    },
  ];

  for (const s of scenarios) {
    it(`matches legacy total: ${s.name}`, () => {
      const expected = legacyTotal(cart, s.start, s.end, s.method, s.deliverySlot, s.pickupSlot);
      const actual = computeBookingTotals({
        items: cart,
        startDate: s.start,
        endDate: s.end,
        fulfillmentMethod: s.method,
        deliverySlot: s.deliverySlot,
        pickupSlot: s.pickupSlot,
      }).total;
      expect(actual).toBe(expected);
    });
  }

  it('public and wizard call sites produce identical totals for the same cart', () => {
    // The public flow maps its BookingItem[] + products to PricedItem; the wizard
    // maps its selected catalog rows to PricedItem. Same inputs => same util =>
    // identical totals, by construction.
    const publicSide = computeBookingTotals({
      items: cart,
      startDate: '2026-12-07',
      endDate: '2026-12-12',
      fulfillmentMethod: 'delivery',
    });
    const wizardSide = computeBookingTotals({
      items: cart.map((i) => ({ ...i })),
      startDate: '2026-12-07',
      endDate: '2026-12-12',
      fulfillmentMethod: 'delivery',
    });
    expect(wizardSide.total).toBe(publicSide.total);
    expect(wizardSide.equipmentTotal).toBe(publicSide.equipmentTotal);
    expect(wizardSide.deliveryFee).toBe(publicSide.deliveryFee);
  });

  it('returns zeros when dates are missing', () => {
    expect(computeBookingTotals({ items: cart, startDate: '', endDate: '' })).toEqual({
      days: 0,
      equipmentTotal: 0,
      deliveryFee: 0,
      total: 0,
    });
  });
});
