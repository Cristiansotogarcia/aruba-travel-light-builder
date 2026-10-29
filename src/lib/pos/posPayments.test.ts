import { describe, it, expect } from 'vitest';
import {
  changeDue,
  validatePaymentLine,
  validatePaymentSet,
  isPayNowEnabled,
  isPayLaterEnabled,
  type PosPaymentLine,
} from './posPayments';

describe('changeDue (mirrors pos_create_sale SQL)', () => {
  it('is 0 when tendered is not provided', () => {
    expect(changeDue(40, undefined)).toBe(0);
    expect(changeDue(40, null)).toBe(0);
  });

  it('is tendered - amount when tendered exceeds amount', () => {
    expect(changeDue(40, 50)).toBe(10);
  });

  it('is 0 when tendered exactly equals amount', () => {
    expect(changeDue(40, 40)).toBe(0);
  });

  it('never goes negative (defensive; validatePaymentLine should reject this first)', () => {
    expect(changeDue(40, 30)).toBe(0);
  });

  it('rounds to cents', () => {
    expect(changeDue(33.333, 40)).toBe(6.67);
  });
});

describe('validatePaymentLine', () => {
  it('rejects a zero or negative amount', () => {
    expect(validatePaymentLine({ method: 'cash', amount: 0 })).toMatch(/greater than zero/);
    expect(validatePaymentLine({ method: 'cash', amount: -5 })).toMatch(/greater than zero/);
  });

  it('rejects a non-finite amount', () => {
    expect(validatePaymentLine({ method: 'cash', amount: NaN })).toMatch(/greater than zero/);
  });

  it('requires a reference for card', () => {
    expect(validatePaymentLine({ method: 'card', amount: 10 })).toMatch(/reference/);
    expect(validatePaymentLine({ method: 'card', amount: 10, reference: '   ' })).toMatch(/reference/);
  });

  it('accepts card with a reference', () => {
    expect(validatePaymentLine({ method: 'card', amount: 10, reference: 'TERM-0012' })).toBeNull();
  });

  it('accepts other with no reference', () => {
    expect(validatePaymentLine({ method: 'other', amount: 10 })).toBeNull();
  });

  it('rejects tendered on a non-cash method', () => {
    expect(validatePaymentLine({ method: 'card', amount: 10, reference: 'x', tendered: 20 })).toMatch(
      /cash/,
    );
    expect(validatePaymentLine({ method: 'other', amount: 10, tendered: 20 })).toMatch(/cash/);
  });

  it('rejects tendered below the applied amount', () => {
    expect(validatePaymentLine({ method: 'cash', amount: 40, tendered: 30 })).toMatch(
      /at least the amount/,
    );
  });

  it('accepts cash with tendered >= amount', () => {
    expect(validatePaymentLine({ method: 'cash', amount: 40, tendered: 50 })).toBeNull();
    expect(validatePaymentLine({ method: 'cash', amount: 40, tendered: 40 })).toBeNull();
  });

  it('accepts cash with no tendered at all', () => {
    expect(validatePaymentLine({ method: 'cash', amount: 40 })).toBeNull();
  });
});

describe('validatePaymentSet', () => {
  it('is valid for a single clean cash line matching the total', () => {
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 50 }];
    const result = validatePaymentSet(lines, 40);
    expect(result.valid).toBe(true);
    expect(result.totalApplied).toBe(40);
    expect(result.remaining).toBe(0);
    expect(result.overpaid).toBe(false);
  });

  it('allows a split payment (cash + card) summing to the total', () => {
    const lines: PosPaymentLine[] = [
      { method: 'cash', amount: 15, tendered: 15 },
      { method: 'card', amount: 25, reference: 'TERM-1' },
    ];
    const result = validatePaymentSet(lines, 40);
    expect(result.valid).toBe(true);
    expect(result.totalApplied).toBe(40);
    expect(result.remaining).toBe(0);
  });

  it('allows a partial payment under the total (deposit)', () => {
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 10, tendered: 10 }];
    const result = validatePaymentSet(lines, 40);
    expect(result.valid).toBe(true);
    expect(result.remaining).toBe(30);
  });

  it('flags overpay when applied amounts exceed the total', () => {
    const lines: PosPaymentLine[] = [{ method: 'other', amount: 50 }];
    const result = validatePaymentSet(lines, 40);
    expect(result.valid).toBe(false);
    expect(result.overpaid).toBe(true);
  });

  it('does NOT count cash change as part of the applied sum (change given back on an overpay cash tender)', () => {
    // Customer hands $50 for a $40 total: amount applied is 40, tendered 50,
    // change 10 — the set must still read as exactly-paid, not overpaid.
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 50 }];
    const result = validatePaymentSet(lines, 40);
    expect(result.valid).toBe(true);
    expect(result.overpaid).toBe(false);
    expect(result.totalApplied).toBe(40);
  });

  it('collects one error per invalid line, by index', () => {
    const lines: PosPaymentLine[] = [
      { method: 'card', amount: 10 }, // missing reference
      { method: 'cash', amount: 10, tendered: 5 }, // tendered < amount
    ];
    const result = validatePaymentSet(lines, 40);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.index)).toEqual([0, 1]);
  });
});

describe('isPayNowEnabled', () => {
  it('is false with no payment lines', () => {
    expect(isPayNowEnabled([], 40)) .toBe(false);
  });

  it('is false with a non-positive total', () => {
    expect(isPayNowEnabled([{ method: 'cash', amount: 10 }], 0)).toBe(false);
  });

  it('is false while any line is invalid', () => {
    const lines: PosPaymentLine[] = [{ method: 'card', amount: 10 }];
    expect(isPayNowEnabled(lines, 40)).toBe(false);
  });

  it('is false while the set is overpaid', () => {
    const lines: PosPaymentLine[] = [{ method: 'other', amount: 999 }];
    expect(isPayNowEnabled(lines, 40)).toBe(false);
  });

  it('is true once the set is clean, even as a partial deposit', () => {
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 10, tendered: 10 }];
    expect(isPayNowEnabled(lines, 40)).toBe(true);
  });

  it('is true for a clean split payment covering the full total', () => {
    const lines: PosPaymentLine[] = [
      { method: 'cash', amount: 20, tendered: 20 },
      { method: 'card', amount: 20, reference: 'TERM-2' },
    ];
    expect(isPayNowEnabled(lines, 40)).toBe(true);
  });

  it('flips back to false the instant a clean line is edited into an invalid one', () => {
    const total = 40;
    const clean: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 40 }];
    expect(isPayNowEnabled(clean, total)).toBe(true);

    const edited: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 30 }];
    expect(isPayNowEnabled(edited, total)).toBe(false);
  });
});

describe('isPayLaterEnabled', () => {
  it('is always true — it is a distinct zero-payment action', () => {
    expect(isPayLaterEnabled()).toBe(true);
  });
});
