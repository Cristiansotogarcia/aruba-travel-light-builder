import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PosTotalsPreview } from './PosTotalsPreview';
import { computeBookingTotals } from '@/lib/pricing/bookingTotals';

describe('PosTotalsPreview', () => {
  it('displays exactly the total computeBookingTotals returns for the same cart/dates (pickup)', () => {
    const totals = computeBookingTotals({
      items: [{ price_per_day: 20, price_per_week: 100, quantity: 2 }],
      startDate: '2026-11-01',
      endDate: '2026-11-04',
      fulfillmentMethod: 'pickup',
    });
    render(<PosTotalsPreview totals={totals} itemCount={1} />);
    expect(screen.getByTestId('pos-preview-total')).toHaveTextContent(`$${totals.total.toFixed(2)}`);
  });

  it('displays exactly the total computeBookingTotals returns including a delivery fee', () => {
    const totals = computeBookingTotals({
      items: [{ price_per_day: 15, price_per_week: null, quantity: 1 }],
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      deliverySlot: 'morning',
      pickupSlot: 'afternoon',
      fulfillmentMethod: 'delivery',
    });
    render(<PosTotalsPreview totals={totals} itemCount={1} />);
    expect(screen.getByTestId('pos-preview-total')).toHaveTextContent(`$${totals.total.toFixed(2)}`);
    expect(totals.deliveryFee).toBeGreaterThanOrEqual(0);
  });

  it('displays $0.00 for an empty cart (no dates yet)', () => {
    const totals = computeBookingTotals({ items: [], startDate: '', endDate: '', fulfillmentMethod: 'pickup' });
    render(<PosTotalsPreview totals={totals} itemCount={0} />);
    expect(screen.getByTestId('pos-preview-total')).toHaveTextContent('$0.00');
  });
});
