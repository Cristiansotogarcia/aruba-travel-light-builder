// src/lib/pricing/bookingTotals.parity.test.ts
//
// Shared case table parity: supabase/tests/price_booking_parity_cases.json
// is read here AND spliced into supabase/tests/price_booking.test.sql by
// supabase/tests/run-price-booking-tests.sh (as the
// app.price_booking_parity_cases GUC), so this TS original and its SQL port
// (public.price_booking, supabase/migrations/20261030130000_price_booking.sql,
// goal tlb-pos) are proven against the exact same cases and can never
// silently drift apart.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { computeBookingTotals, type PricedItem, type TimeSlot } from './bookingTotals';

interface ParityCaseItem {
  price_per_day: number;
  price_per_week: number | null;
  quantity: number;
}

interface ParityCase {
  id: string;
  startDate: string;
  endDate: string;
  deliverySlot: TimeSlot | null;
  pickupSlot: TimeSlot | null;
  fulfillmentMethod: 'delivery' | 'pickup' | null;
  items: ParityCaseItem[];
  expectedDays: number;
  expectedEquipmentTotal: number;
  expectedDeliveryFee: number;
  expectedTotal: number;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const casesPath = path.resolve(__dirname, '../../../supabase/tests/price_booking_parity_cases.json');
const cases: ParityCase[] = JSON.parse(readFileSync(casesPath, 'utf-8'));

describe('computeBookingTotals parity with public.price_booking (shared case table)', () => {
  for (const c of cases) {
    it(`${c.id}: matches the SQL port`, () => {
      const items: PricedItem[] = c.items.map((i) => ({
        price_per_day: i.price_per_day,
        price_per_week: i.price_per_week,
        quantity: i.quantity,
      }));
      const result = computeBookingTotals({
        items,
        startDate: c.startDate,
        endDate: c.endDate,
        deliverySlot: c.deliverySlot ?? undefined,
        pickupSlot: c.pickupSlot ?? undefined,
        fulfillmentMethod: c.fulfillmentMethod ?? undefined,
      });
      expect(result.days).toBe(c.expectedDays);
      expect(result.equipmentTotal).toBe(c.expectedEquipmentTotal);
      expect(result.deliveryFee).toBe(c.expectedDeliveryFee);
      expect(result.total).toBe(c.expectedTotal);
    });
  }

  it('loaded the full shared case table, not an empty or truncated file', () => {
    expect(cases.length).toBeGreaterThanOrEqual(15);
  });
});
