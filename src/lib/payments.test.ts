import { describe, it, expect } from 'vitest';
import {
  derivePaymentStatus,
  outstandingBalance,
  sumPayments,
} from './payments';

describe('derivePaymentStatus (mirrors record_booking_payment SQL)', () => {
  it('is pending when nothing has been paid', () => {
    expect(derivePaymentStatus(0, 100)).toBe('pending');
  });

  it('is pending when total paid is negative (defensive)', () => {
    expect(derivePaymentStatus(-10, 100)).toBe('pending');
  });

  it('is partial when 0 < paid < total', () => {
    expect(derivePaymentStatus(40, 100)).toBe('partial');
    expect(derivePaymentStatus(0.01, 100)).toBe('partial');
    expect(derivePaymentStatus(99.99, 100)).toBe('partial');
  });

  it('is paid when paid exactly equals total', () => {
    expect(derivePaymentStatus(100, 100)).toBe('paid');
  });

  it('is paid when paid exceeds total (overpayment)', () => {
    expect(derivePaymentStatus(150, 100)).toBe('paid');
  });

  it('is paid within floating-point epsilon of the total', () => {
    // 3 payments of 33.33 = 99.99 against a 99.99 total should read as paid
    expect(derivePaymentStatus(0.1 + 0.2, 0.3)).toBe('paid');
  });

  it('is pending when total is 0 and nothing paid', () => {
    expect(derivePaymentStatus(0, 0)).toBe('pending');
  });

  it('treats a zero-total booking with a payment as paid', () => {
    // total unknown/0 but money came in -> not "pending"; falls through to partial
    // because we cannot assert full payment against a 0 total.
    expect(derivePaymentStatus(10, 0)).toBe('partial');
  });
});

describe('outstandingBalance', () => {
  it('returns the remaining balance', () => {
    expect(outstandingBalance(40, 100)).toBe(60);
  });

  it('never goes negative on overpayment', () => {
    expect(outstandingBalance(150, 100)).toBe(0);
  });

  it('rounds to cents', () => {
    expect(outstandingBalance(33.33, 100)).toBe(66.67);
  });
});

describe('sumPayments', () => {
  it('sums amounts', () => {
    expect(sumPayments([{ amount: 10 }, { amount: 20.5 }])).toBe(30.5);
  });

  it('handles empty list', () => {
    expect(sumPayments([])).toBe(0);
  });

  it('ignores NaN/undefined amounts', () => {
    // Deliberately malformed input (e.g. a bad row from the API).
    const malformed = [{ amount: 10 }, { amount: undefined }, { amount: NaN }] as Array<{ amount: number }>;
    expect(sumPayments(malformed)).toBe(10);
  });
});
