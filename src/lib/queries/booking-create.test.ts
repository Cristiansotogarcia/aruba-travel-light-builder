import { describe, it, expect } from 'vitest';
import { buildCreateBookingArgs, parseAvailabilityConflict } from './booking-create';

describe('buildCreateBookingArgs', () => {
  it('maps booking form data to the RPC argument shape', () => {
    const args = buildCreateBookingArgs({
      startDate: '2026-12-01', endDate: '2026-12-05', totalAmount: 100,
      customerInfo: { name: 'Jane', email: 'JANE@X.com', phone: '297', address: 'Hotel', room_number: '', comment: '' },
      deliverySlot: 'morning', pickupSlot: 'afternoon',
      items: [{ equipment_id: 'eq1', equipment_name: 'Chair', equipment_price: 10, quantity: 2, subtotal: 80 }],
    });
    expect(args.p_booking).toMatchObject({ start_date: '2026-12-01', customer_name: 'Jane', customer_email: 'jane@x.com', delivery_slot: 'morning', total_amount: 100 });
    expect(args.p_items).toHaveLength(1);
    expect(args.p_items[0]).toMatchObject({ equipment_id: 'eq1', quantity: 2 });
  });
});

describe('parseAvailabilityConflict', () => {
  it('extracts conflicts from the RPC error message', () => {
    const msg = 'AVAILABILITY_CONFLICT: [{"equipment_id":"eq1","requested":3,"available":1}]';
    expect(parseAvailabilityConflict(msg)).toEqual([{ equipment_id: 'eq1', requested: 3, available: 1 }]);
  });
  it('returns null for unrelated errors', () => {
    expect(parseAvailabilityConflict('some other error')).toBeNull();
  });
});
