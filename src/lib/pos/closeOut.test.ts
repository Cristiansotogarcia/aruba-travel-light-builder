import { describe, it, expect } from 'vitest';
import { computeExpectedCash, computeVariance, canCloseDrawer } from './closeOut';

describe('computeExpectedCash (mirrors pos_close_drawer / pos_drawer_cash_so_far SQL)', () => {
  it('adds the opening float and cash sales', () => {
    expect(computeExpectedCash(100, 40)).toBe(140);
  });

  it('is just the float when there are no cash sales yet', () => {
    expect(computeExpectedCash(100, 0)).toBe(100);
  });

  it('rounds to cents', () => {
    expect(computeExpectedCash(100.004, 40.003)).toBe(140.01);
  });
});

describe('computeVariance (mirrors pos_close_drawer SQL)', () => {
  it('is 0 when counted matches expected exactly', () => {
    expect(computeVariance(140, 140)).toBe(0);
  });

  it('is positive when counted exceeds expected', () => {
    expect(computeVariance(150, 140)).toBe(10);
  });

  it('is negative when counted is short of expected', () => {
    expect(computeVariance(130, 140)).toBe(-10);
  });

  it('rounds to cents', () => {
    expect(computeVariance(140.006, 140)).toBe(0.01);
  });
});

describe('canCloseDrawer', () => {
  it('is false for a non-finite counted amount', () => {
    expect(canCloseDrawer({ counted: NaN, variance: 0, note: '' })).toBe(false);
  });

  it('is false for a negative counted amount', () => {
    expect(canCloseDrawer({ counted: -5, variance: -145, note: 'short' })).toBe(false);
  });

  it('is true with zero variance and no note', () => {
    expect(canCloseDrawer({ counted: 140, variance: 0, note: '' })).toBe(true);
  });

  it('is false with a non-zero variance and an empty note', () => {
    expect(canCloseDrawer({ counted: 150, variance: 10, note: '' })).toBe(false);
  });

  it('is false with a non-zero variance and a whitespace-only note', () => {
    expect(canCloseDrawer({ counted: 150, variance: 10, note: '   ' })).toBe(false);
  });

  it('is true with a non-zero variance once a note is given', () => {
    expect(canCloseDrawer({ counted: 150, variance: 10, note: 'counted twice, over by 10' })).toBe(true);
  });

  it('flips back to false the instant a valid note is cleared on a non-zero variance', () => {
    const base = { counted: 150, variance: 10 };
    expect(canCloseDrawer({ ...base, note: 'over by 10' })).toBe(true);
    expect(canCloseDrawer({ ...base, note: '' })).toBe(false);
  });
});
