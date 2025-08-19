import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateBookingStatus } from './bookings';
import type { BookingStatus } from '@/components/admin/calendar/types';

// Mock the Supabase client used in the query utilities
const singleFn = vi.fn();
const selectFn = vi.fn(() => ({ single: singleFn }));
const eqFn = vi.fn(() => ({ select: selectFn }));
const updateFn = vi.fn(() => ({ eq: eqFn }));
const fromFn = vi.fn(() => ({ update: updateFn }));
const invokeFn = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromFn,
    functions: { invoke: invokeFn },
  },
}));

describe('updateBookingStatus', () => {
  beforeEach(() => {
    singleFn.mockReset();
    selectFn.mockClear();
  });

  it('includes equipment details in the updated booking', async () => {
    const mockBooking = {
      id: '1',
      customer_email: null,
      booking_items: [
        {
          equipment_name: 'Stroller',
          quantity: 1,
          equipment_price: 10,
          equipment_id: 'eq1',
          subtotal: 10,
          equipment: { id: 'eq1', name: 'Stroller', price_per_day: 10 },
        },
      ],
    };

    singleFn.mockResolvedValue({ data: mockBooking, error: null });

    const result = await updateBookingStatus('1', 'confirmed' as BookingStatus);

    expect(selectFn).toHaveBeenCalledWith('*, booking_items(*, equipment(*))');
    expect(result?.booking_items[0].equipment?.name).toBe('Stroller');
  });
});

