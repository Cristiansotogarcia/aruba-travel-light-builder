import { describe, expect, it } from 'vitest';
import { buildPosSaleArgs, type CreatePosSaleInput } from './pos';

const baseInput: CreatePosSaleInput = {
  startDate: '2026-11-01',
  endDate: '2026-11-02',
  leg: 'pickup_now',
  returnLeg: 'store_return',
  customer: { name: 'Jane Doe', email: 'JANE@Example.com', phone: '+297123', address: '', roomNumber: '' },
  items: [{ equipmentId: 'eq-1', equipmentName: 'Beach Chair', quantity: 2 }],
  payments: [{ method: 'cash', amount: 40, tendered: 50 }],
};

describe('buildPosSaleArgs', () => {
  it('never includes a price/total/subtotal field anywhere in the booking or items (pricing is server-derived)', () => {
    const args = buildPosSaleArgs(baseInput);
    expect(args.p_booking).not.toHaveProperty('total_amount');
    expect(args.p_booking).not.toHaveProperty('total');
    expect(args.p_booking).not.toHaveProperty('price');
    for (const item of args.p_items) {
      expect(item).not.toHaveProperty('price');
      expect(item).not.toHaveProperty('equipment_price');
      expect(item).not.toHaveProperty('subtotal');
      expect(item).not.toHaveProperty('unit_price');
      expect(item).not.toHaveProperty('total_price');
    }
  });

  it('maps pickup_now/pickup_later to fulfillment_method "pickup" and delivery to "delivery"', () => {
    expect(buildPosSaleArgs(baseInput).p_booking.fulfillment_method).toBe('pickup');
    expect(buildPosSaleArgs({ ...baseInput, leg: 'pickup_later' }).p_booking.fulfillment_method).toBe('pickup');
    expect(
      buildPosSaleArgs({
        ...baseInput,
        leg: 'delivery',
        customer: { ...baseInput.customer, address: '123 Main St' },
      }).p_booking.fulfillment_method,
    ).toBe('delivery');
  });

  it('lowercases/trims the email and only sends the address for delivery', () => {
    const pickupArgs = buildPosSaleArgs(baseInput);
    expect(pickupArgs.p_booking.customer_email).toBe('jane@example.com');
    expect(pickupArgs.p_booking.customer_address).toBe('');

    const deliveryArgs = buildPosSaleArgs({
      ...baseInput,
      leg: 'delivery',
      customer: { ...baseInput.customer, address: ' 123 Main St ' },
    });
    expect(deliveryArgs.p_booking.customer_address).toBe('123 Main St');
  });

  it('notes "pickup later" and "collection" in customer_comment without touching any validated field', () => {
    const laterArgs = buildPosSaleArgs({ ...baseInput, leg: 'pickup_later' });
    expect(laterArgs.p_booking.customer_comment).toMatch(/later/i);

    const collectionArgs = buildPosSaleArgs({ ...baseInput, returnLeg: 'collection' });
    expect(collectionArgs.p_booking.customer_comment).toMatch(/collection/i);

    const defaultArgs = buildPosSaleArgs(baseInput);
    expect(defaultArgs.p_booking.customer_comment).toBeNull();
  });

  it('passes payment lines through with amount/method/reference/tendered only', () => {
    const args = buildPosSaleArgs(baseInput);
    expect(args.p_payments).toEqual([{ method: 'cash', amount: 40, reference: undefined, tendered: 50 }]);
  });

  it('passes an empty payments array through unchanged ("Pay later")', () => {
    const args = buildPosSaleArgs({ ...baseInput, payments: [] });
    expect(args.p_payments).toEqual([]);
  });
});
