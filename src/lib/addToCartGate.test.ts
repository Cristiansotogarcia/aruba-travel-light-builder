import { describe, it, expect } from 'vitest';
import { addToCartGate, gateMessage, unitsFor } from './addToCartGate';

// Local noon on 2026-10-22 so "today" is the 22nd whatever the runner's TZ.
const now = new Date(2026, 9, 22, 12, 0, 0);
const range = { startDate: '2026-10-25', endDate: '2026-10-29', now };

describe('addToCartGate', () => {
  it('refuses with needs-dates when no dates are set', () => {
    expect(addToCartGate({ startDate: null, endDate: null, availableUnits: 5, quantity: 1, now }))
      .toEqual({ ok: false, reason: 'needs-dates' });
  });

  it('refuses with needs-dates for a range under the minimum nights', () => {
    expect(addToCartGate({ startDate: '2026-10-25', endDate: '2026-10-26', availableUnits: 5, quantity: 1, now }).reason)
      .toBe('needs-dates');
  });

  it('refuses with needs-dates for a start date in the past', () => {
    expect(addToCartGate({ startDate: '2026-10-21', endDate: '2026-10-28', availableUnits: 5, quantity: 1, now }).reason)
      .toBe('needs-dates');
  });

  it('accepts today as a start date', () => {
    expect(addToCartGate({ startDate: '2026-10-22', endDate: '2026-10-26', availableUnits: 5, quantity: 1, now }).ok)
      .toBe(true);
  });

  it('waits while availability is still loading', () => {
    expect(addToCartGate({ ...range, availableUnits: null, quantity: 1 }).reason).toBe('checking');
    expect(addToCartGate({ ...range, availableUnits: undefined, quantity: 1 }).reason).toBe('checking');
  });

  it('refuses an item with no free units for the dates', () => {
    expect(addToCartGate({ ...range, availableUnits: 0, quantity: 1 }).reason).toBe('unavailable');
  });

  it('counts units already in the cart', () => {
    expect(addToCartGate({ ...range, availableUnits: 3, quantity: 1, inCart: 3 }).reason).toBe('unavailable');
    expect(addToCartGate({ ...range, availableUnits: 3, quantity: 2, inCart: 2 }))
      .toEqual({ ok: false, reason: 'insufficient', remaining: 1 });
    expect(addToCartGate({ ...range, availableUnits: 3, quantity: 1, inCart: 2 }).ok).toBe(true);
  });

  it('refuses a quantity above what is free', () => {
    expect(addToCartGate({ ...range, availableUnits: 2, quantity: 3 }))
      .toEqual({ ok: false, reason: 'insufficient', remaining: 2 });
  });

  it('accepts when dates are valid and enough units are free', () => {
    expect(addToCartGate({ ...range, availableUnits: 2, quantity: 2 })).toEqual({ ok: true, reason: 'ok' });
  });
});

describe('unitsFor', () => {
  it('is null while there is no availability map', () => {
    expect(unitsFor(undefined, 'a')).toBeNull();
  });

  it('treats an item missing from the map as none free', () => {
    expect(unitsFor({ b: 4 }, 'a')).toBe(0);
    expect(unitsFor({ a: 4 }, 'a')).toBe(4);
  });
});

describe('gateMessage', () => {
  it('has no message for an accepted add', () => {
    expect(gateMessage({ ok: true, reason: 'ok' }, 'Chair')).toBeNull();
  });

  it('names the item and the remaining count', () => {
    expect(gateMessage({ ok: false, reason: 'insufficient', remaining: 1 }, 'Chair'))
      .toBe('Only 1 more Chair available for your dates.');
    expect(gateMessage({ ok: false, reason: 'unavailable' }, 'Chair')).toBe('Chair is not available for your dates.');
    expect(gateMessage({ ok: false, reason: 'needs-dates' }, 'Chair')).toMatch(/dates first/);
  });
});
