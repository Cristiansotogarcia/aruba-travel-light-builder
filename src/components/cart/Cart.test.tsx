import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cart from './Cart';

const cart = vi.hoisted(() => ({
  items: [] as Array<{ equipment_id: string; equipment_name: string; equipment_price: number; quantity: number; subtotal: number }>,
  weeklyRates: {} as Record<string, number | undefined>,
}));
const dates = vi.hoisted(() => ({ startDate: '', endDate: '' }));

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({ ...cart, removeItem: vi.fn(), updateItemQuantity: vi.fn() }),
}));
vi.mock('@/hooks/useRentalDates', () => ({ useRentalDates: () => dates }));

const chair = { equipment_id: 'c1', equipment_name: 'Beach Chair', equipment_price: 4, quantity: 1, subtotal: 4 };

const renderCart = () => render(<BrowserRouter><Cart /></BrowserRouter>);

describe('Cart estimated total', () => {
  beforeEach(() => {
    cart.items = [chair];
    cart.weeklyRates = {};
    dates.startDate = '';
    dates.endDate = '';
  });

  it('multiplies the daily rate by the rental days', () => {
    dates.startDate = '2026-11-01';
    dates.endDate = '2026-11-05';
    renderCart();
    expect(screen.getByText('$16.00')).toBeInTheDocument();
    expect(screen.getByText(/Subtotal: \$16\.00 for 4 days/)).toBeInTheDocument();
  });

  it('multiplies by quantity as well as days', () => {
    cart.items = [{ ...chair, quantity: 3 }];
    dates.startDate = '2026-11-01';
    dates.endDate = '2026-11-04';
    renderCart();
    expect(screen.getByText('$36.00')).toBeInTheDocument();
  });

  it('uses the weekly rate for a 5-7 day rental, like the booking does', () => {
    cart.weeklyRates = { c1: 15 };
    dates.startDate = '2026-11-01';
    dates.endDate = '2026-11-07';
    renderCart();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
  });

  it('falls back to 5 x the daily rate when no weekly rate is set', () => {
    dates.startDate = '2026-11-01';
    dates.endDate = '2026-11-07';
    renderCart();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
  });

  it('shows the per-day rate when no dates are picked yet', () => {
    renderCart();
    expect(screen.getAllByText('$4.00/day')).toHaveLength(2);
  });
});
