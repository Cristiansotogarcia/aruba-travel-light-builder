import { renderHook, waitFor } from '@testing-library/react';
import { addDays, format } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { computeBookingTotals } from '@/lib/pricing/bookingTotals';

// One equipment row as stored. The supabase mock returns only the columns the
// hook asks for, so a select list that omits price_per_week loses the weekly rate.
const row = {
  id: 'eq-1',
  name: 'Beach Chair',
  description: '',
  price_per_day: 10,
  price_per_week: 40,
  category: 'Beach',
  images: [],
  stock_quantity: 10,
  availability_status: 'Available',
  created_at: null,
  updated_at: null,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: (cols: string) => {
        const keys = cols.split(',').map((c) => c.trim());
        const projected = Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k]]));
        return Promise.resolve({ data: [projected], error: null });
      },
    }),
  },
}));

const start = format(addDays(new Date(), 30), 'yyyy-MM-dd');
const end = format(addDays(new Date(), 37), 'yyyy-MM-dd');
const cartItems = [{ equipment_id: 'eq-1', equipment_name: 'Beach Chair', quantity: 1 }];

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useCart', () => ({ useCart: () => ({ items: cartItems, clearCart: vi.fn() }) }));
vi.mock('@/hooks/useRentalDates', () => ({ useRentalDates: () => ({ startDate: start, endDate: end }) }));

import useBooking from './useBooking';

describe('useBooking calculateTotal', () => {
  it('charges the configured weekly rate for a 7-night stay', async () => {
    const { result } = renderHook(() => useBooking());
    await waitFor(() => expect(result.current.products).toHaveLength(1));

    expect(result.current.products[0].price_per_week).toBe(40);

    const totals = (price_per_week?: number) =>
      computeBookingTotals({
        items: [{ price_per_day: 10, price_per_week, quantity: 1 }],
        startDate: start,
        endDate: end,
        deliverySlot: undefined,
        pickupSlot: undefined,
        fulfillmentMethod: 'delivery',
      }).total;

    expect(result.current.calculateTotal()).toBe(totals(40));
    // Guard that the weekly rate actually matters here: the daily fallback differs.
    expect(totals(40)).not.toBe(totals(undefined));
  });
});
