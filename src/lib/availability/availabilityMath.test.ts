// src/lib/availability/availabilityMath.test.ts
import { describe, expect, it } from 'vitest';
import { computeAvailableUnits, consumesInventory, type CommittingBooking } from './availabilityMath';

const NOW = new Date('2026-06-10T12:00:00.000Z');
const b = (over: Partial<CommittingBooking>): CommittingBooking => ({
  id: 'x', status: 'confirmed', start_date: '2026-06-12', end_date: '2026-06-15',
  hold_expires_at: null, quantity: 1, ...over,
});

describe('consumesInventory', () => {
  it('counts active committed statuses', () => {
    const pending = new Set(['pending', 'pending_admin_review']);
    for (const s of ['pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit', 'delivered']) {
      const booking = pending.has(s)
        ? { status: s, hold_expires_at: '2026-06-11T00:00:00.000Z' } // future relative to NOW
        : { status: s };
      expect(consumesInventory(booking, NOW)).toBe(true);
    }
  });
  it('ignores released statuses', () => {
    // 'expired' is part of spec §5/§8 — the math handles it before the DB/type union does.
    for (const s of ['completed', 'cancelled', 'rejected', 'undeliverable', 'expired']) {
      expect(consumesInventory({ status: s }, NOW)).toBe(false);
    }
  });
  it('counts a live hold but not an expired one', () => {
    expect(consumesInventory({ status: 'pending_admin_review', hold_expires_at: '2026-06-11T00:00:00.000Z' }, NOW)).toBe(true);
    expect(consumesInventory({ status: 'pending_admin_review', hold_expires_at: '2026-06-10T00:00:00.000Z' }, NOW)).toBe(false);
  });
});

describe('computeAvailableUnits', () => {
  const base = { stock: 3, bufferDays: 0, reqStart: '2026-06-12', reqEnd: '2026-06-15', now: NOW };

  it('returns full stock when nothing is committed', () => {
    expect(computeAvailableUnits({ ...base, committed: [] })).toBe(3);
  });
  it('subtracts overlapping committed quantity', () => {
    expect(computeAvailableUnits({ ...base, committed: [b({ quantity: 2 })] })).toBe(1);
  });
  it('ignores non-overlapping bookings', () => {
    expect(computeAvailableUnits({ ...base, committed: [b({ start_date: '2026-07-01', end_date: '2026-07-05', quantity: 2 })] })).toBe(3);
  });
  it('uses the peak day, not the sum across the window', () => {
    const committed = [
      b({ start_date: '2026-06-12', end_date: '2026-06-13', quantity: 2 }),
      b({ start_date: '2026-06-14', end_date: '2026-06-15', quantity: 2 }),
    ];
    expect(computeAvailableUnits({ ...base, committed })).toBe(1); // peak is 2 on any single day
  });
  it('extends occupancy by the turnaround buffer', () => {
    const committed = [b({ start_date: '2026-06-09', end_date: '2026-06-11', quantity: 3 })]; // ends day before reqStart
    expect(computeAvailableUnits({ ...base, bufferDays: 1, committed })).toBe(0); // buffer day (06-12) collides
    expect(computeAvailableUnits({ ...base, bufferDays: 0, committed })).toBe(3);
  });
  it('excludes the booking being edited', () => {
    expect(computeAvailableUnits({ ...base, committed: [b({ id: 'self', quantity: 3 })], excludeBookingId: 'self' })).toBe(3);
  });
  it('never returns below zero', () => {
    expect(computeAvailableUnits({ ...base, committed: [b({ quantity: 10 })] })).toBe(0);
  });
});
