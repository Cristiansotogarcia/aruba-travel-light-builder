import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/types/types';
import { CART_STORAGE_KEY, CartProvider, useCart } from './useCart';

vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const chair = {
  id: 'eq-1',
  name: 'Beach Chair',
  price_per_day: 10,
  price_per_week: 40,
  stock_quantity: 10,
} as unknown as Product;

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

// A page reload is a fresh provider mount over the same sessionStorage.
const mount = () => renderHook(() => useCart(), { wrapper });

describe('useCart persistence', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('keeps the cart through a page reload', () => {
    const first = mount();
    act(() => first.result.current.addItem(chair, 2));
    first.unmount();

    const reloaded = mount();
    expect(reloaded.result.current.items).toHaveLength(1);
    expect(reloaded.result.current.items[0]).toMatchObject({ equipment_id: 'eq-1', quantity: 2 });
    expect(reloaded.result.current.weeklyRates).toEqual({ 'eq-1': 40 });
  });

  it('keeps quantity changes and removals through a reload', () => {
    const first = mount();
    act(() => first.result.current.addItem(chair, 1));
    act(() => first.result.current.updateItemQuantity('eq-1', 5));
    first.unmount();
    expect(mount().result.current.items[0].quantity).toBe(5);

    const second = mount();
    act(() => second.result.current.removeItem('eq-1'));
    second.unmount();
    expect(mount().result.current.items).toEqual([]);
  });

  it('empties the stored cart on clearCart, which checkout calls', () => {
    const first = mount();
    act(() => first.result.current.addItem(chair, 1));
    expect(sessionStorage.getItem(CART_STORAGE_KEY)).not.toBeNull();

    act(() => first.result.current.clearCart());
    expect(sessionStorage.getItem(CART_STORAGE_KEY)).toBeNull();
    first.unmount();
    expect(mount().result.current.items).toEqual([]);
  });

  it('uses sessionStorage, not localStorage, so closing the tab drops the cart', () => {
    const first = mount();
    act(() => first.result.current.addItem(chair, 1));
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(CART_STORAGE_KEY)).not.toBeNull();
  });

  it('starts empty when the stored value is corrupt or malformed', () => {
    sessionStorage.setItem(CART_STORAGE_KEY, '{not json');
    expect(mount().result.current.items).toEqual([]);

    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [{ foo: 1 }], weeklyRates: 7 }));
    const r = mount();
    expect(r.result.current.items).toEqual([]);
    expect(r.result.current.weeklyRates).toEqual({});
  });
});
